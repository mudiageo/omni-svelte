import { existsSync } from 'fs';
import { resolve } from 'path';
import { pathToFileURL } from 'url';
import type { Schema, FieldDefinition } from '../../schema/types';
import * as ts from 'typescript';
import { read, rimraf, mkdirp, write_if_changed } from '../../utils/filesystem.js';
import { runtime_directory } from '../../utils';
import { generateAuthSchema } from './schema-generator';

type FieldType = 'string' | 'integer' | 'boolean' | 'timestamp' | 'date' | 'json';

export interface AuthSyncOptions {
  autoMigrate?: boolean;
  migrationStrategy?: 'push' | 'migrate';
  verbose?: boolean;
  syncStrategy?: 'none' | 'separate' | 'integrated' | 'hybrid'; // How to sync auth schema
  userSchemaPath?: string; // Path from schema config
}

export interface AuthSyncResult {
  success: boolean;
  hasChanges: boolean;
  changes?: SchemaChanges;
  error?: string;
}

interface ParsedTable {
  name: string;
  varName: string;
  columns: Map<string, ParsedColumn>;
}

interface ParsedColumn {
  name: string;
  type: FieldType;
  nullable: boolean;
  primary: boolean;
  unique: boolean;
  default?: any;
}

interface SchemaChanges {
  hasChanges: boolean;
  newTables: string[];
  modifiedTables: string[];
  newColumns: Array<{ table: string; column: string }>;
}

