import { existsSync } from 'fs';
import { resolve } from 'path';
import { pathToFileURL } from 'url';
import { mkdirp, write_if_changed } from '../../utils/filesystem.js';
import { runtime_directory } from '../../utils';
import { getAuthTables } from 'better-auth/db';

/**
 * Generate Drizzle schema from Better Auth configuration
 * Extracted from Better Auth CLI for direct in-process schema generation
 */
export async function generateAuthSchema(
  projectRoot: string,
  outputPath: string,
  verbose: boolean = false
): Promise<void> {
  try {
    // Create temp folder if needed
    const tempDir = resolve(projectRoot, '.omni');
    if (!existsSync(tempDir)) mkdirp(tempDir);

    // Try to load auth config from generated config first
    const generatedConfigPath = resolve(projectRoot, runtime_directory, 'auth/__generated__/config.js');
    let authOptions: any;
    
    if (existsSync(generatedConfigPath)) {
      try {
        const configModule = await import(pathToFileURL(generatedConfigPath).href);
        authOptions = configModule.default;
        if (verbose) console.log('   📄 Using generated auth config');
      } catch (error) {
        if (verbose) console.log('   ⚠️  Failed to load generated config, using defaults');
        authOptions = getDefaultAuthOptions();
      }
    } else {
      if (verbose) console.log('   📄 Using default auth config');
      authOptions = getDefaultAuthOptions();
    }

    // Generate Drizzle schema from Better Auth config
    const schemaCode = await generateDrizzleSchemaCode(authOptions);
    
    // Write to output file
    write_if_changed(outputPath, schemaCode);

    if (!existsSync(outputPath)) {
      throw new Error('Failed to generate schema file');
    }

    if (verbose) console.log('   ✅ Schema generated successfully');
  } catch (error) {
    throw new Error(`Failed to generate auth schema: ${error}`);
  }
}

/**
 * Get default auth options when config is not available
 */
function getDefaultAuthOptions() {
  return {
    database: {
      type: 'pg'
    }
  };
}

/**
 * Generate complete Drizzle schema code from Better Auth options
 */
async function generateDrizzleSchemaCode(authOptions: any): Promise<string> {
  const tables = getAuthTables(authOptions);
  const databaseType = authOptions.database?.type || 'pg';

  // Generate imports
  let code = generateImports(databaseType, tables);

  // Generate table definitions
  for (const tableKey in tables) {
    const table = tables[tableKey];
    code += generateTableDefinition(table, databaseType, authOptions);
  }

  return code;
}

/**
 * Generate import statements based on database type and field types used
 * Matches Better Auth CLI's generateImport function
 */
function generateImports(databaseType: string, tables: any): string {
  const rootImports: string[] = [];
  const coreImports: string[] = [];
  let hasBigint = false;
  let hasJson = false;

  // Check what field types are used
  for (const table of Object.values(tables) as any[]) {
    for (const field of Object.values(table.fields) as any[]) {
      if (field.type === 'number' && field.fieldConfig?.mode === 'bigint') {
        hasBigint = true;
      }
      if (field.type === 'json') {
        hasJson = true;
      }
    }
  }

  // Add core imports based on database type
  coreImports.push(`${databaseType}Table`);
  
  // Text types
  if (databaseType === 'mysql') {
    coreImports.push('varchar, text');
  } else {
    coreImports.push('text');
  }

  // Bigint support
  if (hasBigint && databaseType !== 'sqlite') {
    coreImports.push('bigint');
  }

  // Timestamp and boolean (not for sqlite which uses integer mode)
  if (databaseType !== 'sqlite') {
    coreImports.push('timestamp, boolean');
  }

  // Integer types
  if (databaseType === 'sqlite') {
    coreImports.push('integer');
  } else if (databaseType === 'mysql') {
    coreImports.push('int, timestamp');
  } else if (databaseType === 'pg') {
    coreImports.push('integer');
  }

  // JSON support
  if (hasJson) {
    if (databaseType === 'pg') {
      coreImports.push('jsonb');
    } else if (databaseType === 'mysql') {
      coreImports.push('json');
    }
  }

  // Check if we need SQL for sqlite timestamps
  const hasSQLiteTimestamp = databaseType === 'sqlite' && Object.values(tables).some(
    (table: any) => Object.values(table.fields).some(
      (field: any) => field.type === 'date' && field.defaultValue && 
                      typeof field.defaultValue === 'function'
    )
  );

  if (hasSQLiteTimestamp) {
    rootImports.push('sql');
  }

  // Build import statement
  let importStatement = '';
  if (rootImports.length > 0) {
    importStatement += `import { ${rootImports.join(', ')} } from "drizzle-orm";\n`;
  }
  importStatement += `import { ${coreImports.filter(x => x.trim()).join(', ')} } from "drizzle-orm/${databaseType}-core";\n\n`;

  return importStatement;
}

