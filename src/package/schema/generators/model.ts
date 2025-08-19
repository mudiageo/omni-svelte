import { Model } from '../../database/model';
import { hashPassword, generateSlug } from '../../utils'
import type { Schema, GeneratedOutput } from '../types';
import type { generateDrizzleSchema } from './drizzle';
import type { generateZodSchemas } from './zod';
import { PathResolver } from '../utils/path-resolver';

export function generateModel(schema: Schema, drizzleSchema: ReturnType<typeof generateDrizzleSchema>, zodSchemas: ReturnType<typeof generateZodSchemas>) {
  class GeneratedModel extends Model {
    static tableName = schema.name;
    static table = drizzleSchema.table;
    static validation = zodSchemas;
    static fillable = determineFillable(schema);
    static hidden = determineHidden(schema);
    static casts = determineCasts(schema);
    static hooks = generateHooks(schema);
    static realtime = schema.config.realtime;
    static timestamps = schema.config.timestamps !== false; // Default to true unless explicitly set to false

    constructor(attributes: any = {}) {
      super(attributes);
      this.addComputedProperties(schema);
    }

    private addComputedProperties(schema: Schema) {
      Object.entries(schema.fields).forEach(([fieldName, field]) => {
        if (field.computed && field.get) {
          Object.defineProperty(this, fieldName, {
            get: () => field.get!(this),
            enumerable: true,
            configurable: true
          });
        }
      });
    }

    // Auto-generated relationships would go here
    static relationships = generateRelationships(schema);
  }

  //Auto reister the model
  GeneratedModel.register(schema.name);
  return GeneratedModel;
}

function generateRelationships(schema: Schema): Record<string, any> {
  const relationships: Record<string, any> = {};

  Object.entries(schema.fields).forEach(([fieldName, field]) => {
    if (field.relationship) {
      const relation = field.relationship;
      relationships[fieldName] = {
        type: relation.type,
        model: relation.model,
        foreignKey: relation.foreignKey,
        localKey: relation.localKey
      };
    }
  });

  return relationships;
}


function determineFillable(schema: Schema): string[] {
  if (Array.isArray(schema.config.fillable)) {
    return schema.config.fillable;
  }

  // Auto-determine fillable fields
  const fillable: string[] = [];
  Object.entries(schema.fields).forEach(([fieldName, field]) => {
    if (!field.primary && !field.computed && fieldName !== 'created_at' && fieldName !== 'updated_at') {
      fillable.push(fieldName);
    }
  });

  return fillable;
}

function determineHidden(schema: Schema): string[] {
  if (Array.isArray(schema.config.hidden)) {
    return schema.config.hidden;
  }

  // Auto-determine hidden fields
  const hidden: string[] = [];
  Object.entries(schema.fields).forEach(([fieldName, field]) => {
    if (field.hidden || field.type === 'password') {
      hidden.push(fieldName);
    }
  });

  return hidden;
}

function determineCasts(schema: Schema): Record<string, "string" | "number" | "boolean" | "date" | "json"> {
  const casts: Record<string, "string" | "number" | "boolean" | "date" | "json"> = {};

  Object.entries(schema.fields).forEach(([fieldName, field]) => {
    switch (field.type) {
      case 'json':
      case 'array':
        casts[fieldName] = 'json';
        break;
      case 'date':
      case 'timestamp':
      case 'datetime':
        casts[fieldName] = 'date';
        break;
      case 'boolean':
        casts[fieldName] = 'boolean';
        break;
      case 'integer':
      case 'money':
        casts[fieldName] = 'number';
        break;
    }
  });

  return casts;
}

