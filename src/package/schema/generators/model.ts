import { Model } from '../../database/model';
import { hashPassword, generateSlug } from '../../utils'
import type { Schema, GeneratedOutput } from '../types';
import type { generateDrizzleSchema } from './drizzle';
import type { generateZodSchemas } from './zod';

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
  constructor(private schema: Schema, private outputConfig?: any) {}

  generate(): string {
    const imports = this.generateImports();
    const baseModel = this.generateBaseModel();
    const hooks = this.generateHooks();
    const computedProperties = this.generateComputedProperties();
    const modelClass = this.generateModelClass();

    return `${imports}\n\n${baseModel}\n\n${hooks}\n\n${computedProperties}\n\n${modelClass}`;
  }

  // New method for multiple schemas with output config
  async generateFiles(schemas: Schema[], outputConfig: any): Promise<GeneratedOutput[]> {
    const outputs: GeneratedOutput[] = [];
    
    if (outputConfig.format === 'single-file') {
      // Generate single file with all models
      const allModels = schemas.map(schema => {
        const generator = new ModelGenerator(schema, outputConfig);
        return generator.generate();
      }).join('\n\n');
      
      outputs.push({
        type: 'model',
        path: outputConfig.path,
        content: `// Auto-generated Model classes\n\n${allModels}`
      });
    } else {
      // Generate per-schema files
      for (const schema of schemas) {
        const generator = new ModelGenerator(schema, outputConfig);
        const content = generator.generate();
        const fileName = `${schema.name}.model.ts`;
        let filePath;
        
        if (outputConfig.path.endsWith('.ts')) {
          filePath = outputConfig.path.replace(/[^\/\\]+\.ts$/, fileName);
        } else {
          filePath = `${outputConfig.path}/${fileName}`;
        }
        
        outputs.push({
          type: 'model',
          path: filePath,
          content
        });
      }
    }
    
    return outputs;
  }

  private generateImports(): string {
    const schemaName = this.schema.name;
    const capitalizedName = this.capitalize(schemaName);
    
    // Calculate relative paths based on output configuration
    const modelPath = this.outputConfig?.path || './src/lib/models';
    const drizzlePath = './db/server/schema'; // Default Drizzle path
    const zodPath = `../validation/${schemaName}.validation`; // Default Zod path
    const packagePath = '../package/database/model'; // Default package path
    
    // Adjust paths based on where models are being generated
    let relativeDrizzlePath = drizzlePath;
    let relativeZodPath = zodPath;
    let relativePackagePath = packagePath;
    
    // If generating in a subdirectory, adjust paths
    if (modelPath.includes('/models')) {
      relativeDrizzlePath = '../db/server/schema';
      relativeZodPath = `../validation/${schemaName}.validation`;
      relativePackagePath = '../../package/database/model';
    } else if (modelPath.includes('/servermodels')) {
      relativeDrizzlePath = '../db/server/schema';
      relativeZodPath = `../validation/${schemaName}.validation`;
      relativePackagePath = '../../package/database/model';
    }
    
    // Import the base Model from the package
    const modelImport = `import { Model } from '${relativePackagePath}';`;
    
    // Import the table schema from drizzle
    const tableImport = `import { ${schemaName} } from '${relativeDrizzlePath}';`;
    
    // Import validation schemas
    const validationImport = `import { ${schemaName}CreateSchema, ${schemaName}UpdateSchema } from '${relativeZodPath}';`;
    
    // Import types with different names to avoid conflicts
    const typeImport = `import type { ${capitalizedName} as ${capitalizedName}Type, New${capitalizedName} as New${capitalizedName}Type } from '${relativeDrizzlePath}';`;

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
    
    return `
export class ${className} extends ${baseClass} {
  // Additional model methods and overrides can be added here
}

export default ${className};`;
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}