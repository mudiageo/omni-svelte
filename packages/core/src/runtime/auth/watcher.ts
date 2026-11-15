import { resolve, join } from 'node:path';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import type { Schema } from '../../schema/types.js';
import { isSystemRef } from '../../schema/auth-reference.js';
import { mapAdditionalFields } from './additional-fields.js';

/**
 * Returns list of file paths to watch for Better Auth configuration and schema changes.
 */
export function authInputs(root: string, customConfigFile?: string): string[] {
	const candidates = [
		join(root, '.omni', 'auth-schema.ts'),
		customConfigFile ? resolve(root, customConfigFile) : null,
		resolve(root, 'omni.config.ts'),
		resolve(root, 'omni.config.js'),
		resolve(root, 'svelte.config.js')
	].filter((f): f is string => Boolean(f && existsSync(f)));

	return Array.from(new Set(candidates));
}

/**
 * Computes a SHA-256 hash across the watched auth files, enabled Better Auth plugins,
 * and user.additionalFields configuration.
 */
export async function computeAuthInputsHash(
	root: string,
	authConfig: any = {},
	customFiles?: string[]
): Promise<string> {
	const filesToRead = customFiles || authInputs(root);
	const fileContents = await Promise.all(
		filesToRead.map((p) => readFile(p, 'utf8').catch(() => ''))
	);

	const enabledPluginNames = Object.entries(authConfig?.plugins || {})
		.filter(([_, enabled]) => Boolean(enabled))
		.map(([pluginName]) => pluginName)
		.sort();

	let mappedFields = {};
	try {
		mappedFields = mapAdditionalFields(authConfig?.user?.additionalFields || {});
	} catch {
		mappedFields = authConfig?.user?.additionalFields || {};
	}

	const configPayload = JSON.stringify({
		plugins: enabledPluginNames,
		additionalFields: mappedFields,
		usePlural: Boolean(authConfig?.usePlural || authConfig?.advanced?.usePlural)
	});

	return createHash('sha256')
		.update(fileContents.join('\0') + '\0' + configPayload)
		.digest('hex');
}

/**
 * Pure decision function: determines if auth regeneration should run based on hashes.
 */
export function shouldRegenerateAuth(
	lastHash: string | null | undefined,
	currentHash: string
): boolean {
	if (!lastHash) return true;
	return lastHash !== currentHash;
}

/**
 * Identifies application schemas that declare references or relations to system auth tables.
 * Used to selectively re-run code generation for dependent schemas when auth schemas change.
 */
export function findSchemasReferencingAuth(schemas: Schema[]): Schema[] {
	if (!Array.isArray(schemas)) return [];

	const userSchemaNames = new Set(
		schemas.flatMap((s) => [s.name, (s as any).tableName].filter(Boolean) as string[])
	);

	const isAuthTarget = (target: any): boolean => {
		if (!target) return false;
		if (isSystemRef(target) || target?.kind === 'system') return true;
		if (typeof target === 'string') {
			if (!userSchemaNames.has(target)) return true;
		}
		if (typeof target === 'function') {
			try {
				const resolved = target();
				if (isSystemRef(resolved) || resolved?.kind === 'system') return true;
			} catch {}
		}
		if (typeof target?.resolve === 'function') {
			try {
				const resolved = target.resolve();
				if (isSystemRef(resolved) || resolved?.kind === 'system') return true;
			} catch {}
		}
		return false;
	};

	return schemas.filter((schema) => {
		// 1. Check field references
		if (schema.fields) {
			for (const field of Object.values(schema.fields)) {
				if (!field) continue;
				const target = (field as any).target ?? (field as any).def?.target;
				if (isAuthTarget(target)) return true;
			}
		}

		// 2. Check relations
		if (schema.relations) {
			for (const rel of Object.values(schema.relations)) {
				if (!rel) continue;
				const relTarget = (rel as any).target;
				if (isAuthTarget(relTarget)) return true;
			}
		}

		return false;
	});
}