function generateHooks(schema: Schema): Record<string, Function[]> {
  const hooks: Record<string, Function[]> = {
    creating: [],
    updating: [],
    created: [],
    updated: []
  };

  Object.entries(schema.fields).forEach(([fieldName, field]) => {
    if (field.type === 'password' && field.hash) {
      const hashMethod = typeof field.hash === 'string' ? field.hash : 'bcrypt';
      hooks.creating.push(async (model: any) => {
        if (model[fieldName]) {
          model[fieldName] = await hashPassword(model[fieldName], hashMethod);
        }
      });
      hooks.updating.push(async (model: any) => {
        // if (model[fieldName] && model.isDirty(fieldName)) {
        if (model[fieldName] && model.isDirty) { // TODO: Currentlythis would always update the pasword even if its not changed w need to track which fielsds are dirty, i.e fields that have been changed and not yet daved)
          model[fieldName] = await hashPassword(model[fieldName], hashMethod);
        }
      });
    }

    if (field.type === 'slug') {
      hooks.creating.push((model: any) => {
        if (!model[fieldName] && model.name) {
          model[fieldName] = generateSlug(model.name);
        }
      });
    }
  });

  return hooks;
}


export class ModelGenerator {
  public pathResolver?: PathResolver;
  public outputConfig?: any;
  
  constructor(private schema: Schema, outputConfig?: any) {
    this.outputConfig = outputConfig;
    if (outputConfig) {
      this.pathResolver = new PathResolver({
        drizzle: outputConfig.drizzle || { path: './src/lib/db/server/schema.ts', format: 'single-file' },
        zod: outputConfig.zod || { path: './src/lib/validation', format: 'per-schema' },
        model: outputConfig.model || outputConfig
      });
    }
  }

  generate(): string {
    const imports = this.generateImports();
    const baseModel = this.generateBaseModel();
    const hooks = this.generateHooks();
    const computedProperties = this.generateComputedProperties();
    const modelClass = this.generateModelClass();

    return `${imports}\n\n${baseModel}\n\n${hooks}\n\n${computedProperties}\n\n${modelClass}`;
  }

  async generateFiles(schemas: Schema[], outputConfig: any): Promise<GeneratedOutput[]> {
    const outputs: GeneratedOutput[] = [];
    
    // Create path resolver with full output configuration - need to pass the full config structure
    const pathResolver = new PathResolver({
      drizzle: outputConfig.drizzle || { path: './src/lib/db/server/schema.ts', format: 'single-file' },
      zod: outputConfig.zod || { path: './src/lib/validation', format: 'per-schema' },
      model: outputConfig
    });
    
    if (outputConfig.format === 'single-file') {
      // Generate single file with all models and deduplicated imports
      const { imports, models } = this.generateCombinedModels(schemas, outputConfig)
      
      outputs.push({
        type: 'model',
        path: outputConfig.path,
        content: `// Auto-generated Model classes\n\n${imports}\n\n${models}`
      });
    } else {
      // Generate per-schema files
      for (const schema of schemas) {
        const generator = new ModelGenerator(schema, { 
          ...outputConfig, 
          drizzle: outputConfig.drizzle, 
          zod: outputConfig.zod 
        });
        // Use pathResolver for import generation
        generator.pathResolver = pathResolver;
        generator.outputConfig = outputConfig;
        const content = generator.generate();
        const filePath = pathResolver.getOutputPath('model', schema.name);
        
        outputs.push({
          type: 'model',
          path: filePath,
          content
        });
      }
    }
    
    return outputs;
  }
  // Generate combined models for single-file output
  private generateCombinedModels(schemas: Schema[], outputConfig: any): { imports: string, models: string } {
    const modelParts: string[] = []

    // Create path resolver with full output configuration
    const pathResolver = new PathResolver({
      drizzle: outputConfig.drizzle || { path: './src/lib/db/server/schema.ts', format: 'single-file' },
      zod: outputConfig.zod || { path: './src/lib/validation', format: 'per-schema' },
      model: outputConfig
    });
    
    // Collect all unique imports
    const drizzleImports = new Set<string>();
    const validationImports = new Map<string, Set<string>>(); // schema -> set of imports
    const typeImports = new Set<string>();

  
      
    for (const schema of schemas) {
      const schemaName = schema.name;
      const capitalizedName = this.capitalize(schemaName);
      
      // Collect drizzle table imports
      drizzleImports.add(schemaName);
      
      // Collect validation imports per schema
      if (!validationImports.has(schemaName)) {
        validationImports.set(schemaName, new Set());
      }
      validationImports.get(schemaName)!.add(`${schemaName}CreateSchema`);
      validationImports.get(schemaName)!.add(`${schemaName}UpdateSchema`);
      
      // Collect type imports
      typeImports.add(`${capitalizedName} as ${capitalizedName}Type`);
      typeImports.add(`New${capitalizedName} as New${capitalizedName}Type`);

      // Generate model parts (without imports)
      const generator = new ModelGenerator(schema, outputConfig);
      const baseModel = generator.generateBaseModel();
      const hooks = generator.generateHooks();
      const computedProperties = generator.generateComputedProperties();
      const modelClass = generator.generateModelClass();

      // Only add non-empty parts
      const parts = [baseModel, hooks, computedProperties, modelClass].filter(part => part.trim());
      modelParts.push(parts.join('\n\n'));
    };
    
      
    const consolidatedImports: string[] = [];

    // Base Model import
    consolidatedImports.push(`import { Model } from '${pathResolver.toImportPath(pathResolver.getModelBaseImportPath('model'))}';`);


      const modelPath = pathResolver.getOutputPath('model');


    // Drizzle table imports
    if (drizzleImports.size > 0) {
    const drizzleImportPath = pathResolver.getDrizzleImportPath(modelPath);
      consolidatedImports.push(`import { ${Array.from(drizzleImports).sort().join(', ')} } from '${pathResolver.toImportPath(drizzleImportPath)}';`);
    }
    
    // Validation imports (grouped by schema file). Consier adding hi in the schemas for loop above
    validationImports.forEach((imports, schemaName) => {
      if (imports.size > 0) {
          // Resolve Zod import path
        const zodImportPath = pathResolver.getZodImportPath(modelPath, schemaName);
        consolidatedImports.push(`import { ${Array.from(imports).sort().join(', ')} } from '${pathResolver.toImportPath(zodImportPath)}';`);
      }
    });
    
    // Type imports
    if (typeImports.size > 0) {
     consolidatedImports.push(`import type { ${Array.from(typeImports).sort().join(', ')} } from '${pathResolver.toImportPath(pathResolver.getDrizzleImportPath(modelPath))}';`);
    }


    return { 
      imports: consolidatedImports.join('\n'), 
      models: modelParts.join('\n\n') 
    };
  }

