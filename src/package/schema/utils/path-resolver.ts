import path from 'path';

export interface PathConfig {
  drizzle?: {
    path: string;
    format: string;
  };
  zod?: {
    path: string;
    format: string;
  };
  model?: {
    path: string;
    format: string;
  };
}

export class PathResolver {
  constructor(private config: PathConfig) {}

  /**
   * Calculate relative path from one location to another
   */
  getRelativePath(from: string, to: string): string {
    const relativePath = path.relative(path.dirname(from), to);
    // Convert to forward slashes and ensure it starts with ./ for relative imports
    const normalized = relativePath.replace(/\\/g, '/');
    return normalized.startsWith('.') ? normalized : `./${normalized}`;
  }

  /**
   * Get the import path for Drizzle schema from model location
   */
  getDrizzleImportPath(modelPath: string): string {
    const drizzlePath = this.config.drizzle?.path || './src/lib/db/server/schema.ts';
    return this.getRelativePath(modelPath, drizzlePath);
  }

  /**
   * Get the import path for Zod validation from model location
   */
  getZodImportPath(modelPath: string, schemaName: string): string {
    const zodConfig = this.config.zod || { path: './src/lib/validation', format: 'per-schema' };
    
    if (zodConfig.format === 'single-file') {
      return this.getRelativePath(modelPath, zodConfig.path);
    } else {
      // Per-schema format: calculate path to validation directory + schema name
      const zodDir = zodConfig.path;
      const zodFile = path.posix.join(zodDir, `${schemaName}.validation.ts`);
      return this.getRelativePath(modelPath, zodFile);
    }
  }

  /**
   * Get the import path for the base Model class from model location
   */
  getModelBaseImportPath(modelPath: string): string {
    // Use $pkg placeholder that will be replaced during build/prepack
    return '$pkg/database/model';
  }

  /**
   * Resolve all import paths for a model file
   */
  resolveModelImports(modelPath: string, schemaName: string): {
    drizzle: string;
    zod: string;
    modelBase: string;
  } {
    return {
      drizzle: this.toImportPath(this.getDrizzleImportPath(modelPath)),
      zod: this.toImportPath(this.getZodImportPath(modelPath, schemaName)),
      modelBase: this.toImportPath(this.getModelBaseImportPath(modelPath))
    };
  }

  /**
   * Get the output path for a schema file
   */
  getOutputPath(type: 'drizzle' | 'zod' | 'model', schemaName?: string): string {
    const config = this.config[type];
    
    if (!config) {
      // Default fallbacks
      const defaults = {
        drizzle: './src/lib/db/server/schema.ts',
        zod: './src/lib/validation',
        model: './src/lib/models'
      };
      
      if (type === 'drizzle') {
        return defaults[type];
      } else {
        return schemaName 
          ? `./${path.posix.join(defaults[type].replace('./', ''), `${schemaName}.${type === 'model' ? 'model' : 'validation'}.ts`)}`
          : defaults[type];
      }
    }
    
    if (config.format === 'single-file') {
      return config.path;
    } else {
      // Per-schema format
      if (!schemaName) {
        throw new Error(`Schema name required for per-schema format`);
      }
      
      const dir = config.path;
      const fileName = type === 'model' 
        ? `${schemaName}.model.ts`
        : type === 'zod' 
          ? `${schemaName}.validation.ts`
          : `${schemaName}.schema.ts`;
      
      // Use posix paths for consistency and ensure starts with ./
      const fullPath = path.posix.join(dir, fileName);
      return fullPath.startsWith('./') ? fullPath : `./${fullPath}`;
    }
  }

  /**
   * Normalize path separators for the current platform
   */
  normalizePath(filePath: string): string {
    return filePath.replace(/[/\\]/g, path.sep);
  }

  /**
   * Convert absolute path to relative import path
   */
  toImportPath(relativePath: string): string {
    // Handle special $pkg placeholder - don't add ./ prefix or modify it
    if (relativePath.startsWith('$pkg')) {
      return relativePath;
    }
    
    // Convert backslashes to forward slashes for import statements
    let importPath = relativePath.replace(/\\/g, '/');
    
    // Remove .ts extension if present
    if (importPath.endsWith('.ts')) {
      importPath = importPath.slice(0, -3);
    }
    
    // Ensure it starts with ./ or ../ for relative imports
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
      importPath = `./${importPath}`;
    }
    
    return importPath;
  }

  /**
   * Resolve all import paths for a zod validation file
   */
  resolveZodImports(zodPath: string, schemaName: string): {
    drizzle: string;
  } {
    return {
      drizzle: this.toImportPath(this.getDrizzleImportPath(zodPath))
    };
  }
}
