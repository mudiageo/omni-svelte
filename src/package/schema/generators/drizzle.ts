import { pgTable, serial, varchar, integer, boolean, timestamp, json, pgEnum } from 'drizzle-orm/pg-core';
import type { Schema, FieldDefinition } from '../types';

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
      column = varchar(fieldName, { length: field.length || 255 });
      break;
    case 'integer':
    case 'money':
      column = integer(fieldName);
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