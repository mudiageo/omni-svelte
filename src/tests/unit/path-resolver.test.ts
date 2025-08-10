import { describe, it, expect, beforeEach } from 'vitest';
import { PathResolver } from '../../package/schema/utils/path-resolver';
import path from 'path';

describe('PathResolver', () => {
  let pathResolver: PathResolver;
  
  const mockConfig = {
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

  beforeEach(() => {
    pathResolver = new PathResolver(mockConfig);
  });

  describe('constructor', () => {
    it('should initialize with config', () => {
      expect(pathResolver).toBeDefined();
    });

    it('should handle empty config', () => {
      const emptyResolver = new PathResolver({});
      expect(emptyResolver).toBeDefined();
    });
  });

  describe('getOutputPath', () => {
    it('should generate correct drizzle single-file path', () => {
      const result = pathResolver.getOutputPath('drizzle', 'users');
      expect(result).toBe('./src/lib/db/server/schema.ts');
    });

    it('should generate correct zod per-schema path', () => {
      const result = pathResolver.getOutputPath('zod', 'users');
      expect(result).toBe('./src/lib/validation/users.validation.ts');
    });

    it('should generate correct model per-schema path', () => {
      const result = pathResolver.getOutputPath('model', 'users');
      expect(result).toBe('./src/lib/models/users.model.ts');
    });

    it('should handle single-file format for zod', () => {
      const singleFileConfig = {
        ...mockConfig,
        zod: { path: './src/lib/validation.ts', format: 'single-file' }
      };
      const resolver = new PathResolver(singleFileConfig);
      const result = resolver.getOutputPath('zod', 'users');
      expect(result).toBe('./src/lib/validation.ts');
    });

    it('should handle single-file format for models', () => {
      const singleFileConfig = {
        ...mockConfig,
        model: { path: './src/lib/models.ts', format: 'single-file' }
      };
      const resolver = new PathResolver(singleFileConfig);
      const result = resolver.getOutputPath('model', 'users');
      expect(result).toBe('./src/lib/models.ts');
    });
  });

  describe('getRelativePath', () => {
    it('should calculate correct relative path between files', () => {
      const from = './src/lib/models/users.model.ts';
      const to = './src/lib/db/server/schema.ts';
      const result = pathResolver.getRelativePath(from, to);
      expect(result).toBe('../db/server/schema.ts');
    });

    it('should handle same directory paths', () => {
      const from = './src/lib/validation/users.validation.ts';
      const to = './src/lib/validation/posts.validation.ts';
      const result = pathResolver.getRelativePath(from, to);
      expect(result).toBe('./posts.validation.ts');
    });

    it('should handle upward navigation', () => {
      const from = './src/lib/models/users.model.ts';
      const to = './src/lib/validation/users.validation.ts';
      const result = pathResolver.getRelativePath(from, to);
      expect(result).toBe('../validation/users.validation.ts');
    });
  });

  describe('toImportPath', () => {
    it('should convert relative path to import path', () => {
      const result = pathResolver.toImportPath('../db/server/schema.ts');
      expect(result).toBe('../db/server/schema');
    });

    it('should remove .ts extension', () => {
      const result = pathResolver.toImportPath('./validation/users.validation.ts');
      expect(result).toBe('./validation/users.validation');
    });

    it('should handle paths without extension', () => {
      const result = pathResolver.toImportPath('./some/path');
      expect(result).toBe('./some/path');
    });

    it('should handle absolute paths', () => {
      const result = pathResolver.toImportPath('/absolute/path/file.ts');
      expect(result).toBe('/absolute/path/file');
    });
  });

  describe('resolveModelImports', () => {
    it('should resolve imports for per-schema model', () => {
      const modelPath = './src/lib/models/users.model.ts';
      const result = pathResolver.resolveModelImports(modelPath, 'users');
      
      expect(result.modelBase).toBe('$pkg/database/model');
      expect(result.drizzle).toBe('../db/server/schema');
      expect(result.zod).toBe('../validation/users.validation');
    });

    it('should resolve imports for single-file model', () => {
      const singleFileConfig = {
        ...mockConfig,
        model: { path: './src/lib/models.ts', format: 'single-file' },
        zod: { path: './src/lib/validation.ts', format: 'single-file' }
      };
      const resolver = new PathResolver(singleFileConfig);
      const modelPath = './src/lib/models.ts';
      const result = resolver.resolveModelImports(modelPath, 'users');
      
      expect(result.modelBase).toBe('$pkg/database/model');
      expect(result.drizzle).toBe('./db/server/schema');
      expect(result.zod).toBe('./validation');
    });
  });

  describe('resolveZodImports', () => {
    it('should resolve imports for per-schema zod validation', () => {
      const zodPath = './src/lib/validation/users.validation.ts';
      const result = pathResolver.resolveZodImports(zodPath, 'users');
      
      expect(result.drizzle).toBe('../db/server/schema');
    });

    it('should resolve imports for single-file zod validation', () => {
      const singleFileConfig = {
        ...mockConfig,
        zod: { path: './src/lib/validation.ts', format: 'single-file' }
      };
      const resolver = new PathResolver(singleFileConfig);
      const zodPath = './src/lib/validation.ts';
      const result = resolver.resolveZodImports(zodPath, 'users');
      
      expect(result.drizzle).toBe('./db/server/schema');
    });
  });

  describe('edge cases', () => {
    it('should handle missing config sections gracefully', () => {
      const partialConfig = {
        drizzle: { path: './src/lib/schema.ts', format: 'single-file' }
      };
      const resolver = new PathResolver(partialConfig);
      
      // Should not throw and should return reasonable defaults
      expect(() => {
        resolver.getOutputPath('zod', 'users');
        resolver.getOutputPath('model', 'users');
      }).not.toThrow();
    });

    it('should handle Windows-style paths', () => {
      const windowsConfig = {
        drizzle: { path: '.\\src\\lib\\db\\server\\schema.ts', format: 'single-file' },
        zod: { path: '.\\src\\lib\\validation', format: 'per-schema' }
      };
      const resolver = new PathResolver(windowsConfig);
      
      const result = resolver.getOutputPath('zod', 'users');
      // Should normalize to forward slashes
      expect(result).toMatch(/validation[\/\\]users\.validation\.ts$/);
    });

    it('should handle complex nested paths', () => {
      const complexConfig = {
        drizzle: { path: './src/app/server/database/schemas/drizzle.ts', format: 'single-file' },
        model: { path: './src/app/models', format: 'per-schema' }
      };
      const resolver = new PathResolver(complexConfig);
      
      const modelPath = './src/app/models/users.model.ts';
      const result = resolver.resolveModelImports(modelPath, 'users');
      
      expect(result.drizzle).toBe('../server/database/schemas/drizzle');
    });
  });
});
