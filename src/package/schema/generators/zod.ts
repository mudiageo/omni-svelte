import { z } from 'zod';
import type { Schema, FieldDefinition, GeneratedOutput } from '../types';
import { PathResolver } from '../utils/path-resolver';

export function generateZodSchemas(schema: Schema) {
  const createSchema = generateCreateSchema(schema);
  const updateSchema = generateUpdateSchema(schema, createSchema);

  return {
    create: createSchema,
    update: updateSchema,
    base: createSchema
  };
}

function generateCreateSchema(schema: Schema) {
  const shape: Record<string, z.ZodTypeAny> = {};

  Object.entries(schema.fields).forEach(([fieldName, field]) => {
    if (field.computed) return; // Skip computed fields
    if (field.isAuthField) return; // Skip auth-managed fields - validation handled by auth system

    const zodField = generateZodField(field);
    if (zodField) {
      shape[fieldName] = zodField;
    }
  });

  return z.object(shape);
}

function generateUpdateSchema(schema: Schema, createSchema: z.ZodObject<any>) {
  // Base update schema as partial of create schema
  let updateShape: z.ZodTypeAny = createSchema.partial();

  // Remove fields that shouldn't be updated
  const excludeFromUpdate = ['id', 'created_at'];
  if (schema.config.timestamps) {
    excludeFromUpdate.push('updated_at');
  }

  // Apply onUpdate validation rules
  if (schema.config.validation?.onUpdate) {
    const requiredFields = schema.config.validation.onUpdate;
    const shape: Record<string, z.ZodTypeAny> = {};

    Object.entries(schema.fields).forEach(([fieldName, field]) => {
      if (excludeFromUpdate.includes(fieldName) || field.computed) return;
      if (field.isAuthField) return; // Skip auth-managed fields - validation handled by auth system

      const zodField = generateZodField(field);
      if (zodField) {
        shape[fieldName] = requiredFields.includes(fieldName) ? zodField : zodField.optional();
      }
    });

    updateShape = z.object(shape);
  }

  return updateShape;
}

function generateZodField(field: FieldDefinition): z.ZodTypeAny | null {
  let zodField: z.ZodTypeAny;

  switch (field.type) {
    case 'string':
    case 'slug':
      zodField = z.string();
      break;
    case 'email':
      zodField = z.email();
      break;
    case 'password':
      zodField = z.string();
      if (field.validation?.min) {
        zodField = (zodField as z.ZodString).min(field.validation.min as number);
      }
      if (field.validation?.requireUppercase) {
        zodField = (zodField as z.ZodString).regex(/[A-Z]/, 'Must contain uppercase letter');
      }
      if (field.validation?.requireNumbers) {
        zodField = (zodField as z.ZodString).regex(/\d/, 'Must contain number');
      }
      break;
    case 'url':
      zodField = z.string().url();
      break;
    case 'integer':
    case 'serial':
    case 'money':
      zodField = z.number().int();
      if (field.unsigned) {
        zodField = (zodField as z.ZodNumber).min(0);
      }
      break;
    case 'boolean':
      zodField = z.boolean();
      break;
    case 'date':
    case 'timestamp':
    case 'datetime':
      zodField = z.date();
      if (field.validation?.min) {
        const minDate = field.validation.min === 'today' ? new Date() : new Date(field.validation.min as string);
        zodField = (zodField as z.ZodDate).min(minDate);
      }
      if (field.validation?.max) {
        const maxDate = field.validation.max === 'today' ? new Date() : new Date(field.validation.max as string);
        zodField = (zodField as z.ZodDate).max(maxDate);
      }
      break;
    case 'json':
      zodField = z.object({});
      if (field.validation) {
        zodField = generateNestedValidation(field.validation);
      }
      break;
    case 'enum':
      if (field.values) {
        zodField = z.enum(field.values as [string, ...string[]]);
      } else {
        zodField = z.string();
      }
      break;
    case 'array':
      zodField = z.array(z.any());
      break;
    case 'files':
      zodField = z.array(z.string().url());
      break;
    case 'richtext':
      zodField = z.string();
      break;
    default:
      zodField = z.string();
  }

  // Apply general validation rules
  if (field.validation?.min && ['string', 'email', 'password'].includes(field.type)) {
    zodField = (zodField as z.ZodString).min(field.validation.min as number, field.validation.message);
  }
  if (field.validation?.max && ['string', 'email', 'password'].includes(field.type)) {
    zodField = (zodField as z.ZodString).max(field.validation.max as number, field.validation.message);
  }

  // Handle optional fields
  if (field.optional || field.default !== undefined) {
    zodField = zodField.optional();
  }

  return zodField;
}

function generateNestedValidation(validation: any): z.ZodTypeAny {
  const shape: Record<string, z.ZodTypeAny> = {};

  Object.entries(validation).forEach(([key, value]) => {
    if (typeof value === 'string') {
      if (value.endsWith('?')) {
        const type = value.slice(0, -1);
        shape[key] = getZodTypeFromString(type).optional();
      } else {
        shape[key] = getZodTypeFromString(value);
      }
    } else if (typeof value === 'object' && value !== null && 'enum' in value) {
      shape[key] = z.enum((value as any).enum);
    }
  });

  return z.object(shape);
}

