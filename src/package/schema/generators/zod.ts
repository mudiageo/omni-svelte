import { z } from 'zod';
import type { Schema, FieldDefinition } from '../types';

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
      zodField = z.string().email();
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
    } else if (typeof value === 'object' && value.enum) {
      shape[key] = z.enum(value.enum);
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
