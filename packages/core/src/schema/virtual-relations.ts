import { AuthDiagnostic } from '../runtime/auth/diagnostics.js';
import type { AuthRegistry } from '../runtime/auth/registry.js';
import { isSystemRef } from './auth-reference.js';
import type { Schema } from './types.js';

export interface VirtualRelation {
	onSystemKey: string; // e.g. 'user'
	name: string; // e.g. 'posts'
	kind: 'hasMany' | 'hasOne' | 'manyToMany';
	targetTable: string; // e.g. 'posts'
	foreignKey: { column: string; property: string };
	declaredBy: string; // e.g. 'posts.author' (for diagnostics)
	targetModel?: string; // e.g. 'Post' or schema name
	ownerKey?: string; // e.g. 'id' (localKey on the auth model)
	pivotTable?: string; // pivot table for manyToMany
	foreignPivotKey?: string; // pivot column pointing to auth table
	relatedPivotKey?: string; // pivot column pointing to targetTable
	through?: string; // pivot table for manyToMany (legacy/alias for pivotTable)
}

export class VirtualRelationRegistry {
	private byKey = new Map<string, Map<string, VirtualRelation>>();

	add(
		rel: VirtualRelation,
		reserved: { columnProps: Set<string>; existingRelations?: Map<string, string> }
	) {
		if (reserved.columnProps.has(rel.name)) {
			throw new AuthDiagnostic(
				'AUTH005',
				`Inverse "${rel.name}" on ${rel.onSystemKey} collides with a column of the same name (declared by ${rel.declaredBy}).`
			);
		}
		const prior = reserved.existingRelations?.get(rel.name);
		const same = this.byKey.get(rel.onSystemKey)?.get(rel.name);
		if ((prior && prior !== rel.declaredBy) || (same && same.declaredBy !== rel.declaredBy)) {
			throw new AuthDiagnostic(
				'AUTH005',
				`Inverse "${rel.name}" on ${rel.onSystemKey} is already defined by ${prior ?? same!.declaredBy}; second declaration: ${rel.declaredBy}.`,
				'Rename one of the inverse names.'
			);
		}
		if (!this.byKey.has(rel.onSystemKey)) {
			this.byKey.set(rel.onSystemKey, new Map());
		}
		this.byKey.get(rel.onSystemKey)!.set(rel.name, rel);
	}

	for(key: string): VirtualRelation[] {
		return [...(this.byKey.get(key)?.values() ?? [])];
	}

	has(key: string, name?: string): boolean {
		if (!name) return this.byKey.has(key);
		return Boolean(this.byKey.get(key)?.has(name));
	}

	removeForSchema(schemaName: string): void {
		const prefix = `${schemaName}.`;
		for (const [systemKey, relMap] of this.byKey.entries()) {
			for (const [relName, rel] of relMap.entries()) {
				if (rel.declaredBy.startsWith(prefix) || rel.targetTable === schemaName) {
					relMap.delete(relName);
				}
			}
			if (relMap.size === 0) {
				this.byKey.delete(systemKey);
			}
		}
	}

	clear(): void {
		this.byKey.clear();
	}

	getAll(): Map<string, Map<string, VirtualRelation>> {
		return this.byKey;
	}
}

let defaultVirtualRelationRegistry = new VirtualRelationRegistry();

export function getVirtualRelationRegistry(): VirtualRelationRegistry {
	return defaultVirtualRelationRegistry;
}

export function setVirtualRelationRegistry(registry: VirtualRelationRegistry): void {
	defaultVirtualRelationRegistry = registry;
}

export function resetVirtualRelationRegistry(): void {
	defaultVirtualRelationRegistry = new VirtualRelationRegistry();
}

/**
 * Collects inverse relations defined on application schemas that target system auth tables.
 * Validates against column collisions and duplicate inverse names using VirtualRelationRegistry.
 */
export function collectVirtualRelations(
	schemas: (Schema | any)[],
	options?: {
		authRegistry?: AuthRegistry | null;
		virtualRegistry?: VirtualRelationRegistry;
	}
): VirtualRelationRegistry {
	const registry = options?.virtualRegistry ?? getVirtualRelationRegistry();
	const authReg = options?.authRegistry;

	for (const schema of schemas) {
		if (!schema || !schema.relations) continue;

		for (const [relName, relDef] of Object.entries<any>(schema.relations)) {
			if (!relDef) continue;
			const isBelongsTo = relDef.kind === 'belongsTo';
			const isManyToMany = relDef.kind === 'manyToMany';

			if (!isBelongsTo && !isManyToMany) continue;
			if (!relDef.options?.inverse) continue;

			let target: any;
			try {
				target = typeof relDef.target === 'function' ? relDef.target() : relDef.target;
			} catch {
				continue;
			}

			if (!isSystemRef(target)) continue;

			const onSystemKey = target.key;
			const inverse = relDef.options.inverse;
			let name: string;
			let kind: 'hasMany' | 'hasOne' | 'manyToMany';

			if (isManyToMany) {
				name = typeof inverse === 'string' ? inverse : inverse.name;
				kind = 'manyToMany';
			} else if (typeof inverse === 'string') {
				name = inverse;
				kind = 'hasMany';
			} else if (typeof inverse === 'object' && inverse?.name) {
				name = inverse.name;
				kind = inverse.kind || 'hasMany';
			} else {
				continue;
			}

			const via = relDef.options?.via || `${relName}Id`;
			const fieldDef = schema.fields?.[via];
			const foreignKey = {
				column: fieldDef?.name ?? via,
				property: via
			};

			const sysSchema = authReg?.schemas?.get(onSystemKey);
			const columnProps = new Set<string>();
			if (sysSchema?.columns) {
				for (const col of sysSchema.columns) {
					columnProps.add(col.property);
					columnProps.add(col.name);
				}
			}

			const ownerKey = relDef.options?.localKey || 'id';
			const pivotTable =
				isManyToMany && relDef.options?.pivotTable
					? typeof relDef.options.pivotTable === 'function'
						? relDef.options.pivotTable()?.name
						: relDef.options.pivotTable
					: isManyToMany && relDef.options?.through
						? typeof relDef.options.through === 'function'
							? relDef.options.through()?.name
							: relDef.options.through
						: undefined;
			const foreignPivotKey = isManyToMany ? relDef.options?.foreignPivotKey : undefined;
			const relatedPivotKey = isManyToMany ? relDef.options?.relatedPivotKey : undefined;

			const declaredBy = `${schema.name}.${relName}`;
			registry.add(
				{
					onSystemKey,
					name,
					kind,
					targetTable: schema.name,
					foreignKey,
					declaredBy,
					targetModel: schema.name,
					ownerKey,
					pivotTable,
					foreignPivotKey,
					relatedPivotKey,
					through: pivotTable
				},
				{ columnProps }
			);
		}
	}

	return registry;
}