export class AuthSchemaSync {
  private projectRoot: string;
  private tempSchemaPath: string;
  private tempDir: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.tempSchemaPath = resolve(projectRoot, '.omni/auth-schema.ts');
    this.tempDir = resolve(projectRoot, '.omni');
  }



  async sync(existingSchemas: Schema[], options: AuthSyncOptions = {}): Promise<AuthSyncResult> {
    const verbose = options.verbose !== false;

    if (verbose) console.log('\n🔐 Syncing auth schemas...');

    try {
      if (verbose) console.log('   📋 Generating auth schema...');
      await generateAuthSchema(this.projectRoot, this.tempSchemaPath, verbose);

      if (verbose) console.log('   🔍 Parsing schema...');
      const authTables = await this.parseSchema();

      if (verbose) console.log('   🔄 Detecting changes...');
      const changes = this.detectChanges(existingSchemas, authTables);

      if (!changes.hasChanges) {
        if (verbose) console.log('   ✅ No changes needed\n');
        await this.cleanup();
        return { success: true, hasChanges: false };
      }

      if (verbose) console.log('   📝 Updating schemas...');
      this.mergeSchemas(existingSchemas, authTables, changes);

      // Apply schema sync strategy
      const strategy = options.syncStrategy || 'none';
      
      if (strategy !== 'none' && options.userSchemaPath) {
        switch (strategy) {
          case 'hybrid':
            // User table in user schema, other tables separate
            if (verbose) console.log('   📄 Updating user table in user schema...');
            await this.updateUserSchemaFile(authTables, changes, options);
            if (verbose) console.log('   📦 Generating auth tables file...');
            await this.generateAuthTablesFile(authTables, options, false); // exclude user
            break;
            
          case 'separate':
            // All auth tables in separate file
            if (verbose) console.log('   📦 Generating auth tables file...');
            await this.generateAuthTablesFile(authTables, options, true); // include user
            break;
            
          case 'integrated':
            // All auth tables in user schema
            if (verbose) console.log('   � Adding all auth tables to user schema...');
            await this.addAllTablesToUserSchema(authTables, options);
            break;
        }
      }

      if (options.autoMigrate !== false) {
        if (verbose) console.log('   🗄️  Running database migration...');
        await this.runMigration(options.migrationStrategy || 'push', verbose);
      }

      await this.cleanup();

      if (verbose) {
        console.log('   ✅ Sync complete!');
        this.logChanges(changes);
      }

      return { success: true, hasChanges: true, changes };
    } catch (error) {
      await this.cleanup();
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('   ❌ Sync failed:', errorMsg);
      return { success: false, hasChanges: false, error: errorMsg };
    }
  }

  private async parseSchema(): Promise<Map<string, ParsedTable>> {
    const schemaContent = read(this.tempSchemaPath);
    const tables = new Map<string, ParsedTable>();

    const sourceFile = ts.createSourceFile('schema.ts', schemaContent, ts.ScriptTarget.Latest, true);

    const visit = (node: ts.Node) => {
      if (
        ts.isVariableStatement(node) &&
        node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)
      ) {
        const declaration = node.declarationList.declarations[0];
        
        if (
          ts.isVariableDeclaration(declaration) &&
          declaration.initializer &&
          ts.isCallExpression(declaration.initializer)
        ) {
          const callExpr = declaration.initializer;
          const funcName = callExpr.expression.getText(sourceFile);
          
          if (funcName.includes('Table')) {
            const varName = declaration.name.getText(sourceFile);
            const parsedTable = this.parseTable(callExpr, sourceFile);
            
            if (parsedTable) {
              tables.set(parsedTable.name, { ...parsedTable, varName });
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return tables;
  }

  private parseTable(callExpr: ts.CallExpression, sourceFile: ts.SourceFile): ParsedTable | null {
    const args = callExpr.arguments;
    if (args.length < 2) return null;

    const tableName = this.extractString(args[0]);
    if (!tableName) return null;

    const columns = new Map<string, ParsedColumn>();
    const columnsObj = args[1];

    if (ts.isObjectLiteralExpression(columnsObj)) {
      for (const prop of columnsObj.properties) {
        if (ts.isPropertyAssignment(prop)) {
          const columnName = prop.name.getText(sourceFile);
          const columnDef = this.parseColumn(prop.initializer, sourceFile);
          if (columnDef) columns.set(columnName, columnDef);
        }
      }
    }

    return { name: tableName, varName: '', columns };
  }

  private parseColumn(expr: ts.Expression, sourceFile: ts.SourceFile): ParsedColumn | null {
    const text = expr.getText(sourceFile);
    
    let type: FieldType = 'string';
    let nullable = true;
    let primary = false;
    let unique = false;
    let defaultValue: any = undefined;

    if (text.includes('text(') || text.includes('varchar(')) type = 'string';
    else if (text.includes('integer(') || text.includes('int(')) type = 'integer';
    else if (text.includes('boolean(')) type = 'boolean';
    else if (text.includes('timestamp(')) type = 'timestamp';
    else if (text.includes('date(')) type = 'date';
    else if (text.includes('json(') || text.includes('jsonb(')) type = 'json';

    if (text.includes('.notNull()')) nullable = false;
    if (text.includes('.primaryKey()')) primary = true;
    if (text.includes('.unique()')) unique = true;
    
    const defaultMatch = text.match(/\.default\(([^)]+)\)/);
    if (defaultMatch) {
      const defaultStr = defaultMatch[1];
      if (defaultStr === 'true') defaultValue = true;
      else if (defaultStr === 'false') defaultValue = false;
      else if (!isNaN(Number(defaultStr))) defaultValue = Number(defaultStr);
      else defaultValue = defaultStr.replace(/['"]/g, '');
    }

    return { name: '', type, nullable, primary, unique, default: defaultValue };
  }

  private detectChanges(existing: Schema[], auth: Map<string, ParsedTable>): SchemaChanges {
    const changes: SchemaChanges = {
      hasChanges: false,
      newTables: [],
      modifiedTables: [],
      newColumns: [],
    };

    for (const [tableName, table] of auth) {
      const existingSchema = existing.find(s => s.name === tableName);

      if (!existingSchema) {
        changes.newTables.push(tableName);
        changes.hasChanges = true;
      } else {
        for (const [columnName] of table.columns) {
          if (!existingSchema.fields[columnName]) {
            changes.newColumns.push({ table: tableName, column: columnName });
            changes.hasChanges = true;
            if (!changes.modifiedTables.includes(tableName)) {
              changes.modifiedTables.push(tableName);
            }
          }
        }
      }
    }

    return changes;
  }

  private mergeSchemas(existing: Schema[], auth: Map<string, ParsedTable>, changes: SchemaChanges): void {
    for (const tableName of changes.newTables) {
      const table = auth.get(tableName);
      if (table) existing.push(this.convertToSchema(table));
    }

    for (const tableName of changes.modifiedTables) {
      const existingSchema = existing.find(s => s.name === tableName);
      const authTable = auth.get(tableName);

      if (existingSchema && authTable) {
        for (const [columnName, column] of authTable.columns) {
          if (!existingSchema.fields[columnName]) {
            existingSchema.fields[columnName] = {
              type: column.type,
              required: !column.nullable,
              primary: column.primary,
              unique: column.unique,
              default: column.default,
            };
          }
        }

        existingSchema.metadata = {
          ...existingSchema.metadata,
          hasAuthFields: true,
          lastAuthSync: new Date().toISOString(),
        };
      }
    }
  }

  private async runMigration(strategy: 'push' | 'migrate', verbose: boolean): Promise<void> {
    try {
      const modulePath = resolve(this.projectRoot, 'node_modules/drizzle-kit/api.mjs');
      
      if (!existsSync(modulePath)) {
        if (verbose) console.log('   ⚠️  Drizzle Kit not found, skipping migration');
        return;
      }

      const drizzleKit = await import(pathToFileURL(modulePath).href);
      
      if (strategy === 'push') {
        await drizzleKit.push({ cwd: this.projectRoot });
      } else {
        await drizzleKit.generate({ cwd: this.projectRoot });
        await drizzleKit.migrate({ cwd: this.projectRoot });
      }
    } catch (error) {
      console.warn('   ⚠️  Could not auto-run migration. Run manually with drizzle-kit');
    }
  }

  private convertToSchema(table: ParsedTable): Schema {
    const fields: Record<string, FieldDefinition> = {};

    for (const [columnName, column] of table.columns) {
      fields[columnName] = {
        type: column.type,
        required: !column.nullable,
        primary: column.primary,
        unique: column.unique,
        default: column.default,
      };
    }

    return {
      name: table.name,
      fields,
      config: { timestamps: false, fillable: 'auto', hidden: 'auto' },
      metadata: { generatedBy: 'auth', isAuthTable: true, managedBy: 'auth-cli' },
    };
  }

  private extractString(node: ts.Node): string | null {
    return ts.isStringLiteral(node) ? node.text : null;
  }

  private logChanges(changes: SchemaChanges): void {
    if (changes.newTables.length > 0) {
      console.log(`   📦 New tables: ${changes.newTables.join(', ')}`);
    }
    if (changes.modifiedTables.length > 0) {
      console.log(`   📝 Modified tables: ${changes.modifiedTables.join(', ')}`);
    }
    if (changes.newColumns.length > 0) {
      console.log(`   ➕ New columns: ${changes.newColumns.length}`);
    }
    console.log('');
  }

  /**
   * Update user's schema file with changes to the user table
   * Always marks auth fields
   */
  private async updateUserSchemaFile(
    authTables: Map<string, ParsedTable>,
    changes: SchemaChanges,
    options: AuthSyncOptions
  ): Promise<void> {
    const userTable = authTables.get('user');
    if (!userTable || !options.userSchemaPath) return;

    const schemaPath = resolve(this.projectRoot, options.userSchemaPath);
    if (!existsSync(schemaPath)) {
      console.warn(`   ⚠️  User schema file not found at ${options.userSchemaPath}`);
      return;
    }

    let schemaContent = read(schemaPath);

    // Find user table definition
    const userTableMatch = schemaContent.match(/export\s+const\s+user[s]?\s*=\s*pgTable\s*\(\s*['"]user[s]?['"]\s*,\s*\{([^}]+)\}/s);
    
    if (!userTableMatch) {
      console.warn('   ⚠️  Could not find user table definition in schema');
      return;
    }

    // Add new auth fields to user table
    let fieldsToAdd: string[] = [];
    
    for (const [fieldName, column] of userTable.columns) {
      // Skip if field already exists
      if (schemaContent.includes(`${fieldName}:`)) continue;

      const fieldDef = this.generateDrizzleField(fieldName, column, 'pg');
      // Always mark auth-managed fields
      const comment = `  // 🔐 Auth-managed field - do not modify manually\n`;
      fieldsToAdd.push(`${comment}  ${fieldName}: ${fieldDef}`);
    }

    if (fieldsToAdd.length === 0) return;

    // Insert fields before the closing brace of the user table
    const insertIndex = userTableMatch.index! + userTableMatch[0].length - 1;
    const updatedContent = 
      schemaContent.slice(0, insertIndex) +
      ',\n' + fieldsToAdd.join(',\n') + '\n' +
      schemaContent.slice(insertIndex);

    write_if_changed(schemaPath, updatedContent);
  }

  /**
   * Generate standalone file with auth tables
   * @param includeUser - Whether to include the user table
   */
  private async generateAuthTablesFile(
    authTables: Map<string, ParsedTable>,
    options: AuthSyncOptions,
    includeUser: boolean = false
  ): Promise<void> {
    const authSchemaPath = resolve(this.projectRoot, '.omni/auth-schema.ts');
    
    let code = `// 🔐 Better Auth Tables - Auto-generated, do not edit manually\n`;
    code += `// Generated on: ${new Date().toISOString()}\n\n`;
    code += `import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";\n\n`;

    // Generate tables
    for (const [tableName, table] of authTables) {
      if (tableName === 'user' && !includeUser) continue; // Skip user table if not needed
      
      code += `export const ${table.varName} = pgTable("${tableName}", {\n`;
      
      const fields: string[] = [];
      for (const [fieldName, column] of table.columns) {
        const fieldDef = this.generateDrizzleField(fieldName, column, 'pg');
        fields.push(`  ${fieldName}: ${fieldDef}`);
      }
      
      code += fields.join(',\n');
      code += `\n});\n\n`;
    }

    mkdirp(this.tempDir);
    write_if_changed(authSchemaPath, code);
  }

  /**
   * Add all auth tables (including user) to user's schema file
   */
  private async addAllTablesToUserSchema(
    authTables: Map<string, ParsedTable>,
    options: AuthSyncOptions
  ): Promise<void> {
    if (!options.userSchemaPath) return;

    const schemaPath = resolve(this.projectRoot, options.userSchemaPath);
    if (!existsSync(schemaPath)) {
      console.warn(`   ⚠️  User schema file not found at ${options.userSchemaPath}`);
      return;
    }

    let schemaContent = read(schemaPath);

    // Add auth tables that don't exist
    let tablesToAdd: string[] = [];

    for (const [tableName, table] of authTables) {
      // Check if table already exists
      if (schemaContent.includes(`export const ${table.varName}`)) continue;

      let tableCode = `\n// 🔐 Auth-managed table - do not modify manually\n`;
      tableCode += `export const ${table.varName} = pgTable("${tableName}", {\n`;
      
      const fields: string[] = [];
      for (const [fieldName, column] of table.columns) {
        const fieldDef = this.generateDrizzleField(fieldName, column, 'pg');
        fields.push(`  ${fieldName}: ${fieldDef}`);
      }
      
      tableCode += fields.join(',\n');
      tableCode += `\n});\n`;
      
      tablesToAdd.push(tableCode);
    }

    if (tablesToAdd.length === 0) return;

    // Append tables at the end of the file
    const updatedContent = schemaContent + '\n' + tablesToAdd.join('\n');
    write_if_changed(schemaPath, updatedContent);
  }

  /**
   * Generate Drizzle field definition from parsed column
   */
  private generateDrizzleField(name: string, column: ParsedColumn, databaseType: string): string {
    let def = '';

    switch (column.type) {
      case 'string':
        def = `text('${name}')`;
        break;
      case 'boolean':
        def = `boolean('${name}')`;
        break;
      case 'integer':
        def = `integer('${name}')`;
        break;
      case 'timestamp':
      case 'date':
        def = `timestamp('${name}')`;
        break;
      case 'json':
        def = databaseType === 'pg' ? `jsonb('${name}')` : `json('${name}')`;
        break;
      default:
        def = `text('${name}')`;
    }

    if (column.primary) def += '.primaryKey()';
    if (!column.nullable) def += '.notNull()';
    if (column.unique) def += '.unique()';
    
    if (column.default !== undefined && column.default !== null) {
      if (typeof column.default === 'string') {
        def += `.default("${column.default}")`;
      } else if (typeof column.default === 'boolean' || typeof column.default === 'number') {
        def += `.default(${column.default})`;
      }
    }

    return def;
  }

  private async cleanup(): Promise<void> {
    try {
      // if (existsSync(this.tempSchemaPath)) rimraf(this.tempSchemaPath);
    } catch {}
  }
}

export async function syncAuthSchemas(
  schemas: Schema[],
  projectRoot: string,
  options?: AuthSyncOptions
): Promise<AuthSyncResult> {
  const sync = new AuthSchemaSync(projectRoot);
  return sync.sync(schemas, options);
}