  private generateImports(): string {
    const schemaName = this.schema.name;
    const capitalizedName = this.capitalize(schemaName);
    
    if (this.pathResolver && this.outputConfig) {
      // Use path resolver for accurate path calculation
      const modelPath = this.pathResolver.getOutputPath('model', schemaName);
      const imports = this.pathResolver.resolveModelImports(modelPath, schemaName);
      
      return `import { Model } from '${this.pathResolver.toImportPath(imports.modelBase)}';
import { ${schemaName} } from '${this.pathResolver.toImportPath(imports.drizzle)}';
import { ${schemaName}CreateSchema, ${schemaName}UpdateSchema } from '${this.pathResolver.toImportPath(imports.zod)}';
import type { ${capitalizedName} as ${capitalizedName}Type, New${capitalizedName} as New${capitalizedName}Type } from '${this.pathResolver.toImportPath(imports.drizzle)}';`;
    }
    
    // Fallback to default paths if no path resolver
    const modelImport = `import { Model } from '$pkg';`;
    const tableImport = `import { ${schemaName} } from './db/server/schema';`;
    const validationImport = `import { ${schemaName}CreateSchema, ${schemaName}UpdateSchema } from './validation/${schemaName}.validation';`;
    const typeImport = `import type { ${capitalizedName} as ${capitalizedName}Type, New${capitalizedName} as New${capitalizedName}Type } from './db/server/schema';`;

    return `${modelImport}
${tableImport}
${validationImport}
${typeImport}`;
  }

  private generateBaseModel(): string {
    const tableName = this.schema.name;
    const className = this.capitalize(tableName);
    
    const fillable = this.generateFillableArray();
    const hidden = this.generateHiddenArray();
    const casts = this.generateCastsObject();

    return `export class ${className}Model extends Model {
  static tableName = '${tableName}';
  static table = ${tableName};
  static createSchema = ${tableName}CreateSchema;
  static updateSchema = ${tableName}UpdateSchema;
  
  static fillable = ${fillable};
  static hidden = ${hidden};
  static casts = ${casts};${this.generateRealtimeConfig()}
}`;
  }

