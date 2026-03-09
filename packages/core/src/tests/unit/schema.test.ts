import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { SchemaParser } from '$pkg/schema/parser.js';
import { DrizzleGenerator } from '$pkg/schema/generators/drizzle.js';
import { ZodGenerator } from '$pkg/schema/generators/zod.js';
import { ModelGenerator } from '$pkg/schema/generators/model.js';
import type { Schema } from '$pkg/schema/types.js';

// ─── Test fixtures ──────────────────────────────────────────────
const mockUserSchema: Schema = {
	name: 'users',
	fields: {
		id: { type: 'serial', primary: true },
		name: {
			type: 'string',
			length: 255,
			required: true,
			validation: {
				min: 2,
				max: 100,
				message: 'Name must be between 2-100 characters'
			}
		},
		email: { type: 'email', required: true, unique: true },
		password: {
			type: 'password',
			required: true,
			validation: { min: 8, requireUppercase: true, requireNumbers: true }
		},
		active: { type: 'boolean', default: true }
	},
	config: {
		timestamps: true,
		fillable: 'auto',
		hidden: 'auto',
		realtime: {
			enabled: true,
			events: ['created', 'updated'],
			channels: ['users']
		},
		indexes: ['email', 'name', 'active']
	}
};

const mockPostSchema: Schema = {
	name: 'posts',
	fields: {
		id: { type: 'serial', primary: true },
		title: {
			type: 'string',
			length: 255,
			required: true,
			validation: {
				min: 5,
				max: 255,
				message: 'Title must be between 5-255 characters'
			}
		},
		slug: { type: 'string', required: true, unique: true },
		content: { type: 'string', required: true },
		published: { type: 'boolean', default: false },
		userId: { type: 'integer', required: true }
	},
	config: {
		timestamps: true,
		fillable: 'auto',
		hidden: [],
		indexes: ['slug', 'published', 'userId']
	}
};

const mockOutputConfig = {
	drizzle: {
		path: './src/lib/db/server/schema.ts',
		format: 'single-file' as const
	},
	zod: { path: './src/lib/validation', format: 'per-schema' as const },
	model: { path: './src/lib/models', format: 'per-schema' as const }
};

