import { generateDrizzleSchema } from './generators/drizzle';
import { generateZodSchemas } from './generators/zod';
import { generateModel } from './generators/model';
import type { Schema, FieldDefinition, SchemaDefinitionConfig, GeneratedSchema } from './types';

export function defineSchema(
  name: string,
  fields: Record<string, FieldDefinition>,
  config: SchemaDefinitionConfig = {}
): GeneratedSchema {
  const schema: Schema = {
    name,
    fields: processFields(fields, config),
    config: processConfig(config)
  };

  // Auto-generate components
  const drizzleSchema = generateDrizzleSchema(schema);
  const zodSchemas = generateZodSchemas(schema);
  const model = generateModel(schema, drizzleSchema, zodSchemas);

  // Register schema globally for CLI and hot reload
  // registerSchema(schema);

  return {
    ...schema,
    drizzle: drizzleSchema,
    zod: zodSchemas,
    model
  };
}

function processFields(fields: Record<string, FieldDefinition>, config: SchemaDefinitionConfig): Record<string, FieldDefinition> {
  const processedFields = { ...fields };

  // Add timestamps if enabled
  if (config.timestamps) {
    processedFields.created_at = {
      type: 'timestamp',
      default: 'now()',
      required: true
    };
    processedFields.updated_at = {
      type: 'timestamp',
      default: 'now()',
      required: true
    };
  }

  // Add soft deletes if enabled
  if (config.softDeletes) {
    processedFields.deleted_at = {
      type: 'timestamp',
      optional: true
    };
  }

  return processedFields;
}

function processConfig(config: SchemaDefinitionConfig): SchemaDefinitionConfig {
  return {
    timestamps: config.timestamps ?? false,
    softDeletes: config.softDeletes ?? false,
    indexes: config.indexes ?? [],
    fillable: config.fillable ?? 'auto',
    hidden: config.hidden ?? 'auto',
    validation: config.validation ?? {},
    realtime: config.realtime ?? { enabled: false }
  };
}