/**
 * Generate a complete table definition with all fields
 */
function generateTableDefinition(table: any, databaseType: string, authOptions: any): string {
  const tableName = table.tableName || table.modelName;
  const fields: string[] = [];

  // ID field - special handling based on database type
  if (databaseType === 'mysql') {
    fields.push(`  id: varchar('id', { length: 36 }).primaryKey()`);
  } else {
    fields.push(`  id: text('id').primaryKey()`);
  }

  // Other fields
  for (const [fieldName, field] of Object.entries(table.fields) as [string, any][]) {
    const fieldDef = generateFieldDefinition(fieldName, field, databaseType);
    if (fieldDef) fields.push(`  ${fieldName}: ${fieldDef}`);
  }

  return `export const ${tableName} = ${databaseType}Table("${tableName}", {\n${fields.join(',\n')}\n});\n\n`;
}

/**
 * Generate a single field definition with appropriate type and modifiers
 * Matches Better Auth CLI's field generation logic
 */
function generateFieldDefinition(name: string, field: any, databaseType: string): string | null {
  let def = '';

  // Generate base type based on field type and database
  switch (field.type) {
    case 'string':
      if (databaseType === 'mysql' && (field.unique || field.references)) {
        def = `varchar('${name}', { length: ${field.unique ? 255 : 36} })`;
      } else {
        def = `text('${name}')`;
      }
      break;
      
    case 'boolean':
      if (databaseType === 'sqlite') {
        def = `integer('${name}', { mode: 'boolean' })`;
      } else {
        def = `boolean('${name}')`;
      }
      break;
      
    case 'number':
      const isBigint = field.fieldConfig?.mode === 'bigint';
      if (isBigint) {
        if (databaseType === 'sqlite') {
          def = `integer('${name}', { mode: 'number' })`;
        } else {
          def = `bigint('${name}', { mode: 'number' })`;
        }
      } else {
        if (databaseType === 'pg') {
          def = `integer('${name}')`;
        } else if (databaseType === 'mysql') {
          def = `int('${name}')`;
        } else {
          def = `integer('${name}')`;
        }
      }
      break;
      
    case 'date':
      if (databaseType === 'sqlite') {
        def = `integer('${name}', { mode: 'timestamp_ms' })`;
      } else if (databaseType === 'mysql') {
        def = `timestamp('${name}', { fsp: 3, mode: 'date' })`;
      } else {
        def = `timestamp('${name}', { mode: 'date' })`;
      }
      break;
      
    case 'json':
      if (databaseType === 'pg') {
        def = `jsonb('${name}')`;
      } else if (databaseType === 'mysql') {
        def = `json('${name}')`;
      } else {
        def = `text('${name}', { mode: 'json' })`;
      }
      break;
      
    default:
      def = `text('${name}')`;
  }

  // Add modifiers
  if (field.required) def += '.notNull()';
  if (field.unique) def += '.unique()';
  
  // Add default value
  if (field.defaultValue !== undefined && field.defaultValue !== null) {
    if (field.type === 'date' && typeof field.defaultValue === 'function') {
      // Handle date default values
      if (databaseType === 'sqlite') {
        def += `.default(sql\`(cast(unixepoch('subsec') * 1000 as integer))\`)`;
      } else {
        def += '.defaultNow()';
      }
    } else if (typeof field.defaultValue === 'string') {
      def += `.default("${field.defaultValue}")`;
    } else if (typeof field.defaultValue === 'boolean') {
      def += `.default(${field.defaultValue})`;
    } else if (typeof field.defaultValue === 'number') {
      def += `.default(${field.defaultValue})`;
    }
  }

  // Add foreign key references
  if (field.references) {
    const refTable = field.references.model;
    const refField = field.references.field || 'id';
    const onDelete = field.references.onDelete || 'cascade';
    def += `.references(() => ${refTable}.${refField}, { onDelete: '${onDelete}' })`;
  }

  return def;
}
