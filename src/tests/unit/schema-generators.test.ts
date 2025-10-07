import { describe, it, expect, beforeEach } from 'vitest';
import { DrizzleGenerator } from '../../package/schema/generators/drizzle';
import { ZodGenerator } from '../../package/schema/generators/zod';
import { ModelGenerator } from '../../package/schema/generators/model';
import type { Schema } from '../../package/schema/types';

describe('Schema Generators with Path Resolution', () => {
  let mockSchema: Schema;
  let mockConfig: any;

  beforeEach(() => {
    mockSchema = {
      name: 'users',
      fields: {
        id: { type: 'serial', primary: true },
        name: { type: 'string', required: true },
        email: { type: 'email', required: true, unique: true },
        password: { type: 'password', required: true, hidden: true }
      },
      config: {
        timestamps: true,
        indexes: ['email']
      },
      filePath: './src/lib/schema/users.schema.ts'
    };

    mockConfig = {
      drizzle: {
        path: './src/lib/db/server/schema.ts',
        format: 'single-file'
      },
      zod: {
        path: './src/lib/validation',
        format: 'per-schema'
      },
      model: {
        path: './src/lib/models',
        format: 'per-schema'
      }
    };
  });

  describe('DrizzleGenerator', () => {
    it('should generate files with correct paths for single-file format', async () => {
      const generator = new DrizzleGenerator(mockSchema);
      const outputs = await generator.generateFiles([mockSchema], mockConfig.drizzle);
      
      expect(outputs).toHaveLength(1);
      expect(outputs[0].path).toBe('./src/lib/db/server/schema.ts');
      expect(outputs[0].type).toBe('drizzle');
      expect(outputs[0].content).toContain('export const users = pgTable');
    });

    it('should generate files with correct paths for per-schema format', async () => {
      const perSchemaConfig = { ...mockConfig.drizzle, format: 'per-schema', path: './src/lib/db/schemas' };
      const generator = new DrizzleGenerator(mockSchema);
      const outputs = await generator.generateFiles([mockSchema], perSchemaConfig);
      
      expect(outputs).toHaveLength(1);
      expect(outputs[0].path).toBe('./src/lib/db/schemas/users.schema.ts');
      expect(outputs[0].type).toBe('drizzle');
    });

    it('should generate correct imports', () => {
      const generator = new DrizzleGenerator(mockSchema);
      const content = generator.generate();
      
      expect(content).toContain('import {');
      expect(content).toContain('} from \'drizzle-orm/pg-core\';');
      expect(content).toContain('serial');
      expect(content).toContain('text');
      expect(content).toContain('timestamp');
    });
  });

  describe('ZodGenerator', () => {
    it('should generate files with correct paths for per-schema format', async () => {
      const generator = new ZodGenerator(mockSchema);
      const outputs = await generator.generateFiles([mockSchema], mockConfig.zod);
      
      expect(outputs).toHaveLength(1);
      expect(outputs[0].path).toBe('./src/lib/validation/users.validation.ts');
      expect(outputs[0].type).toBe('zod');
      expect(outputs[0].content).toContain('import { z } from \'zod\';');
    });

    it('should generate files with correct paths for single-file format', async () => {
      const singleFileConfig = { ...mockConfig.zod, format: 'single-file', path: './src/lib/validation.ts' };
      const generator = new ZodGenerator(mockSchema);
      const outputs = await generator.generateFiles([mockSchema], singleFileConfig);
      
      expect(outputs).toHaveLength(1);
      expect(outputs[0].path).toBe('./src/lib/validation.ts');
      expect(outputs[0].type).toBe('zod');
    });

    it('should generate correct validation schemas', () => {
      const generator = new ZodGenerator(mockSchema);
      const content = generator.generate();
      
      expect(content).toContain('usersCreateSchema');
      expect(content).toContain('usersUpdateSchema');
      expect(content).toContain('z.string().email()');
    });
  });

  describe('ModelGenerator', () => {
    it('should generate files with correct paths for per-schema format', async () => {
      const generator = new ModelGenerator(mockSchema);
      const outputs = await generator.generateFiles([mockSchema], {
        ...mockConfig.model,
        drizzle: mockConfig.drizzle,
        zod: mockConfig.zod
      });
      
      expect(outputs).toHaveLength(1);
      expect(outputs[0].path).toBe('./src/lib/models/users.model.ts');
      expect(outputs[0].type).toBe('model');
      expect(outputs[0].content).toContain('export class UsersModel extends Model');
    });

    it('should generate files with correct paths for single-file format', async () => {
      const singleFileConfig = {
        ...mockConfig.model,
        format: 'single-file',
        path: './src/lib/models.ts',
        drizzle: mockConfig.drizzle,
        zod: mockConfig.zod
      };
      const generator = new ModelGenerator(mockSchema);
      const outputs = await generator.generateFiles([mockSchema], singleFileConfig);
      
      expect(outputs).toHaveLength(1);
      expect(outputs[0].path).toBe('./src/lib/models.ts');
      expect(outputs[0].type).toBe('model');
    });

    it('should generate correct imports with path resolution', () => {
      const generator = new ModelGenerator(mockSchema, {
        ...mockConfig.model,
        drizzle: mockConfig.drizzle,
        zod: mockConfig.zod
      });
      const content = generator.generate();
      
      expect(content).toContain('import { Model } from \'$pkg\'');
      expect(content).toContain('import { users }');
      expect(content).toContain('usersCreateSchema');
      expect(content).toContain('usersUpdateSchema');
    });

    it('should generate correct fillable and hidden arrays', () => {
      const generator = new ModelGenerator(mockSchema);
      const content = generator.generate();
      
      expect(content).toContain('static fillable = [\'name\', \'email\']'); // password should be excluded
      expect(content).toContain('static hidden = [\'password\']'); // password should be hidden
    });
  });

  describe('Path Resolution Integration', () => {
    it('should resolve relative paths correctly between different output locations', async () => {
      const modelGenerator = new ModelGenerator(mockSchema, {
        ...mockConfig.model,
        drizzle: mockConfig.drizzle,
        zod: mockConfig.zod
      });
      
      const outputs = await modelGenerator.generateFiles([mockSchema], {
        ...mockConfig.model,
        drizzle: mockConfig.drizzle,
        zod: mockConfig.zod
      });
      
      const content = outputs[0].content;
      
      // Check that imports use correct paths (with $pkg placeholder in development)
      expect(content).toMatch(/import.*Model.*from ['"]\$pkg['"]/);
      expect(content).toMatch(/import.*from ['"]\.\.\/db\/server\/schema['"]/);
      expect(content).toMatch(/import.*from ['"]\.\.\/validation\/users\.validation['"]/);
    });

    it('should handle different config combinations', async () => {
      const mixedConfig = {
        drizzle: { path: './src/server/db/schema.ts', format: 'single-file' },
        zod: { path: './src/validation.ts', format: 'single-file' },
        model: { path: './src/models', format: 'per-schema' }
      };

      const modelGenerator = new ModelGenerator(mockSchema, {
        ...mixedConfig.model,
        drizzle: mixedConfig.drizzle,
        zod: mixedConfig.zod
      });

      const outputs = await modelGenerator.generateFiles([mockSchema], {
        ...mixedConfig.model,
        drizzle: mixedConfig.drizzle,
        zod: mixedConfig.zod
      });

      expect(outputs).toHaveLength(1);
      expect(outputs[0].path).toBe('./src/models/users.model.ts');
      
      const content = outputs[0].content;
      expect(content).toMatch(/import.*Model.*from ['"]\$pkg['"]/);
      expect(content).toMatch(/import.*from ['"]\.\.\/server\/db\/schema['"]/);
      expect(content).toMatch(/import.*from ['"]\.\.\/validation['"]/);
    });
  });
});
