import { mkdtemp, rm, readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { field } from '../../../schema/field.js';
import {
	toBetterAuthField,
	mapAdditionalFields
} from '../../../runtime/auth/additional-fields.js';
import { AuthDiagnostic } from '../../../runtime/auth/diagnostics.js';
import { hashAuthConfig } from '../../../runtime/auth/schema-generator.js';
import { generateAuthConfig } from '../../../runtime/auth/generator.js';
import { runtime_directory } from '../../../utils/index.js';
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

		// Built Omni definitions retain default value identically to builders
		const builtField = toBetterAuthField('bio', field.string().required().default('hello').build());
		expect(builtField).toEqual(stringField);

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

	it('passes through raw Better Auth field objects directly without stripping properties', () => {
		const raw = {
			type: 'string' as const,
			required: true,
			defaultValue: 'admin',
			input: true,
			returned: false,
			customFlag: 123
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

describe('Config generation and hash detection', () => {
	it('hashAuthConfig changes when user.additionalFields change', () => {
		const configA = {
			user: { additionalFields: { role: { type: 'string' } } }
		};
		const configB = {
			user: { additionalFields: { role: { type: 'string' }, bio: { type: 'string' } } }
		};

		const hashA = hashAuthConfig(configA);
		const hashB = hashAuthConfig(configB);
		expect(hashA).not.toBe(hashB);
	});

	it('generateAuthConfig maps additionalFields into generated config', async () => {
		await generateAuthConfig({
			user: {
				additionalFields: {
					role: field.string().default('user'),
					age: field.integer().required()
				}
			}
		});

		const configFile = join(runtime_directory, 'auth/__generated__/config.js');
		const content = await readFile(configFile, 'utf-8');
		expect(content).toContain('additionalFields:');
		expect(content).toContain('"type": "string"');
		expect(content).toContain('"type": "number"');
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
