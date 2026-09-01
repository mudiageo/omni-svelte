import {
	pgTable,
	serial,
	text,
	varchar,
	decimal,
	integer,
	boolean,
	timestamp,
	json,
	pgEnum,
	index,
	uniqueIndex
} from 'drizzle-orm/pg-core';
import type { Schema, FieldDefinition, GeneratedOutput } from '../types.js';
import { PathResolver } from '../utils/path-resolver.js';

export function generateDrizzleSchema(schema: Schema) {
	const columns: Record<string, any> = {};
	const enums: Record<string, any> = {};

	// Generate enums first
	Object.entries(schema.fields).forEach(([fieldName, field]) => {
		if (field.type === 'enum' && field.values) {
			enums[`${fieldName}Enum`] = pgEnum(
				`${schema.name}_${fieldName}`,
				field.values as [string, ...string[]]
			);
		}
	});

	// Generate columns
	Object.entries(schema.fields).forEach(([fieldName, field]) => {
		if (field.computed) return; // Skip computed fields

		columns[fieldName] = generateColumn(fieldName, field, enums, schema.name);
	});

	const table = pgTable(schema.name, columns);

	// Generate indexes
	const indexes = generateIndexes(schema, table);

	return {
		table,
		enums,
		indexes,
		columns
	};
}

function generateColumn(
	fieldName: string,
	field: FieldDefinition,
	enums: Record<string, any>,
	tableName: string
) {
	let column: any;

	switch (field.type) {
		case 'serial':
			column = serial(fieldName);
			break;
		case 'string':
		case 'email':
		case 'password':
		case 'url':
		case 'slug':
			column = text(fieldName);
			if (field.length) column = varchar(fieldName, { length: field.length });
			break;
		case 'integer':
			column = integer(fieldName);
			break;
		case 'money':
			column = decimal(fieldName, { precision: 10, scale: 2 });
			break;
		case 'boolean':
			column = boolean(fieldName);
			break;
		case 'date':
		case 'timestamp':
		case 'datetime':
			column = timestamp(fieldName);
			break;
		case 'json':
		case 'array':
		case 'richtext':
			column = json(fieldName);
			break;
		case 'enum':
			const enumName = `${fieldName}Enum`;
			column = enums[enumName](fieldName);
			break;
		case 'files':
			column = json(fieldName); // Store as JSON array
			break;
		case 'reference':
			// Default to integer for now as primary keys are 'serial' by default
			column = integer(fieldName);
			if (field.target) {
				column = column.references(() => field.target().drizzle.table.id);
			}
			break;
		default:
			column = varchar(fieldName, { length: 255 });
	}

	// Apply constraints
	if (field.primary) {
		column = column.primaryKey();
	}
	if (field.unique) {
		column = column.unique();
	}
	if (field.required && !field.primary) {
		column = column.notNull();
	}
	if (field.default !== undefined) {
		column = column.default(field.default);
	}

	return column;
}

function generateIndexes(schema: Schema, table: any) {
	const indexes: any[] = [];

	schema.config.indexes?.forEach((index) => {
		if (typeof index === 'string') {
			// Single column index
			indexes.push({ on: [table[index]] });
		} else if (Array.isArray(index)) {
			// Composite index
			indexes.push({ on: index.map((col) => table[col]) });
		} else {
			// Advanced index
			const columns = index.fields.map((field) => table[field]);
			indexes.push({ on: columns, type: index.type });
		}
	});

	return indexes;
}

//We could potentially generate the file
export class DrizzleGenerator {
	constructor(private schema: Schema, private databaseType: string = 'pg') {}

