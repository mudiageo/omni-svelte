import { mkdtemp, rm, readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { field, FieldBuilder } from '../../../schema/field.js';
import { auth } from '../../../schema/auth-reference.js';
import { relation } from '../../../schema/relation.js';
import {
	toBetterAuthField,
	mapAdditionalFields
} from '../../../runtime/auth/additional-fields.js';
import {
	computeAuthInputsHash,
	shouldRegenerateAuth,
	findSchemasReferencingAuth
} from '../../../runtime/auth/watcher.js';
import { AuthDiagnostic } from '../../../runtime/auth/diagnostics.js';
import { atomic_write, write_if_changed_atomic } from '../../../utils/filesystem.js';
import { buildAuthRegistry, resetAuthRegistryCache } from '../../../runtime/auth/registry.js';
import * as pgFixture from '../../fixtures/auth/auth-schema.pg.js';

describe('additionalFields mapping', () => {
	it('maps string-like fields to Better Auth string', () => {
		const stringField = toBetterAuthField('bio', field.string().required().default('hello'));
		expect(stringField).toEqual({
			type: 'string',
			required: true,
			defaultValue: 'hello'
		});

		expect(toBetterAuthField('notes', { type: 'text' }).type).toBe('string');
		expect(toBetterAuthField('contactEmail', field.email()).type).toBe('string');
		expect(toBetterAuthField('status', field.enum('active', 'inactive')).type).toBe('string');
		expect(toBetterAuthField('slug', field.slug()).type).toBe('string');
		expect(toBetterAuthField('content', field.richtext()).type).toBe('string');
		expect(toBetterAuthField('homepage', field.url()).type).toBe('string');
		expect(toBetterAuthField('secret', field.password()).type).toBe('string');
	});

	it('maps number-like fields to Better Auth number', () => {
		const intField = toBetterAuthField('age', field.integer().required().default(18));
		expect(intField).toEqual({
			type: 'number',
			required: true,
			defaultValue: 18
		});

		expect(toBetterAuthField('credits', field.serial()).type).toBe('number');
		expect(toBetterAuthField('balance', field.money()).type).toBe('number');
	});

	it('maps boolean fields to Better Auth boolean', () => {
		const boolField = toBetterAuthField('isVip', field.boolean().default(false));
		expect(boolField).toEqual({
			type: 'boolean',
			required: false,
			defaultValue: false
		});
	});

	it('maps date and timestamp fields to Better Auth date', () => {
		const dateField = toBetterAuthField('birthDate', field.date().required());
		expect(dateField).toEqual({
			type: 'date',
			required: true
		});

		const tsField = toBetterAuthField('lastActive', field.timestamp());
		expect(tsField).toEqual({
			type: 'date',
			required: false
		});
	});

	it('passes through raw Better Auth field objects directly', () => {
		const raw = {
			type: 'string' as const,
			required: true,
			defaultValue: 'admin',
			input: true
		};
		expect(toBetterAuthField('role', raw)).toEqual(raw);
	});

	it('throws AUTH008 for unsupported field types', () => {
		expect(() => toBetterAuthField('metadata', field.json())).toThrow(AuthDiagnostic);
		expect(() => toBetterAuthField('metadata', field.json())).toThrow(/AUTH008/);

		expect(() => toBetterAuthField('tags', field.array())).toThrow(/unsupported field type "array"/);
		expect(() => toBetterAuthField('docs', field.files())).toThrow(/unsupported field type "files"/);
	});

	it('throws AUTH008 for invalid field builder or missing type', () => {
		expect(() => toBetterAuthField('invalid', null)).toThrow(/AUTH008/);
		expect(() => toBetterAuthField('invalid', {})).toThrow(/missing type/);
	});

	it('maps dictionaries of builders via mapAdditionalFields', () => {
		const mapped = mapAdditionalFields({
			role: field.string().default('user'),
			age: field.integer().required(),
			active: field.boolean().default(true)
		});

		expect(mapped).toEqual({
			role: { type: 'string', required: false, defaultValue: 'user' },
			age: { type: 'number', required: true },
			active: { type: 'boolean', required: false, defaultValue: true }
		});
	});

	it('returns empty object when mapAdditionalFields is called with undefined or null', () => {
		expect(mapAdditionalFields(undefined as any)).toEqual({});
		expect(mapAdditionalFields(null as any)).toEqual({});
	});
});

describe('FieldBuilder.toJSON()', () => {
	it('returns serializable field definition for builders', () => {
		const b = field.string(50).required().default('test').unique();
		const json = b.toJSON();

		expect(json).toEqual({
			type: 'string',
			length: 50,
			required: true,
			default: 'test',
			unique: true
		});
		expect(json).toEqual(b.build());
	});

	it('is iterable as an object', () => {
		const b = field.integer().required();
		const obj = Object.fromEntries(b as any);
		expect(obj.type).toBe('integer');
		expect(obj.required).toBe(true);
	});
});

describe('Watcher decision logic', () => {
	describe('shouldRegenerateAuth', () => {
		it('returns true when lastHash is null or undefined', () => {
			expect(shouldRegenerateAuth(null, 'abc')).toBe(true);
			expect(shouldRegenerateAuth(undefined, 'abc')).toBe(true);
		});

		it('returns false when hashes are identical', () => {
			expect(shouldRegenerateAuth('abc', 'abc')).toBe(false);
		});

		it('returns true when hashes differ', () => {
			expect(shouldRegenerateAuth('abc', 'def')).toBe(true);
		});
	});

	describe('computeAuthInputsHash', () => {
		let tmpDir: string;

		beforeEach(async () => {
			tmpDir = await mkdtemp(join(tmpdir(), 'omni-auth-hash-test-'));
		});

		afterEach(async () => {
			await rm(tmpDir, { recursive: true, force: true });
		});

		it('produces consistent hashes for identical inputs', async () => {
			const config = {
				plugins: { admin: true, organization: false },
				user: { additionalFields: { role: field.string() } }
			};

			const hash1 = await computeAuthInputsHash(tmpDir, config, []);
			const hash2 = await computeAuthInputsHash(tmpDir, config, []);
			expect(hash1).toBe(hash2);
		});

		it('changes hash when enabled plugins change', async () => {
			const configA = { plugins: { admin: true } };
			const configB = { plugins: { admin: true, organization: true } };

			const hashA = await computeAuthInputsHash(tmpDir, configA, []);
			const hashB = await computeAuthInputsHash(tmpDir, configB, []);
			expect(hashA).not.toBe(hashB);
		});

		it('changes hash when additionalFields change', async () => {
			const configA = {
				user: { additionalFields: { role: field.string() } }
			};
			const configB = {
				user: { additionalFields: { role: field.string(), bio: field.richtext() } }
			};

			const hashA = await computeAuthInputsHash(tmpDir, configA, []);
			const hashB = await computeAuthInputsHash(tmpDir, configB, []);
			expect(hashA).not.toBe(hashB);
		});

		it('changes hash when watched file content changes', async () => {
			const dummyFile = join(tmpDir, 'omni.config.ts');
			await writeFile(dummyFile, 'export default { auth: {} };', 'utf-8');

			const hash1 = await computeAuthInputsHash(tmpDir, {}, [dummyFile]);

			await writeFile(dummyFile, 'export default { auth: { usePlural: true } };', 'utf-8');
			const hash2 = await computeAuthInputsHash(tmpDir, {}, [dummyFile]);

			expect(hash1).not.toBe(hash2);
		});
	});

	describe('findSchemasReferencingAuth', () => {
		it('detects schema referencing auth via field.reference thunk', () => {
			const schemas: any[] = [
				{
					name: 'posts',
					tableName: 'posts',
					fields: {
						id: field.serial().primaryKey(),
						authorId: field.reference(() => auth.user)
					}
				},
				{
					name: 'tags',
					tableName: 'tags',
					fields: {
						id: field.serial().primaryKey(),
						name: field.string()
					}
				}
			];

			const referencing = findSchemasReferencingAuth(schemas);
			expect(referencing.length).toBe(1);
			expect(referencing[0].name).toBe('posts');
		});

		it('detects schema referencing auth via string key', () => {
			const schemas: any[] = [
				{
					name: 'audit_logs',
					tableName: 'audit_logs',
					fields: {
						id: field.serial().primaryKey(),
						userId: field.reference('user')
					}
				}
			];

			const referencing = findSchemasReferencingAuth(schemas);
			expect(referencing.length).toBe(1);
			expect(referencing[0].name).toBe('audit_logs');
		});

		it('detects schema referencing auth via relation.belongsTo', () => {
			const schemas: any[] = [
				{
					name: 'profiles',
					tableName: 'profiles',
					fields: {
						id: field.serial().primaryKey()
					},
					relations: {
						user: relation.belongsTo(() => auth.user, { via: 'userId' })
					}
				}
			];

			const referencing = findSchemasReferencingAuth(schemas);
			expect(referencing.length).toBe(1);
			expect(referencing[0].name).toBe('profiles');
		});

		it('returns empty array when no schemas reference auth', () => {
			const schemas: any[] = [
				{
					name: 'categories',
					tableName: 'categories',
					fields: {
						id: field.serial().primaryKey(),
						title: field.string()
					}
				}
			];

			expect(findSchemasReferencingAuth(schemas)).toEqual([]);
		});
	});
});

describe('Atomic writes safety', () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await mkdtemp(join(tmpdir(), 'omni-atomic-test-'));
	});

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true });
	});

	it('concurrent writes do not corrupt the target file', async () => {
		const targetFile = join(tmpDir, 'concurrent-output.txt');
		const iterations = 50;
		const promises = [];

		for (let i = 0; i < iterations; i++) {
			const payload = JSON.stringify({ index: i, timestamp: Date.now(), data: 'x'.repeat(1024) });
			promises.push(
				Promise.resolve().then(() => {
					atomic_write(targetFile, payload);
				})
			);
		}

		await Promise.all(promises);

		const finalContent = await readFile(targetFile, 'utf-8');
		const parsed = JSON.parse(finalContent);
		expect(parsed).toHaveProperty('index');
		expect(parsed.data.length).toBe(1024);
	});

	it('write_if_changed_atomic skips writing when content is unchanged', async () => {
		const targetFile = join(tmpDir, 'unchanged.txt');
		write_if_changed_atomic(targetFile, 'initial content');
		expect(await readFile(targetFile, 'utf-8')).toBe('initial content');

		write_if_changed_atomic(targetFile, 'initial content');
		expect(await readFile(targetFile, 'utf-8')).toBe('initial content');
	});
});

