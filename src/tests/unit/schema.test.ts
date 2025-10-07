import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { SchemaParser } from '$pkg/schema/parser.js';
import { DrizzleGenerator } from '$pkg/schema/generators/drizzle.js';
import { ZodGenerator } from '$pkg/schema/generators/zod.js';
import { ModelGenerator } from '$pkg/schema/generators/model.js';
import type { Schema } from '$pkg/schema/types.js';

// Test fixtures
const mockUserSchema: Schema = {
  name: 'users',
  fields: {
    id: { type: 'serial', primary: true },
    name: { type: 'string', length: 255, required: true, validation: { min: 2, max: 100, message: 'Name must be between 2-100 characters' } },
    email: { type: 'email', required: true, unique: true },
    password: { type: 'password', required: true, validation: { min: 8, requireUppercase: true, requireNumbers: true } },
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
    title: { type: 'string', length: 255, required: true, validation: { min: 5, max: 255, message: 'Title must be between 5-255 characters' } },
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

const mockConfig = {
  input: {
    patterns: ['src/**/*.schema.ts'],
    exclude: ['**/node_modules/**']
  },
  output: {
    drizzle: { path: './src/lib/db/server/schema.ts', format: 'single-file' },
    zod: { path: './src/lib/validation', format: 'per-schema' },
    model: { path: './src/lib/models', format: 'per-schema' }
  }
};

describe('Schema System', () => {
  let tempDir: string;

  beforeEach(() => {
    // Create temporary directory for tests
    tempDir = path.join(process.cwd(), 'test-output');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up temporary files
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('SchemaParser', () => {
    it('should initialize with default config', () => {
      const parser = new SchemaParser();
      expect(parser).toBeDefined();
    });

    it('should load config from constructor', () => {
      const parser = new SchemaParser(mockConfig);
      const outputConfig = parser.getOutputConfig();
      expect(outputConfig.drizzle.path).toBe('./src/lib/db/server/schema.ts');
      expect(outputConfig.zod.format).toBe('per-schema');
    });

    it('should discover schema files based on patterns', async () => {
      // Create test schema files
      const schemaDir = path.join(tempDir, 'schemas');
      fs.mkdirSync(schemaDir, { recursive: true });
      
      const userSchemaContent = `
        import { defineSchema } from '$pkg/schema';
        export const userSchema = defineSchema('users', {
          id: { type: 'serial', primary: true },
          name: { type: 'string', length: 255, required: true }
        });
      `;
      
      fs.writeFileSync(path.join(schemaDir, 'user.schema.ts'), userSchemaContent);
      
      const parser = new SchemaParser({
        input: { patterns: [`${tempDir}/**/*.schema.ts`] }
      });
      
      const schemas = await parser.discoverAndParseSchemas(tempDir);
      expect(schemas.length).toBeGreaterThan(0);
    });

    it('should handle duplicate schema names', async () => {
      const schemaDir = path.join(tempDir, 'schemas');
      fs.mkdirSync(schemaDir, { recursive: true });
      
      const duplicateContent = `
        export const userSchema = defineSchema('users', {
          id: { type: 'serial', primary: true }
        });
      `;
      
      fs.writeFileSync(path.join(schemaDir, 'user1.schema.ts'), duplicateContent);
      fs.writeFileSync(path.join(schemaDir, 'user2.schema.ts'), duplicateContent);
      
      const parser = new SchemaParser({
        input: { patterns: [`${tempDir}/**/*.schema.ts`] }
      });
      
      const schemas = await parser.discoverAndParseSchemas(tempDir);
      // Should only have one schema due to duplicate handling
      const userSchemas = schemas.filter(s => s.name === 'users');
      expect(userSchemas.length).toBe(1);
    });
  });

  describe('DrizzleGenerator', () => {
    it('should generate proper imports', () => {
      const generator = new DrizzleGenerator(mockUserSchema);
      const imports = generator.generateImports();
      
      expect(imports).toContain('serial');
      expect(imports).toContain('text');
      expect(imports).toContain('varchar');
      expect(imports).toContain('boolean');
      expect(imports).toContain('timestamp');
      expect(imports).toContain('pgTable');
      expect(imports).toContain('index');
    });

    it('should generate table definition with correct columns', () => {
      const generator = new DrizzleGenerator(mockUserSchema);
      const tableDef = generator.generateTableDefinition();
      
      expect(tableDef).toContain('export const users = pgTable');
      expect(tableDef).toContain('id: serial(\'id\').primaryKey()');
      expect(tableDef).toContain('name: varchar(\'name\', { length: 255 }).notNull()');
      expect(tableDef).toContain('email: text(\'email\').notNull().unique()');
      expect(tableDef).toContain('password: text(\'password\').notNull()');
      expect(tableDef).toContain('active: boolean(\'active\').default(true)');
      expect(tableDef).toContain('createdAt: timestamp(\'created_at\').defaultNow().notNull()');
      expect(tableDef).toContain('updatedAt: timestamp(\'updated_at\').defaultNow().notNull()');
    });

    it('should generate indexes correctly', () => {
      const generator = new DrizzleGenerator(mockUserSchema);
      const indexes = generator.generateIndexes();
      
      expect(indexes).toContain('users_email_idx');
      expect(indexes).toContain('users_name_idx');
      expect(indexes).toContain('users_active_idx');
      expect(indexes).toContain('index(\'users_email_idx\').on(users.email)');
    });

    it('should generate type exports', () => {
      const generator = new DrizzleGenerator(mockUserSchema);
      const exports = generator.generateExports();
      
      expect(exports).toContain('export type Users = typeof users.$inferSelect');
      expect(exports).toContain('export type NewUsers = typeof users.$inferInsert');
    });

    it('should generate single file with multiple schemas', async () => {
      const generator = new DrizzleGenerator(mockUserSchema);
      const outputs = await generator.generateFiles([mockUserSchema, mockPostSchema], {
        format: 'single-file',
        path: path.join(tempDir, 'schema.ts')
      });
      
      expect(outputs).toHaveLength(1);
      expect(outputs[0].type).toBe('drizzle');
      expect(outputs[0].content).toContain('export const users = pgTable');
      expect(outputs[0].content).toContain('export const posts = pgTable');

     expect(outputs[0].content.match(/import { serial/g)?.length || 0).toBeLessThanOrEqual(1);   // Check that 'import { serial' appears at most once (no duplicates)
    });
  });

  describe('ZodGenerator', () => {
    it('should generate create schema with proper validation', () => {
      const generator = new ZodGenerator(mockUserSchema);
      const content = generator.generate();
      
      expect(content).toContain('import { z } from \'zod\'');
      expect(content).toContain('export const usersCreateSchema = z.object({');
      expect(content).toContain('name: z.string().max(255).min(2).max(100)');
      expect(content).toContain('email: z.string().email()');
      expect(content).toContain('password: z.string().min(8).regex(/[A-Z]/');
      expect(content).toContain('active: z.boolean().optional()');
      expect(content).toContain('export type UsersCreate = z.infer<typeof usersCreateSchema>');
    });

    it('should generate update schema with optional fields', () => {
      const generator = new ZodGenerator(mockUserSchema);
      const content = generator.generate();
      
      expect(content).toContain('export const usersUpdateSchema = z.object({');
      expect(content).toContain('name: z.string().max(255).min(2).max(100).describe(\'Name must be between 2-100 characters\').optional()');
      expect(content).toContain('email: z.string().email().optional()');
      expect(content).toContain('password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/).optional()');
      expect(content).toContain('export type UsersUpdate = z.infer<typeof usersUpdateSchema>');
    });

    it('should exclude primary keys and computed fields', () => {
      const generator = new ZodGenerator(mockUserSchema);
      const content = generator.generate();
      
      expect(content).not.toContain('id: z.number()'); // Primary key should be excluded
    });

    it('should not have duplicate imports', () => {
      const generator = new ZodGenerator(mockUserSchema);
      const content = generator.generate();
      
      const importMatches = content.match(/import { z } from 'zod';/g);
      expect(importMatches).toHaveLength(1);
    });

    it('should generate per-schema files', async () => {
      const generator = new ZodGenerator(mockUserSchema);
      const outputs = await generator.generateFiles([mockUserSchema, mockPostSchema], {
        format: 'per-schema',
        path: tempDir
      });
      
      expect(outputs).toHaveLength(2);
      expect(outputs[0].path).toContain('users.validation.ts');
      expect(outputs[1].path).toContain('posts.validation.ts');
    });
  });

  describe('ModelGenerator', () => {
    it('should generate correct imports with proper paths', () => {
      const outputConfig = { path: './src/lib/models' };
      const generator = new ModelGenerator(mockUserSchema, outputConfig);
      const content = generator.generate();
      
      expect(content).toContain('import { Model } from \'../../package/database/model\'');
      expect(content).toContain('import { users } from \'../db/server/schema\'');
      expect(content).toContain('import { usersCreateSchema, usersUpdateSchema } from \'../validation/users.validation\'');
      expect(content).toContain('import type { Users as UsersType, NewUsers as NewUsersType } from \'../db/server/schema\'');
    });

    it('should generate model class with correct properties', () => {
      const generator = new ModelGenerator(mockUserSchema);
      const content = generator.generate();
      
      expect(content).toContain('export class UsersModel extends Model {');
      expect(content).toContain('static tableName = \'users\'');
      expect(content).toContain('static table = users');
      expect(content).toContain('static createSchema = usersCreateSchema');
      expect(content).toContain('static updateSchema = usersUpdateSchema');
    });

    it('should generate fillable array correctly', () => {
      const generator = new ModelGenerator(mockUserSchema);
      const content = generator.generate();
      
      expect(content).toContain('static fillable = [\'name\', \'email\', \'password\', \'active\']');
      // Should exclude primary key, timestamps, and computed fields
      expect(content).not.toContain('\'id\'');
      expect(content).not.toContain('\'createdAt\'');
      expect(content).not.toContain('\'updatedAt\'');
    });

    it('should generate hidden array correctly', () => {
      const generator = new ModelGenerator(mockUserSchema);
      const content = generator.generate();
      
      expect(content).toContain('static hidden = [\'password\']');
    });

    it('should generate casts with proper types', () => {
      const generator = new ModelGenerator(mockUserSchema);
      const content = generator.generate();
      
      expect(content).toContain('static casts = { active: \'boolean\' as const }');
    });

    it('should generate realtime config when enabled', () => {
      const generator = new ModelGenerator(mockUserSchema);
      const content = generator.generate();
      
      expect(content).toContain('static realtimeConfig = {');
      expect(content).toContain('enabled: true');
      expect(content).toContain('events: ["created","updated"]');
      expect(content).toContain('channels: () => [`users`]');
    });

    it('should generate export class correctly', () => {
      const generator = new ModelGenerator(mockUserSchema);
      const content = generator.generate();
      
      expect(content).toContain('export class Users extends UsersModel {');
      expect(content).toContain('export default Users;');
    });

    it('should respect output directory configuration', async () => {
      const outputConfig = { path: './src/lib/models', format: 'per-schema' };
      const generator = new ModelGenerator(mockUserSchema, outputConfig);
      const outputs = await generator.generateFiles([mockUserSchema], outputConfig);
      
      expect(outputs).toHaveLength(1);
      expect(outputs[0].path).toBe('./src/lib/models/users.model.ts');
    });
  });

  describe('Configuration Handling', () => {
    it('should follow svelte.config.js output directories', () => {
      const parser = new SchemaParser(mockConfig);
      const config = parser.getOutputConfig();
      
      expect(config.drizzle.path).toBe('./src/lib/db/server/schema.ts');
      expect(config.zod.path).toBe('./src/lib/validation');
      expect(config.model.path).toBe('./src/lib/models');
    });

    it('should handle different output formats', () => {
      const parser = new SchemaParser(mockConfig);
      const config = parser.getOutputConfig();
      
      expect(config.drizzle.format).toBe('single-file');
      expect(config.zod.format).toBe('per-schema');
      expect(config.model.format).toBe('per-schema');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing schema files gracefully', async () => {
      const parser = new SchemaParser({
        input: { patterns: ['nonexistent/**/*.schema.ts'] }
      });
      
      const schemas = await parser.discoverAndParseSchemas();
      expect(schemas).toHaveLength(0);
    });

    it('should handle malformed schema files', async () => {
      const schemaDir = path.join(tempDir, 'schemas');
      fs.mkdirSync(schemaDir, { recursive: true });
      
      const malformedContent = 'this is not a valid schema file';
      fs.writeFileSync(path.join(schemaDir, 'malformed.schema.ts'), malformedContent);
      
      const parser = new SchemaParser({
        input: { patterns: [`${tempDir}/**/*.schema.ts`] }
      });
      
      const schemas = await parser.discoverAndParseSchemas(tempDir);
      expect(schemas).toHaveLength(0); // Should not crash, just return empty array
    });
  });

  describe('Integration Tests', () => {
    it('should generate all files correctly with proper references', async () => {
      const parser = new SchemaParser(mockConfig);
      const schemas = [mockUserSchema, mockPostSchema];
      
      // Generate Drizzle
      const drizzleGen = new DrizzleGenerator(mockUserSchema);
      const drizzleOutputs = await drizzleGen.generateFiles(schemas, mockConfig.output.drizzle);
      
      // Generate Zod
      const zodGen = new ZodGenerator(mockUserSchema);
      const zodOutputs = await zodGen.generateFiles(schemas, mockConfig.output.zod);
      
      // Generate Models
      const modelGen = new ModelGenerator(mockUserSchema, mockConfig.output.model);
      const modelOutputs = await modelGen.generateFiles(schemas, mockConfig.output.model);
      
      expect(drizzleOutputs).toHaveLength(1);
      expect(zodOutputs).toHaveLength(2);
      expect(modelOutputs).toHaveLength(2);
      
      // Check that model references are correct
      const userModel = modelOutputs.find(o => o.path.includes('users.model.ts'));
      expect(userModel?.content).toContain('import { users } from');
      expect(userModel?.content).toContain('import { usersCreateSchema');
    });
  });
});