	generate(): string {
		const relationsBlock = this.generateRelations();
		
		let relativeImports = '';
		if (relationsBlock) {
			const targetTables = new Set<string>();
			for (const rel of Object.values(this.schema.relations || {})) {
				try {
					targetTables.add(rel.target().name);
				} catch (e) {}
			}
			targetTables.delete(this.schema.name); // don't import self
			
			if (targetTables.size > 0) {
				relativeImports = `// TODO: replace relative cross-schema imports with virtual module imports\n`;
				relativeImports += Array.from(targetTables).map(t => `import { ${t} } from './${t}';`).join('\n');
			}
			relativeImports += `\nimport { defineRelationsPart } from 'drizzle-orm';`;
		}

		return [
			this.generateImports(),
			relativeImports,
			this.generateTableDefinition(),
			relationsBlock,
			this.generateExports(),
		].filter(Boolean).join('\n\n');
	}

	/**
	 * Returns the `defineRelationsPart(...)` export block for this schema.
	 * Imports are NOT included here — callers (generateFiles) prepend them.
	 */
	generateRelations(): string {
		const internal = this.generateRelationsInternal();
		return internal
			? `export const ${this.schema.name}Relations = defineRelationsPart({ ${this.schema.name} }, (r) => ({\n  ${this.schema.name}: {\n${internal}\n  }\n}));`
			: '';
	}

	generateRelationsInternal(): string {
		if (!this.schema.relations || Object.keys(this.schema.relations).length === 0) {
			return '';
		}

		const tableName = this.schema.name;
		const lines: string[] = [];

		for (const [key, rel] of Object.entries(this.schema.relations)) {
			let targetTable = 'unknown';

			if (rel.kind === 'belongsTo') {
				try { targetTable = rel.target().name; } catch (_e) {}
				// FK sits on this table; convention: `${key}Id` unless overridden via `via`
				const localKey = rel.options?.via ?? `${key}Id`;
				lines.push(`    ${key}: r.one.${targetTable}({`);
				lines.push(`      from: r.${tableName}.${localKey},`);
				// TODO: dynamically look up target primary key instead of hardcoding .id
				lines.push(`      to: r.${targetTable}.id,`);
				lines.push(`    }),`);

			} else if (rel.kind === 'hasMany') {
				try { targetTable = rel.target().name; } catch (_e) {}
				// Drizzle infers FK direction from the corresponding belongsTo on the target
				lines.push(`    ${key}: r.many.${targetTable}(),`);

			} else if (rel.kind === 'hasOne') {
				try { targetTable = rel.target().name; } catch (_e) {}
				// FK sits on the target table; convention: `${tableName}Id`
				const fkOnTarget = rel.options?.via ?? `${tableName}Id`;
				lines.push(`    ${key}: r.one.${targetTable}({`);
				lines.push(`      from: r.${targetTable}.${fkOnTarget},`);
				// TODO: dynamically look up target primary key instead of hardcoding .id
				lines.push(`      to: r.${tableName}.id,`);
				lines.push(`    }),`);

			} else if (rel.kind === 'manyToMany') {
				let pivotTable = 'unknown';
				try { targetTable = rel.target().name; } catch (_e) {}
				try { pivotTable = rel.options?.through().name; } catch (_e) {}
				lines.push(`    ${key}: r.many.${targetTable}({`);
				lines.push(`      from: r.${tableName}.id.through(r.${pivotTable}.${tableName}Id),`);
				lines.push(`      to: r.${targetTable}.id.through(r.${pivotTable}.${targetTable}Id),`);
				lines.push(`    }),`);

			} else if (rel.kind === 'morphTo' || rel.kind === 'morphMany') {
				// Polymorphic relations are not yet supported in Drizzle 1.0 generation.
				// Define them manually using `defineRelations` in your schema file.
				lines.push(`    // TODO: ${key} (${rel.kind}) — polymorphic relations must be defined manually`);
			}
		}

		return lines.join('\n');
	}

