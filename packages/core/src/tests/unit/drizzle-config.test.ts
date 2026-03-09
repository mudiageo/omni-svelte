import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import {
	resolveSchemaGlob,
	resolveMigrationsOut,
	resolveDialect,
	buildDrizzleConfigContent,
	generateDrizzleConfig,
	MARKER
} from '$pkg/vite/drizzle-config.js';
import type { SchemaConfig } from '$pkg/schema/types.js';
import type { OmniConfig } from '$pkg/types.js';
import { readFileSync } from 'fs';

// ── Helpers ───────────────────────────────────────────────────────────────────

const ROOT = join(process.cwd(), 'tmp-drizzle-config-test');

function makeSchemaConfig(overrides: Partial<SchemaConfig> = {}): SchemaConfig {
	return {
		mode: 'files',
		input: { patterns: ['src/**/*.schema.ts'] },
		output: {
			drizzle: { path: './src/lib/db/server/schema.ts', format: 'single-file' }
		},
		dev: { logLevel: 'silent' },
		...overrides
	} as SchemaConfig;
}

function makeOmniConfig(): OmniConfig {
	return {} as OmniConfig;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('resolveSchemaGlob', () => {
	it('single-file format → returns bare relative path', () => {
		const config = makeSchemaConfig();
		const glob = resolveSchemaGlob('/project', config.output!.drizzle);
		expect(glob).toBe('./src/lib/db/server/schema.ts');
	});

	it('per-schema format → returns directory glob', () => {
		const config = makeSchemaConfig({
			output: {
				drizzle: { path: './src/lib/db/server', format: 'per-schema' }
			}
		});
		const glob = resolveSchemaGlob('/project', config.output!.drizzle);
		expect(glob).toBe('./src/lib/db/server/**/*.ts');
	});

	it('per-schema path with trailing slash → still produces correct glob', () => {
		const config = makeSchemaConfig({
			output: {
				drizzle: { path: './src/lib/db/server/', format: 'per-schema' }
			}
		});
		const glob = resolveSchemaGlob('/project', config.output!.drizzle);
		expect(glob).toMatch(/\*\*\/\*\.ts$/);
	});

	it('undefined output → returns default path', () => {
		const glob = resolveSchemaGlob('/project', undefined);
		expect(glob).toBe('./src/lib/db/server/schema.ts');
	});
});

describe('resolveMigrationsOut', () => {
	it('defaults to ./drizzle when not configured', () => {
		const config = makeSchemaConfig();
		expect(resolveMigrationsOut(config)).toBe('./drizzle');
	});

	it('uses drizzleConfig.out when specified', () => {
		const config = makeSchemaConfig({
			output: {
				drizzle: {
					path: './src/lib/db/server/schema.ts',
					format: 'single-file'
				},
				drizzleConfig: { out: './migrations' }
			} as any
		});
		expect(resolveMigrationsOut(config)).toBe('./migrations');
	});
});

describe('resolveDialect', () => {
	it('defaults to postgresql', () => {
		expect(resolveDialect(makeSchemaConfig())).toBe('postgresql');
	});

	it('uses generation.drizzle.dialect when specified', () => {
		const config = makeSchemaConfig({
			generation: { drizzle: { dialect: 'mysql2' } } as any
		});
		expect(resolveDialect(config)).toBe('mysql2');
	});
});

describe('buildDrizzleConfigContent', () => {
	it('includes the auto-generated marker', () => {
		const content = buildDrizzleConfigContent('./schema.ts', './drizzle', 'postgresql');
		expect(content).toContain(MARKER);
	});

	it('includes the schema glob path', () => {
		const content = buildDrizzleConfigContent(
			'./src/lib/db/server/**/*.ts',
			'./drizzle',
			'postgresql'
		);
		expect(content).toContain("schema: './src/lib/db/server/**/*.ts'");
	});

	it('includes the dialect', () => {
		const content = buildDrizzleConfigContent('./schema.ts', './drizzle', 'mysql2');
		expect(content).toContain("dialect: 'mysql2'");
	});

	it('includes the migrations out directory', () => {
		const content = buildDrizzleConfigContent('./schema.ts', './migrations', 'postgresql');
		expect(content).toContain("out: './migrations'");
	});

	it('includes DATABASE_URL guard', () => {
		const content = buildDrizzleConfigContent('./schema.ts', './drizzle', 'postgresql');
		expect(content).toContain('DATABASE_URL');
	});

	it('includes drizzle-kit defineConfig import', () => {
		const content = buildDrizzleConfigContent('./schema.ts', './drizzle', 'postgresql');
		expect(content).toContain("from 'drizzle-kit'");
	});
});

describe('generateDrizzleConfig', () => {
	beforeEach(() => {
		mkdirSync(ROOT, { recursive: true });
	});

	afterEach(() => {
		rmSync(ROOT, { recursive: true, force: true });
	});

	it('creates drizzle.config.ts when it does not exist', async () => {
		const configPath = join(ROOT, 'drizzle.config.ts');
		expect(existsSync(configPath)).toBe(false);

		await generateDrizzleConfig(ROOT, makeSchemaConfig(), makeOmniConfig());

		expect(existsSync(configPath)).toBe(true);
		const content = readFileSync(configPath, 'utf-8');
		expect(content).toContain(MARKER);
		expect(content).toContain('./src/lib/db/server/schema.ts');
	});

	it('updates the file when schema path changes', async () => {
		const configPath = join(ROOT, 'drizzle.config.ts');

		// First generate
		await generateDrizzleConfig(ROOT, makeSchemaConfig(), makeOmniConfig());

		// Now regenerate with a different path
		const updatedConfig = makeSchemaConfig({
			output: {
				drizzle: { path: './src/lib/db/schema.ts', format: 'single-file' }
			}
		});
		await generateDrizzleConfig(ROOT, updatedConfig, makeOmniConfig());

		const content = readFileSync(configPath, 'utf-8');
		expect(content).toContain('./src/lib/db/schema.ts');
	});

	it('skips write if content has not changed (idempotent)', async () => {
		const configPath = join(ROOT, 'drizzle.config.ts');
		await generateDrizzleConfig(ROOT, makeSchemaConfig(), makeOmniConfig());
		const mtime1 = (await import('fs')).statSync(configPath).mtimeMs;

		// Wait a tiny bit so mtime would differ if written
		await new Promise((r) => setTimeout(r, 50));
		await generateDrizzleConfig(ROOT, makeSchemaConfig(), makeOmniConfig());
		const mtime2 = (await import('fs')).statSync(configPath).mtimeMs;

		expect(mtime1).toBe(mtime2);
	});

	it('does NOT overwrite a user-managed config (no marker)', async () => {
		const configPath = join(ROOT, 'drizzle.config.ts');
		const userContent = `// My custom drizzle config\nexport default {};`;
		writeFileSync(configPath, userContent, 'utf-8');

		await generateDrizzleConfig(ROOT, makeSchemaConfig(), makeOmniConfig());

		// Should be unchanged
		expect(readFileSync(configPath, 'utf-8')).toBe(userContent);
	});

	it('uses glob for per-schema format', async () => {
		const configPath = join(ROOT, 'drizzle.config.ts');
		const config = makeSchemaConfig({
			output: {
				drizzle: { path: './src/lib/db/server', format: 'per-schema' }
			}
		});

		await generateDrizzleConfig(ROOT, config, makeOmniConfig());

		const content = readFileSync(configPath, 'utf-8');
		expect(content).toContain('**/*.ts');
	});
});