describe('Integration: Auth Registry with additionalFields fixture', () => {
	let tmpDir: string;

	beforeEach(async () => {
		resetAuthRegistryCache();
		tmpDir = await mkdtemp(join(tmpdir(), 'omni-registry-addfields-'));
	});

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true });
	});

	it('introspects auth schema fixture and writes .omni/schema.d.ts', async () => {
		await mkdir(join(tmpDir, '.omni'), { recursive: true });
		await writeFile(join(tmpDir, '.omni', 'auth-schema.ts'), '// auth schema v1', 'utf-8');

		const reg = await buildAuthRegistry({
			root: tmpDir,
			dialect: 'pg',
			usePlural: false,
			loadModule: async () => pgFixture as any
		});

		expect(reg).toBeDefined();
		expect(reg.schemas.has('user')).toBe(true);

		const schemaDts = await readFile(join(tmpDir, '.omni', 'schema.d.ts'), 'utf-8');
		expect(schemaDts).toContain('interface AuthTables');
		expect(schemaDts).toContain('"user": true;');

		// Changing the file changes the registry hash
		resetAuthRegistryCache();
		await writeFile(join(tmpDir, '.omni', 'auth-schema.ts'), '// auth schema v2 changed', 'utf-8');
		const reg2 = await buildAuthRegistry({
			root: tmpDir,
			dialect: 'pg',
			usePlural: false,
			loadModule: async () => pgFixture as any
		});

		expect(reg2.hash).not.toBe(reg.hash);
	});
});
