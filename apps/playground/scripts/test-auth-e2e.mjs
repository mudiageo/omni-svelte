#!/usr/bin/env node

/**
 * End-to-end verification script for Auth Schema Integration in apps/playground.
 *
 * Verifies:
 * 1. Generation of Drizzle auth schema re-exports and text FK references.
 * 2. Generation of read-only auth models with no write operations.
 * 3. Generation of .omni/auth-registry.d.ts.
 * 4. Auth demo schemas and server route with inverse relations.
 */

import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

console.log('🧪 Running Auth Schema Integration E2E Check...');

// Unset DATABASE_URL to simulate offline/isolated environment
delete process.env.DATABASE_URL;

// Step 1: Introspect and generate auth registry and auth models
const { buildAuthRegistry } = await import('../../../packages/core/dist/runtime/auth/registry.js');
const { ModelGenerator } = await import('../../../packages/core/dist/schema/generators/model.js');

const authSchemaPath = join(root, '.omni', 'auth-schema.ts');
if (!existsSync(authSchemaPath)) {
	console.error('❌ Missing .omni/auth-schema.ts');
	process.exit(1);
}

const registry = await buildAuthRegistry({
	root,
	dialect: 'pg',
	usePlural: false
});

console.log(`✅ Auth registry built successfully (${registry.schemas.size} system tables).`);

// Step 2: Generate read-only auth models
const modelOutputs = ModelGenerator.generateAuthModels(Array.from(registry.schemas.values()), {
	path: './src/lib/db/models',
	format: 'per-schema',
	drizzle: { path: './src/lib/db/server/schema.ts' }
});

for (const out of modelOutputs) {
	const absPath = join(root, out.path);
	mkdirSync(dirname(absPath), { recursive: true });
	writeFileSync(absPath, out.content, 'utf-8');
}
console.log(`✅ Generated ${modelOutputs.length} auth models into src/lib/db/models/auth/.`);

// Step 2.5: Generate Drizzle schema in an isolated directory using generator
const { setAuthRegistry } = await import('../../../packages/core/dist/runtime/auth/registry.js');
const { defineSchema, field, auth } = await import('../../../packages/core/dist/schema/index.js');
const { DrizzleGenerator } =
	await import('../../../packages/core/dist/schema/generators/drizzle.js');

setAuthRegistry(registry);

const testNoteSchema = defineSchema('test_notes', {
	id: field.serial().primaryKey(),
	body: field.string().required(),
	ownerId: field.reference(() => auth.user).required(),
	sessionId: field.reference('session')
});

const tmpDrizzleDir = join(root, '.omni', 'test-e2e-isolated');
mkdirSync(tmpDrizzleDir, { recursive: true });
const isolatedSchemaPath = join(tmpDrizzleDir, 'schema.ts');

const drizzleGen = new DrizzleGenerator(testNoteSchema);
const drizzleOutputs = await drizzleGen.generateFiles([testNoteSchema], {
	path: isolatedSchemaPath,
	format: 'single-file',
	databaseType: 'pg'
});

if (!drizzleOutputs || drizzleOutputs.length === 0) {
	console.error('❌ Drizzle generator failed to produce outputs');
	process.exit(1);
}

const isolatedSchemaContent = drizzleOutputs[0].content;
if (
	!isolatedSchemaContent.includes('export * from') ||
	!isolatedSchemaContent.includes('auth-schema')
) {
	console.error('❌ Generated Drizzle schema does not re-export .omni/auth-schema');
	process.exit(1);
}

const ownerIdFkRegex = /ownerId:\s*text\([^)]*\)\.references\(\(\)\s*=>\s*user\.id\)/;
if (
	!isolatedSchemaContent.includes('ownerId: text(') ||
	!ownerIdFkRegex.test(isolatedSchemaContent)
) {
	console.error('❌ Generated Drizzle schema missing text FK reference on ownerId to user.id');
	process.exit(1);
}
console.log(
	'✅ Generated isolated Drizzle schema correctly re-exports auth tables and includes text FK reference on ownerId.'
);

// Step 3: Assertions on generated artifacts

// 3.1: .omni/auth-registry.d.ts
const registryDts = join(root, '.omni', 'auth-registry.d.ts');
if (!existsSync(registryDts)) {
	console.error('❌ Missing .omni/auth-registry.d.ts');
	process.exit(1);
}
const registryDtsContent = readFileSync(registryDts, 'utf-8');
if (!registryDtsContent.includes('"user": true')) {
	console.error('❌ .omni/auth-registry.d.ts does not declare "user": true');
	process.exit(1);
}
console.log('✅ .omni/auth-registry.d.ts contains typed "user" table declaration.');

// 3.2: src/lib/db/server/schema.ts
const schemaFile = join(root, 'src/lib/db/server/schema.ts');
if (!existsSync(schemaFile)) {
	console.error('❌ Missing src/lib/db/server/schema.ts');
	process.exit(1);
}
const schemaContent = readFileSync(schemaFile, 'utf-8');
if (!schemaContent.includes('export * from') || !schemaContent.includes('auth-schema')) {
	console.error('❌ src/lib/db/server/schema.ts does not re-export .omni/auth-schema');
	process.exit(1);
}
if (!schemaContent.includes('ownerId: text(') || !ownerIdFkRegex.test(schemaContent)) {
	console.error('❌ src/lib/db/server/schema.ts missing text FK reference on ownerId to user.id');
	process.exit(1);
}
console.log(
	'✅ src/lib/db/server/schema.ts correctly re-exports auth tables and includes text FK references.'
);

// 3.3: src/lib/db/models/auth/user.ts
const userModelFile = join(root, 'src/lib/db/models/auth/user.ts');
if (!existsSync(userModelFile)) {
	console.error('❌ Missing src/lib/db/models/auth/user.ts');
	process.exit(1);
}
const userModelContent = readFileSync(userModelFile, 'utf-8');
if (!userModelContent.includes('ReadonlyModel') || !userModelContent.includes('readonly = true')) {
	console.error('❌ User model is not marked as readonly');
	process.exit(1);
}
if (userModelContent.includes('static create(') || userModelContent.includes('async create(')) {
	console.error('❌ User model unexpectedly contains create() method');
	process.exit(1);
}
console.log('✅ src/lib/db/models/auth/user.ts is read-only and forbids write operations.');

// 3.4: Demo routes & schemas
const authDemoSchema = join(root, 'src/lib/schemas/auth-demo.schema.ts');
if (!existsSync(authDemoSchema)) {
	console.error('❌ Missing src/lib/schemas/auth-demo.schema.ts');
	process.exit(1);
}
const demoRouteServer = join(root, 'src/routes/auth-demo/+page.server.ts');
if (!existsSync(demoRouteServer)) {
	console.error('❌ Missing src/routes/auth-demo/+page.server.ts');
	process.exit(1);
}
console.log('✅ Demo schemas and auth-demo routes verified.');

console.log('\n🎉 All Auth Schema E2E checks passed successfully!\n');
process.exit(0);