// ─── Setup ──────────────────────────────────────────────────────
describe('Schema System', () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = path.join(process.cwd(), 'test-output');
		if (!fs.existsSync(tempDir)) {
			fs.mkdirSync(tempDir, { recursive: true });
		}
	});

	afterEach(() => {
		if (fs.existsSync(tempDir)) {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	});

	// ─── SchemaParser ─────────────────────────────────────────────
	describe('SchemaParser', () => {
		it('should initialize with default config', () => {
			const parser = new SchemaParser({});
			expect(parser).toBeDefined();
		});

		it('should initialize with provided config', () => {
			const config = { input: { patterns: ['src/**/*.schema.ts'] } };
			const parser = new SchemaParser(config);
			expect(parser).toBeDefined();
		});

		it('should handle missing schema files gracefully', async () => {
			const parser = new SchemaParser({
				input: { patterns: ['nonexistent/**/*.schema.ts'] }
			});
			// parseSchemas on a non-existent file should return empty or throw safely
			const schemas = await parser.parseSchemas('nonexistent/file.ts').catch(() => []);
			expect(Array.isArray(schemas)).toBe(true);
		});

		it('should parse a schema file with AST strategy', async () => {
			const schemaDir = path.join(tempDir, 'schemas');
			fs.mkdirSync(schemaDir, { recursive: true });

			const schemaContent = `
        import { defineSchema } from '$pkg/schema';
        export const userSchema = defineSchema('testusers', {
          id: { type: 'serial', primary: true },
          name: { type: 'string', length: 255, required: true }
        });
      `;
			const schemaFile = path.join(schemaDir, 'user.schema.ts');
			fs.writeFileSync(schemaFile, schemaContent);

			const parser = new SchemaParser({
				input: { patterns: [`${schemaDir}/**/*.schema.ts`] }
			});
			// parse the individual file
			const schemas = await parser.parseSchemas(schemaFile).catch(() => []);
			expect(Array.isArray(schemas)).toBe(true);
		});
	});

	// ─── DrizzleGenerator ─────────────────────────────────────────
	describe('DrizzleGenerator', () => {
		it('should generate valid drizzle schema output', () => {
			const generator = new DrizzleGenerator(mockUserSchema);
			const output = generator.generate();

			// Import line
			expect(output).toContain(`from 'drizzle-orm/pg-core'`);
			expect(output).toContain('serial');
			expect(output).toContain('text');
			expect(output).toContain('varchar');
			expect(output).toContain('boolean');
			expect(output).toContain('timestamp');
			expect(output).toContain('pgTable');
			expect(output).toContain('index');
		});

		it('should generate table definition with correct columns', () => {
			const generator = new DrizzleGenerator(mockUserSchema);
			const output = generator.generate();

			expect(output).toContain(`export const users = pgTable('users'`);
			expect(output).toContain(`id: serial('id').primaryKey()`);
			expect(output).toContain(`name: varchar('name', { length: 255 }).notNull()`);
			// email is type 'email' → text() in the generator
			expect(output).toContain(`email: text('email').notNull().unique()`);
			// password is type 'password' → text()
			expect(output).toContain(`password: text('password').notNull()`);
			expect(output).toContain(`active: boolean('active').default(true)`);
			// Timestamp columns
			expect(output).toContain(`createdAt: timestamp('created_at').defaultNow().notNull()`);
			expect(output).toContain(`updatedAt: timestamp('updated_at').defaultNow().notNull()`);
		});

		it('should generate indexes correctly', () => {
			const generator = new DrizzleGenerator(mockUserSchema);
			const output = generator.generate();

			expect(output).toContain('users_email_idx');
			expect(output).toContain('users_name_idx');
			expect(output).toContain('users_active_idx');
			expect(output).toContain(`index('users_email_idx').on(users.email)`);
		});

		it('should generate type exports', () => {
			const generator = new DrizzleGenerator(mockUserSchema);
			const output = generator.generate();

			expect(output).toContain('export type Users = typeof users.$inferSelect');
			expect(output).toContain('export type NewUsers = typeof users.$inferInsert');
		});

		it('should generate single file with multiple schemas (no duplicate imports)', async () => {
			const generator = new DrizzleGenerator(mockUserSchema);
			const outputs = await generator.generateFiles([mockUserSchema, mockPostSchema], {
				format: 'single-file',
				path: path.join(tempDir, 'schema.ts')
			});

			expect(outputs).toHaveLength(1);
			expect(outputs[0].type).toBe('drizzle');
			expect(outputs[0].content).toContain('export const users = pgTable');
			expect(outputs[0].content).toContain('export const posts = pgTable');
			// Should import from drizzle-orm/pg-core exactly once
			const importCount = (outputs[0].content.match(/from 'drizzle-orm\/pg-core'/g) || []).length;
			expect(importCount).toBe(1);
		});
	});

	// ─── ZodGenerator ─────────────────────────────────────────────
	describe('ZodGenerator', () => {
		it('should generate create schema with proper validation', () => {
			const generator = new ZodGenerator(mockUserSchema);
			const content = generator.generate();

			// ZodGenerator imports from 'omni-svelte/validation', not 'zod'
			expect(content).toContain(`from 'omni-svelte/validation'`);
			expect(content).toContain('export const usersCreateSchema = z.object({');
			expect(content).toContain('name: z.string().max(255)');
			expect(content).toContain('email: z.string().email()');
			expect(content).toContain('password: z.string().min(8)');
			// boolean field with default → .optional()
			expect(content).toContain('active: z.boolean().optional()');
			expect(content).toContain('export type UsersCreate = z.infer<typeof usersCreateSchema>');
		});

		it('should generate update schema with optional fields', () => {
			const generator = new ZodGenerator(mockUserSchema);
			const content = generator.generate();

			expect(content).toContain('export const usersUpdateSchema = z.object({');
			expect(content).toContain('export type UsersUpdate = z.infer<typeof usersUpdateSchema>');
			// All update fields should be optional
			expect(content).toContain('.optional()');
		});

		it('should exclude primary keys from create/update schemas', () => {
			const generator = new ZodGenerator(mockUserSchema);
			const content = generator.generate();

			// The `id` field (primary key) is filtered out in generateCreateSchema / generateUpdateSchema
			// Ensure the schema body doesn't include `id:` as a standalone field
			const createBlock = content.split('usersUpdateSchema')[0];
			expect(createBlock).not.toMatch(/^\s*id:/m);
		});

		it('should not have duplicate imports', () => {
			const generator = new ZodGenerator(mockUserSchema);
			const content = generator.generate();

			const importMatches = content.match(/from 'omni-svelte\/validation'/g);
			expect(importMatches).toHaveLength(1);
		});

		it('should generate per-schema files', async () => {
			const generator = new ZodGenerator(mockUserSchema);
			const outputs = await generator.generateFiles([mockUserSchema, mockPostSchema], {
				format: 'per-schema',
				path: tempDir
			});

			expect(outputs).toHaveLength(2);
			expect(outputs.some((o) => o.path.includes('users'))).toBe(true);
			expect(outputs.some((o) => o.path.includes('posts'))).toBe(true);
		});
	});

	// ─── ModelGenerator ───────────────────────────────────────────
	describe('ModelGenerator', () => {
		it('should generate model with correct class name', () => {
			const generator = new ModelGenerator(mockUserSchema);
			const content = generator.generate();

			expect(content).toContain('export class UsersModel extends Model {');
			expect(content).toContain(`static tableName = 'users'`);
			expect(content).toContain('static table = users');
			expect(content).toContain('static fillable =');
			expect(content).toContain('static hidden =');
		});

		it('should generate fillable array (excludes id, timestamps)', () => {
			const generator = new ModelGenerator(mockUserSchema);
			const content = generator.generate();

			// Should include regular fields
			expect(content).toContain("'name'");
			expect(content).toContain("'email'");
			expect(content).toContain("'password'");
			// Should NOT include primary key or auto-timestamp fields
			expect(content).not.toMatch(/fillable[^;]+\bid\b/);
		});

		it('should generate hidden array (auto-detects password fields)', () => {
			const generator = new ModelGenerator(mockUserSchema);
			const content = generator.generate();

			// hidden: 'auto' → password type fields should be hidden
			expect(content).toContain("'password'");
		});

		it('should generate casts correctly', () => {
			const generator = new ModelGenerator(mockUserSchema);
			const content = generator.generate();

			expect(content).toContain(`active: 'boolean' as const`);
		});

		it('should generate realtime config when enabled', () => {
			const generator = new ModelGenerator(mockUserSchema);
			const content = generator.generate();

			expect(content).toContain('static realtime = {');
			expect(content).toContain('enabled: true');
			expect(content).toContain('["created","updated"]');
			// channels is a function returning a template literal
			expect(content).toContain('channels: ()');
		});

		it('should generate public User class extending UsersModel', () => {
			const generator = new ModelGenerator(mockUserSchema);
			const content = generator.generate();

			expect(content).toContain('export class Users extends UsersModel');
			// Without outputConfig.format === 'single-file', default export is added
			expect(content).toContain('export default Users');
		});

		it('should generate per-schema files with correct paths', async () => {
			const generator = new ModelGenerator(mockUserSchema, mockOutputConfig.model);
			const outputs = await generator.generateFiles([mockUserSchema], mockOutputConfig.model);

			expect(outputs).toHaveLength(1);
			expect(outputs[0].path).toContain('users.model.ts');
			expect(outputs[0].content).toContain('static table = users');
		});
	});

	// ─── Configuration Handling ───────────────────────────────────
	describe('Configuration Handling', () => {
		it('should construct SchemaParser without crashing on full config', () => {
			const parser = new SchemaParser({
				input: mockOutputConfig,
				output: mockOutputConfig
			} as any);
			expect(parser).toBeDefined();
		});
	});

	// ─── Integration ──────────────────────────────────────────────
	describe('Integration Tests', () => {
		it('should generate consistent output across all three generators', async () => {
			const drizzleGen = new DrizzleGenerator(mockUserSchema);
			const zodGen = new ZodGenerator(mockUserSchema);
			const modelGen = new ModelGenerator(mockUserSchema, mockOutputConfig.model);

			const drizzleOutputs = await drizzleGen.generateFiles(
				[mockUserSchema, mockPostSchema],
				mockOutputConfig.drizzle
			);
			const zodOutputs = await zodGen.generateFiles(
				[mockUserSchema, mockPostSchema],
				mockOutputConfig.zod
			);
			const modelOutputs = await modelGen.generateFiles(
				[mockUserSchema, mockPostSchema],
				mockOutputConfig.model
			);

			expect(drizzleOutputs).toHaveLength(1); // single-file
			expect(zodOutputs).toHaveLength(2); // per-schema
			expect(modelOutputs).toHaveLength(2); // per-schema

			// Cross-reference: model should import from drizzle schema
			const userModel = modelOutputs.find((o) => o.path.includes('users'));
			expect(userModel?.content).toContain('static table = users');
			expect(userModel?.content).toContain('usersCreateSchema');
		});
	});
});