	// New method for multiple schemas with output config
	async generateFiles(schemas: Schema[], outputConfig: any): Promise<GeneratedOutput[]> {
		const outputs: GeneratedOutput[] = [];

		const pathResolver = new PathResolver({
			drizzle: outputConfig,
			zod: outputConfig.zod || {
				path: './src/lib/validation',
				format: 'single-file'
			},
			model: outputConfig.model || {
				path: './src/lib/models',
				format: 'per-schema'
			}
		});

		if (outputConfig.format === 'single-file') {
			// Generate single file with all schemas
			const allImports = new Set<string>();
			const allSchemas: string[] = [];
			const allTypes: string[] = [];
			const allRelations: string[] = [];
			let hasRelations = false;

			// Collect all necessary pg-core imports and detect relations
			schemas.forEach((schema) => {
				const generator = new DrizzleGenerator(schema);
				const imports = generator.generateImports();
				const importMatch = imports.match(/import\s*\{\s*([^}]+)\s*\}/);
				if (importMatch) {
					importMatch[1].split(',').map((t) => t.trim()).forEach((type) => allImports.add(type));
				}
				if (schema.relations && Object.keys(schema.relations).length > 0) {
					hasRelations = true;
				}
			});

			// Generate content for each schema
			schemas.forEach((schema) => {
				const generator = new DrizzleGenerator(schema, outputConfig.databaseType);
				allSchemas.push(generator.generateTableDefinition());
				allTypes.push(generator.generateExports());
				const rel = generator.generateRelationsInternal();
				if (rel) allRelations.push(`  ${schema.name}: {\n${rel}\n  }`);
			});

			const dbType = outputConfig.databaseType || 'pg';
			const drizzleOrmImport = hasRelations
				? `\nimport { defineRelations } from 'omni-svelte/drizzle/${dbType}';`
				: '';

			const relationsBlock = hasRelations
				? `\nexport const schemaRelations = defineRelations({ ${schemas.map((s) => s.name).join(', ')} }, (r) => ({\n${allRelations.join(',\n')}\n}));\n`
				: '';

			const content = `// Auto-generated by omni-svelte

import { ${Array.from(allImports).join(', ')} } from 'omni-svelte/drizzle/${dbType}';${drizzleOrmImport}

${allSchemas.join('\n\n')}
${relationsBlock}
${allTypes.join('\n\n')}`;

			outputs.push({
				type: 'drizzle',
				path: outputConfig.path,
				content
			});
		} else {
			// Generate per-schema files
			for (const schema of schemas) {
				const generator = new DrizzleGenerator(schema, outputConfig.databaseType);
				const content = generator.generate();
				const filePath = pathResolver.getOutputPath('drizzle', schema.name);

				outputs.push({
					type: 'drizzle',
					path: filePath,
					content
				});
			}
		}

