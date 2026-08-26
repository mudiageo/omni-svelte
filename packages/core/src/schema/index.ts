import { generateDrizzleSchema } from './generators/drizzle.js';
import { generateZodSchemas } from './generators/zod.js';
import { generateModel } from './generators/model.js';
import type { Schema, FieldDefinition, SchemaDefinitionConfig, GeneratedSchema } from './types.js';

export { SchemaParser } from './parser.js';
export { DrizzleGenerator } from './generators/drizzle.js';
export { ZodGenerator } from './generators/zod.js';
export { ModelGenerator } from './generators/model.js';
export { field } from './field.js';
export { relation } from './relation.js';

export function defineSchema(
	name: string,
	definitions: Record<string, any>,
	config: SchemaDefinitionConfig = {}
): GeneratedSchema {
	const rawFields: Record<string, FieldDefinition> = {};
	const relations: Record<string, any> = {};

	for (const [key, def] of Object.entries(definitions)) {
		if (def && typeof def === 'object' && 'kind' in def) {
			relations[key] = def;
		} else {
			// If it's a FieldBuilder instance, extract the underlying definition
			rawFields[key] = typeof def.build === 'function' ? def.build() : def;
		}
	}

	const schema: Schema = {
		name,
		fields: processFields(rawFields, config),
		relations,
		config: processConfig(config)
	};

	// Auto-generate components
	const drizzleSchema = generateDrizzleSchema(schema);
	const zodSchemas = generateZodSchemas(schema);
	const model = generateModel(schema, drizzleSchema, zodSchemas);

	return {
		...schema,
		drizzle: drizzleSchema,
		zod: zodSchemas,
		model
	};
}

function processFields(
	fields: Record<string, FieldDefinition>,
	config: SchemaDefinitionConfig
): Record<string, FieldDefinition> {
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