  private generateFillableArray(): string {
    const config = this.schema.config?.fillable;
    if (Array.isArray(config)) {
      return JSON.stringify(config);
    }
    
    if (config === 'auto' || !config) {
      const fillableFields = Object.entries(this.schema.fields)
        .filter(([name, field]) => {
          // Exclude primary keys, computed fields, timestamps, and hidden fields
          return !field.primary && 
                 !field.get && 
                 !field.computed && 
                 !field.hidden &&
                 name !== 'created_at' && 
                 name !== 'updated_at' &&
                 name !== 'createdAt' &&
                 name !== 'updatedAt';
        })
        .map(([name, _]) => `'${name}'`);
      return `[${fillableFields.join(', ')}]`;
    }
    
    return JSON.stringify(config || []);
  }

  private generateHiddenArray(): string {
    const config = this.schema.config?.hidden;
    if (Array.isArray(config)) {
      return JSON.stringify(config);
    }
    
    if (config === 'auto' || !config) {
      const hiddenFields = Object.entries(this.schema.fields)
        .filter(([_, field]) => field.hidden || field.type === 'password')
        .map(([name, _]) => `'${name}'`);
      return `[${hiddenFields.join(', ')}]`;
    }
    
    return JSON.stringify(config || []);
  }

  private generateCastsObject(): string {
    const casts: string[] = [];
    
    Object.entries(this.schema.fields).forEach(([name, field]) => {
      switch (field.type) {
        case 'json':
          casts.push(`${name}: 'json' as const`);
          break;
        case 'date':
        case 'timestamp':
        case 'datetime':
          casts.push(`${name}: 'date' as const`);
          break;
        case 'money':
          casts.push(`${name}: 'decimal' as const`);
          break;
        case 'boolean':
          casts.push(`${name}: 'boolean' as const`);
          break;
      }
    });

    return `{ ${casts.join(', ')} }`;
  }

  private generateRealtimeConfig(): string {
    if (!this.schema.config?.realtime?.enabled) return '';

    const config = this.schema.config.realtime;
    const events = JSON.stringify(config.events || []);

    return `
  
  static realtimeConfig = {
    enabled: true,
    events: ${events},
    channels: () => [\`${this.schema.name}\`]
  };`;
  }

  private generateHooks(): string {
    const hooks: string[] = [];

    // Password hashing hook
    const passwordFields = Object.entries(this.schema.fields)
      .filter(([_, field]) => field.type === 'password' && field.hash)
      .map(([name, _]) => name);

    if (passwordFields.length > 0) {
      hooks.push(`
  protected static hooks = {
    creating: async (data: any) => {
      ${passwordFields.map(field => `
      if (data.${field}) {
        data.${field} = await this.hashPassword(data.${field});
      }`).join('')}
      return data;
    },
    updating: async (data: any) => {
      ${passwordFields.map(field => `
      if (data.${field}) {
        data.${field} = await this.hashPassword(data.${field});
      }`).join('')}
      return data;
    }
  };`);
    }

    return hooks.join('\n');
  }

  private generateComputedProperties(): string {
    const computed = Object.entries(this.schema.fields)
      .filter(([_, field]) => field.get)
      .map(([name, field]) => {
        return `  get ${name}(): string {
    ${field.get}
  }`;
      });

    if (computed.length === 0) return '';

    const className = this.capitalize(this.schema.name);
    return `
// Computed properties mixin
export class ${className}WithComputed extends ${className}Model {
${computed.join('\n\n')}
}`;
  }

  private generateModelClass(): string {
    const className = this.capitalize(this.schema.name);
    const hasComputed = Object.values(this.schema.fields).some(field => field.get);
    
    const baseClass = hasComputed ? `${className}WithComputed` : `${className}Model`;
    
    const modelClass = `
export class ${className} extends ${baseClass} {
  // Additional model methods and overrides can be added here
}`

return this.outputConfig?.format === 'single-file' ? modelClass : `${modelClass}\n\nexport default ${className};`;
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}