		return outputs;
	}

	private generateImports(): string {
		const types = new Set<string>();

		Object.values(this.schema.fields).forEach((field) => {
			switch (field.type) {
				case 'string':
				case 'email':
				case 'password':
				case 'url':
				case 'slug':
					types.add('text');
					if (field.length) types.add('varchar');
					break;
				case 'integer':
					types.add('integer');
					break;
				case 'reference':
					types.add('integer');
					break;
				case 'serial':
					types.add('serial');
					break;
				case 'boolean':
					types.add('boolean');
					break;
				case 'date':
				case 'timestamp':
				case 'datetime':
					types.add('timestamp');
					break;
				case 'json':
				case 'richtext':
				case 'array':
					types.add('json');
					break;
				case 'money':
					types.add('decimal');
					break;
				default:
					if (field.type.startsWith('enum:')) {
						types.add('pgEnum');
					}
			}
		});

		if (this.schema.config?.timestamps !== false) {
			types.add('timestamp');
		}

		types.add('pgTable');
		if (this.schema.config?.indexes?.length) {
			types.add('index');
			types.add('uniqueIndex');
		}

		return `import { ${Array.from(types).join(', ')} } from 'omni-svelte/drizzle/${this.databaseType}';`;
	}

	private generateTableDefinition(): string {
		const tableName = this.schema.name;
		const columns = Object.entries(this.schema.fields)
			.filter(([_, field]) => !field.get && !field.computed) // Exclude computed fields
			.map(([name, field]) => this.generateColumnDefinition(name, field))
			.join(',\n  ');

		let timestampColumns = '';
		if (this.schema.config?.timestamps !== false) {
			timestampColumns = `,
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()`;
		}

		if (this.schema.config?.softDeletes) {
			timestampColumns += `,
  deletedAt: timestamp('deleted_at')`;
		}

		let inlineIndexes = '';
		if (this.schema.config?.indexes?.length) {
			const indexDefs = this.schema.config.indexes.map((index) => {
				let indexFields: string[];
				let isUnique = false;

				if (typeof index === 'string') {
					indexFields = [index];
				} else if (Array.isArray(index)) {
					indexFields = index;
				} else {
					indexFields = index.fields;
					isUnique = index.unique === true;
				}

				const indexName = `${tableName}_${indexFields.join('_')}_idx`;
				const fields = indexFields.map((field) => `t.${field}`).join(', ');

				if (isUnique) {
					return `    uniqueIndex('${indexName}').on(${fields})`;
				} else {
					return `    index('${indexName}').on(${fields})`;
				}
			});

			inlineIndexes = `, (t) => [\n${indexDefs.join(',\n')}\n  ]`;
		}

		return `export const ${tableName} = pgTable('${tableName}', {
  ${columns}${timestampColumns}
}${inlineIndexes});`;
	}

	private generateColumnDefinition(name: string, field: FieldDefinition): string {
		let columnDef = '';

		switch (field.type) {
			case 'string':
			case 'email':
			case 'password':
			case 'url':
			case 'slug':
				columnDef = `text('${name}')`;
				if (field.length) columnDef = `varchar('${name}', { length: ${field.length} })`;
				break;
			case 'integer':
				columnDef = `integer('${name}')`;
				break;
			case 'serial':
				columnDef = `serial('${name}')`;
				break;
			case 'boolean':
				columnDef = `boolean('${name}')`;
				break;
			case 'date':
			case 'timestamp':
			case 'datetime':
				columnDef = `timestamp('${name}')`;
				break;
			case 'json':
			case 'richtext':
				columnDef = `text('${name}')`; // Store richtext as text
				break;
			case 'money':
				columnDef = `decimal('${name}', { precision: 10, scale: 2 })`;
				break;
			case 'reference':
				columnDef = `integer('${name}')`;
				if (field.target) {
					try {
						const targetSchema = field.target();
						columnDef += `.references(() => ${targetSchema.name}.id)`;
					} catch (e) {
						// fallback if thunk cannot be evaluated statically
						columnDef += `.references(() => /* targetSchema */ id)`;
					}
				}
				break;
			default:
				if (field.type.startsWith('enum:')) {
					const enumValues = field.type.split(':')[1].split(',');
					columnDef = `${name}Enum('${name}')`;
				} else {
					columnDef = `text('${name}')`;
				}
		}

		// Add constraints
		if (field.primary) columnDef += '.primaryKey()';
		if (field.required && !field.primary) columnDef += '.notNull()';
		if (field.unique) columnDef += '.unique()';
		if (field.default !== undefined) {
			const d = field.default;
			if (d === null) {
				columnDef += `.default(null)`;
			} else if (typeof d === 'object') {
				// Object/array default — store serialised JSON as a string
				columnDef += `.default('${JSON.stringify(d)}')`;
			} else if (typeof d === 'string') {
				// If the string already looks like serialised JSON, don't double-wrap it
				const trimmed = d.trim();
				const isJsonLiteral =
					(trimmed.startsWith('{') && trimmed.endsWith('}')) ||
					(trimmed.startsWith('[') && trimmed.endsWith(']'));
				if (isJsonLiteral) {
					columnDef += `.default('${trimmed}')`;
				} else {
					columnDef += `.default('${d}')`;
				}
			} else {
				// boolean / number — emit the raw value
				columnDef += `.default(${d})`;
			}
		}

		return `${name}: ${columnDef}`;
	}

	private generateExports(): string {
		return `export type ${this.capitalize(this.schema.name)} = typeof ${this.schema.name}.$inferSelect;\nexport type New${this.capitalize(this.schema.name)} = typeof ${this.schema.name}.$inferInsert;`;
	}

	private capitalize(str: string): string {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}
}