function getZodTypeFromString(type: string): z.ZodTypeAny {
  switch (type) {
    case 'string': return z.string();
    case 'number': return z.number();
    case 'boolean': return z.boolean();
    case 'date': return z.date();
    default: return z.string();
  }
}


export class ZodGenerator {
  constructor(private schema: Schema) {}

  generate(): string {
    const imports = this.generateImports();
    const createSchema = this.generateCreateSchema();
    const updateSchema = this.generateUpdateSchema();

    return `${imports}\n\n${createSchema}\n\n${updateSchema}`;
  }

  // New method for multiple schemas with output config
  async generateFiles(schemas: Schema[], outputConfig: any): Promise<GeneratedOutput[]> {
    const outputs: GeneratedOutput[] = [];
    
    const pathResolver = new PathResolver({
      drizzle: outputConfig.drizzle || { path: './src/lib/db/server/schema.ts', format: 'single-file' },
      zod: outputConfig,
      model: outputConfig.model || { path: './src/lib/models', format: 'per-schema' }
    });
    
    if (outputConfig.format === 'single-file') {
      // Generate single file with all validation schemas
      const allSchemas = schemas.map(schema => {
        const generator = new ZodGenerator(schema);
        const content = generator.generate();
        // Remove the import line since we'll add it once at the top
        return content.replace(/^import { z } from 'zod';\s*\n/m, '');
      }).join('\n\n');
      
      outputs.push({
        type: 'zod',
        path: outputConfig.path,
        content: `// Auto-generated Zod validation schemas\nimport { z } from 'zod';\n\n${allSchemas}`
      });
    } else {
      // Generate per-schema files
      for (const schema of schemas) {
        const generator = new ZodGenerator(schema);
        const content = generator.generate();
        const filePath = pathResolver.getOutputPath('zod', schema.name);
        
        outputs.push({
          type: 'zod',
          path: filePath,
          content
        });
      }
    }
    
    return outputs;
  }

  private generateImports(): string {
    return `import { z } from 'zod';`;
  }

  private generateCreateSchema(): string {
    const tableName = this.schema.name;
    const fields = Object.entries(this.schema.fields)
      .filter(([_, field]) => !field.get && !field.primary && !field.isAuthField)
      .map(([name, field]) => this.generateFieldValidation(name, field))
      .join(',\n  ');

    return `export const ${tableName}CreateSchema = z.object({
  ${fields}
});

export type ${this.capitalize(tableName)}Create = z.infer<typeof ${tableName}CreateSchema>;`;
  }

  private generateUpdateSchema(): string {
    const tableName = this.schema.name;
    const requiredFields = this.schema.config.validation?.onUpdate || [];
    
    const fields = Object.entries(this.schema.fields)
      .filter(([_, field]) => !field.get && !field.primary && !field.isAuthField)
      .map(([name, field]) => {
        const isRequired = requiredFields.includes(name);
        const validation = this.generateFieldValidation(name, field, !isRequired);
        return validation;
      })
      .join(',\n  ');

    return `export const ${tableName}UpdateSchema = z.object({
  ${fields}
});

export type ${this.capitalize(tableName)}Update = z.infer<typeof ${tableName}UpdateSchema>;`;
  }

  private generateFieldValidation(name: string, field: FieldDefinition, optional: boolean = false): string {
    let validation = '';

    switch (field.type) {
      case 'string':
      case 'slug':
        validation = 'z.string()';
        if (field.length) validation += `.max(${field.length})`;
        break;
      case 'email':
        validation = 'z.string().email()';
        break;
      case 'password':
        validation = 'z.string()';
        if (field.validation?.min) validation += `.min(${field.validation.min})`;
        if (field.validation?.requireUppercase) {
          validation += '.regex(/[A-Z]/, "Password must contain at least one uppercase letter")';
        }
        if (field.validation?.requireNumbers) {
          validation += '.regex(/[0-9]/, "Password must contain at least one number")';
        }
        break;
      case 'url':
        validation = 'z.string().url()';
        break;
      case 'integer':
      case 'serial':
        validation = 'z.number().int()';
        if (field.unsigned) validation += '.positive()';
        break;
      case 'boolean':
        validation = 'z.boolean()';
        break;
      case 'date':
      case 'timestamp':
      case 'datetime':
        validation = 'z.date()';
        break;
      case 'json':
        validation = 'z.record(z.any())';
        if (field.validation?.schema) {
          validation = field.validation.schema;
        }
        break;
      case 'money':
        validation = 'z.number().positive()';
        break;
      case 'richtext':
        validation = 'z.string()';
        break;
      case 'array':
        validation = 'z.array(z.any())';
        break;
      default:
        if (field.type.startsWith('enum:')) {
          const enumValues = field.type.split(':')[1].split(',');
          validation = `z.enum([${enumValues.map(v => `'${v}'`).join(', ')}])`;
        } else {
          validation = 'z.string()';
        }
    }

    // Add validation rules
    if (field.validation?.min && ['string', 'email', 'password'].includes(field.type)) {
      validation += `.min(${field.validation.min})`;
    }
    if (field.validation?.max && ['string', 'email', 'password'].includes(field.type)) {
      validation += `.max(${field.validation.max})`;
    }
    if (field.validation?.message) {
      validation += `.describe('${field.validation.message}')`;
    }

    // Handle optional fields
    if (optional || field.optional || field.default !== undefined) {
      validation += '.optional()';
    }

    return `${name}: ${validation}`;
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}