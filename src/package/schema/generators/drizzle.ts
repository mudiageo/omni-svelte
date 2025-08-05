import { pgTable, serial, text, varchar, decimal, integer, boolean, timestamp, json, pgEnum, index, uniqueIndex } from 'drizzle-orm/pg-core';
import type { Schema, FieldDefinition, GeneratedOutput } from '../types';

export function generateDrizzleSchema(schema: Schema) {
  const columns: Record<string, any> = {};
  const enums: Record<string, any> = {};

  // Generate enums first
  Object.entries(schema.fields).forEach(([fieldName, field]) => {
    if (field.type === 'enum' && field.values) {
      enums[`${fieldName}Enum`] = pgEnum(`${schema.name}_${fieldName}`, field.values as [string, ...string[]]);
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

function generateColumn(fieldName: string, field: FieldDefinition, enums: Record<string, any>, tableName: string) {
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
      indexes.push({ on: index.map(col => table[col]) });
    } else {
      // Advanced index
      const columns = index.fields.map(field => table[field]);
      indexes.push({ on: columns, type: index.type });
    }
  });

  return indexes;
}

//We could potentially generate the file
export class DrizzleGenerator {
  constructor(private schema: Schema) {}

  generate(): string {
    const imports = this.generateImports();
    const tableDefinition = this.generateTableDefinition();
    const indexes = this.generateIndexes();
    const exports = this.generateExports();

    return `${imports}\n\n${tableDefinition}\n\n${indexes}\n\n${exports}`;
  }

  // New method for multiple schemas with output config
  async generateFiles(schemas: Schema[], outputConfig: any): Promise<GeneratedOutput[]> {
    const outputs: GeneratedOutput[] = [];
    
    if (outputConfig.format === 'single-file') {
      // Generate single file with all schemas
      const allImports = new Set<string>();
      const allSchemas: string[] = [];
      const allIndexes: string[] = [];
      const allTypes: string[] = [];
      
      // Collect all necessary imports
      schemas.forEach(schema => {
        const generator = new DrizzleGenerator(schema);
        const imports = generator.generateImports();
        // Extract types from import statement
        const importMatch = imports.match(/import\s*\{\s*([^}]+)\s*\}/);
        if (importMatch) {
          const types = importMatch[1].split(',').map(t => t.trim());
          types.forEach(type => allImports.add(type));
        }
      });
      
      // Generate content for each schema
      schemas.forEach(schema => {
        const generator = new DrizzleGenerator(schema);
        const tableDefinition = generator.generateTableDefinition();
        const indexes = generator.generateIndexes();
        const exports = generator.generateExports();
        
        allSchemas.push(tableDefinition);
        if (indexes) allIndexes.push(indexes);
        allTypes.push(exports);
      });
      
      const content = `// Auto-generated Drizzle schemas

import { ${Array.from(allImports).join(', ')} } from 'drizzle-orm/pg-core';

${allSchemas.join('\n\n')}

${allIndexes.filter(Boolean).join('\n\n')}

${allTypes.join('\n\n')}`;
      
      outputs.push({
        type: 'drizzle',
        path: outputConfig.path,
        content
      });
    } else {
      // Generate per-schema files
      for (const schema of schemas) {
        const generator = new DrizzleGenerator(schema);
        const content = generator.generate();
        const fileName = `${schema.name}.schema.ts`;
        let filePath;
        
        if (outputConfig.path.endsWith('.ts')) {
          filePath = outputConfig.path.replace(/[^\/\\]+\.ts$/, fileName);
        } else {
          filePath = `${outputConfig.path}/${fileName}`;
        }
        
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
    
    Object.values(this.schema.fields).forEach(field => {
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

    // Always include pgTable and index functions
    types.add('pgTable');
    if (this.schema.config?.indexes?.length) {
      types.add('index');
      types.add('uniqueIndex');
    }

    return `import { ${Array.from(types).join(', ')} } from 'drizzle-orm/pg-core';`;
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

    return `export const ${tableName} = pgTable('${tableName}', {
  ${columns}${timestampColumns}
});`;
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
        columnDef = `text('${name}')`;  // Store richtext as text
        break;
      case 'money':
        columnDef = `decimal('${name}', { precision: 10, scale: 2 })`;
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
      if (typeof field.default === 'string') {
        columnDef += `.default('${field.default}')`;
      } else {
        columnDef += `.default(${field.default})`;
      }
    }

    return `${name}: ${columnDef}`;
  }

  private generateIndexes(): string {
    if (!this.schema.config?.indexes?.length) return '';

    return this.schema.config.indexes.map(index => {
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
      
      const indexName = `${this.schema.name}_${indexFields.join('_')}_idx`;
      const fields = indexFields.map(field => `${this.schema.name}.${field}`).join(', ');
      
      if (isUnique) {
        return `export const ${indexName} = uniqueIndex('${indexName}').on(${fields});`;
      } else {
        return `export const ${indexName} = index('${indexName}').on(${fields});`;
      }
    }).join('\n');
  }

  private generateExports(): string {
    return `export type ${this.capitalize(this.schema.name)} = typeof ${this.schema.name}.$inferSelect;
export type New${this.capitalize(this.schema.name)} = typeof ${this.schema.name}.$inferInsert;`;
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}