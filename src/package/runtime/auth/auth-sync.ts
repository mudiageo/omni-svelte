import { existsSync } from 'fs';
import { resolve } from 'path';
import { pathToFileURL } from 'url';
import type { Schema, FieldDefinition } from '../../schema/types';
import * as ts from 'typescript';
import { read, rimraf, mkdirp } from '../../utils/filesystem.js';
import { runtime_directory } from '../../utils';
import { generateAuthSchema } from './schema-generator';

type FieldType = 'string' | 'integer' | 'boolean' | 'timestamp' | 'date' | 'json';

export interface AuthSyncOptions {
  autoMigrate?: boolean;
  migrationStrategy?: 'push' | 'migrate';
  verbose?: boolean;
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
    this.tempSchemaPath = resolve(projectRoot, '.omni/temp-auth-schema.ts');
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

  private async cleanup(): Promise<void> {
    try {
      if (existsSync(this.tempSchemaPath)) rimraf(this.tempSchemaPath);
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
