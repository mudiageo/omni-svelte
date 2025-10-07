import { describe, it, expect } from 'vitest';
import { PathResolver } from '../../package/schema/utils/path-resolver';

describe('Path Resolution - Final Validation', () => {
  it('should correctly resolve paths for library usage with $pkg placeholder', () => {
    const config = {
      drizzle: { path: './src/lib/db/server/schema.ts', format: 'single-file' },
      zod: { path: './src/lib/validation', format: 'per-schema' },
      model: { path: './src/lib/models', format: 'per-schema' }
    };

    const resolver = new PathResolver(config);

    // Test Model base import - should use $pkg placeholder in development
    const modelImports = resolver.resolveModelImports('./src/lib/models/users.model.ts', 'users');
    expect(modelImports.modelBase).toBe('$pkg/database/model');
    expect(modelImports.drizzle).toBe('../db/server/schema');
    expect(modelImports.zod).toBe('../validation/users.validation');

    // Test output paths
    expect(resolver.getOutputPath('drizzle', 'users')).toBe('./src/lib/db/server/schema.ts');
    expect(resolver.getOutputPath('zod', 'users')).toBe('./src/lib/validation/users.validation.ts');
    expect(resolver.getOutputPath('model', 'users')).toBe('./src/lib/models/users.model.ts');
  });

  it('should handle single-file configurations correctly', () => {
    const config = {
      drizzle: { path: './src/lib/db/schema.ts', format: 'single-file' },
      zod: { path: './src/lib/validation.ts', format: 'single-file' },
      model: { path: './src/lib/models.ts', format: 'single-file' }
    };

    const resolver = new PathResolver(config);

    const modelImports = resolver.resolveModelImports('./src/lib/models.ts', 'users');
    expect(modelImports.modelBase).toBe('$pkg/database/model');
    expect(modelImports.drizzle).toBe('./db/schema');
    expect(modelImports.zod).toBe('./validation');

    // Test output paths for single-file
    expect(resolver.getOutputPath('drizzle')).toBe('./src/lib/db/schema.ts');
    expect(resolver.getOutputPath('zod')).toBe('./src/lib/validation.ts');
    expect(resolver.getOutputPath('model')).toBe('./src/lib/models.ts');
  });

  it('should handle mixed configurations correctly', () => {
    const config = {
      drizzle: { path: './src/lib/server/db/drizzle.ts', format: 'single-file' },
      zod: { path: './src/lib/validation.ts', format: 'single-file' },
      model: { path: './src/lib/models', format: 'per-schema' }
    };

    const resolver = new PathResolver(config);

    const modelImports = resolver.resolveModelImports('./src/lib/models/posts.model.ts', 'posts');
    expect(modelImports.modelBase).toBe('$pkg/database/model');
    expect(modelImports.drizzle).toBe('../server/db/drizzle');
    expect(modelImports.zod).toBe('../validation');
  });
});
