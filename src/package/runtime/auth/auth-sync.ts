import { existsSync } from 'fs';
import { resolve } from 'path';
import { pathToFileURL } from 'url';
import type { Schema, FieldDefinition, SchemaConfig } from '../../schema/types';
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
      
      if (strategy !== 'none') {
        switch (strategy) {
          case 'hybrid':
            // User table in user schema, other tables separate
            if (verbose) console.log('   📄 Updating user table in user schema...');
            await this.updateUserOmniSchema(authTables, existingSchemas);
            if (verbose) console.log('   📦 Generating auth tables file...');
            await this.generateAuthOmniSchemaFile(authTables, existingSchemas, false); // exclude user
            break;
            
          case 'separate':
            // All auth tables in separate file
            if (verbose) console.log('   📦 Generating auth tables file...');
            await this.generateAuthOmniSchemaFile(authTables, existingSchemas, true); // include user
            break;
            
          case 'integrated':
            // All auth tables in user schema
            if (verbose) console.log('   📝 Adding all auth tables to user schema...');
            await this.addAllTablesToUserOmniSchema(authTables, existingSchemas);
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
              isAuthField: true, // Mark all auth-managed fields
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
        isAuthField: true, // Mark all auth-managed fields
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
   * Update user's Omni schema file with changes to the user table
   * Always marks auth fields with isAuthField: true
   * Auto-detects whether user table is singular or plural from existing schemas
   */
  private async updateUserOmniSchema(
    authTables: Map<string, ParsedTable>,
    existingSchemas: Schema[]
  ): Promise<void> {
    const userTable = authTables.get('user');
    if (!userTable) return;

    // Find user schema file from discovered schemas
    const { path: userSchemaPath, tableName: userTableName } = this.findUserSchemaFile(existingSchemas);
    if (!userSchemaPath || !existsSync(userSchemaPath)) {
      console.warn(`   ⚠️  User schema file not found`);
      return;
    }

    let schemaContent = read(userSchemaPath);

    // Find the defineSchema call
    const schemaMatch = schemaContent.match(new RegExp(`defineSchema\\s*\\(\\s*['"]${userTableName}['"]\\s*,\\s*\\{`));
    
    if (!schemaMatch) {
      console.warn('   ⚠️  Could not find defineSchema call for user table');
      return;
    }

    // Find the fields object
    const fieldsStartIndex = schemaMatch.index! + schemaMatch[0].length;
    let braceCount = 1;
    let fieldsEndIndex = fieldsStartIndex;
    
    for (let i = fieldsStartIndex; i < schemaContent.length && braceCount > 0; i++) {
      if (schemaContent[i] === '{') braceCount++;
      if (schemaContent[i] === '}') braceCount--;
      fieldsEndIndex = i;
    }

    // Add new auth fields
    let fieldsToAdd: string[] = [];
    
    for (const [fieldName, column] of userTable.columns) {
      // Skip if field already exists
      if (schemaContent.includes(`${fieldName}:`)) continue;

      const fieldDef = this.generateOmniField(fieldName, column);
      fieldsToAdd.push(fieldDef);
    }

    if (fieldsToAdd.length === 0) return;

    // Check if we need to add a comma before new fields
    const contentBeforeClosing = schemaContent.slice(0, fieldsEndIndex).trimEnd();
    const needsComma = !contentBeforeClosing.endsWith(',');
    
    // Insert fields before the closing brace
    const separator = needsComma ? ',\n' : '\n';
    const updatedContent = 
      schemaContent.slice(0, fieldsEndIndex) +
      separator + fieldsToAdd.join(',\n') + '\n' +
      schemaContent.slice(fieldsEndIndex);

    write_if_changed(userSchemaPath, updatedContent);
  }

  /**
   * Generate standalone Omni schema file with auth tables
   * @param includeUser - Whether to include the user table
   */
  private async generateAuthOmniSchemaFile(
    authTables: Map<string, ParsedTable>,
    existingSchemas: Schema[],
    includeUser: boolean = false
  ): Promise<void> {
    const authSchemaPath = this.getAuthSchemaPath();
    
    let code = `// 🔐 Better Auth Tables - Auto-generated by auth sync\n`;
    code += `// Generated on: ${new Date().toISOString()}\n`;
    code += `// DO NOT EDIT MANUALLY - Changes will be overwritten\n\n`;
    code += `import { defineSchema } from '$pkg/schema';\n\n`;

    // Generate schemas for each table
    for (const [tableName, table] of authTables) {
      if (tableName === 'user' && !includeUser) continue;
      
      code += `// 🔐 Auth-managed schema\n`;
      code += `export const ${tableName}Schema = defineSchema('${tableName}', {\n`;
      
      const fields: string[] = [];
      for (const [fieldName, column] of table.columns) {
        const fieldDef = this.generateOmniField(fieldName, column);
        fields.push(fieldDef);
      }
      
      code += fields.join(',\n');
      code += `\n}, {\n`;
      code += `  timestamps: false,\n`;
      code += `  fillable: 'auto',\n`;
      code += `  hidden: 'auto'\n`;
      code += `});\n\n`;
    }

    mkdirp(this.tempDir);
    write_if_changed(authSchemaPath, code);
  }

  /**
   * Add all auth tables (including user) to user's Omni schema file
   */
  private async addAllTablesToUserOmniSchema(
    authTables: Map<string, ParsedTable>,
    existingSchemas: Schema[]
  ): Promise<void> {
    const { path: userSchemaPath } = this.findUserSchemaFile(existingSchemas);
    if (!userSchemaPath || !existsSync(userSchemaPath)) {
      console.warn(`   ⚠️  User schema file not found`);
      return;
    }

    let schemaContent = read(userSchemaPath);

    // Add auth tables that don't exist
    let tablesToAdd: string[] = [];

    for (const [tableName, table] of authTables) {
      // Check if schema already exists
      if (schemaContent.includes(`defineSchema('${tableName}'`)) continue;

      let tableCode = `\n// 🔐 Auth-managed schema - do not modify manually\n`;
      tableCode += `export const ${tableName}Schema = defineSchema('${tableName}', {\n`;
      
      const fields: string[] = [];
      for (const [fieldName, column] of table.columns) {
        const fieldDef = this.generateOmniField(fieldName, column);
        fields.push(fieldDef);
      }
      
      tableCode += fields.join(',\n');
      tableCode += `\n}, {\n`;
      tableCode += `  timestamps: false,\n`;
      tableCode += `  fillable: 'auto',\n`;
      tableCode += `  hidden: 'auto'\n`;
      tableCode += `});\n`;
      
      tablesToAdd.push(tableCode);
    }

    if (tablesToAdd.length === 0) return;

    // Append schemas at the end of the file
    const updatedContent = schemaContent + '\n' + tablesToAdd.join('\n');
    write_if_changed(userSchemaPath, updatedContent);
  }

  /**
   * Generate Omni field definition from parsed column
   * Marks all fields with isAuthField: true
   */
  private generateOmniField(name: string, column: ParsedColumn): string {
    let fieldType = this.mapDrizzleTypeToOmni(column.type);
    
    let field = `  // 🔐 Auth-managed field\n`;
    field += `  ${name}: {\n`;
    field += `    type: '${fieldType}',\n`;
    field += `    isAuthField: true,\n`;
    
    if (column.primary) field += `    primary: true,\n`;
    if (!column.nullable) field += `    required: true,\n`;
    if (column.unique) field += `    unique: true,\n`;
    
    if (column.default !== undefined && column.default !== null) {
      if (typeof column.default === 'string') {
        field += `    default: "${column.default}",\n`;
      } else {
        field += `    default: ${column.default},\n`;
      }
    }

    field += `  }`;
    return field;
  }

  /**
   * Map Drizzle/Postgres types to Omni field types
   */
  private mapDrizzleTypeToOmni(type: FieldType): string {
    switch (type) {
      case 'string': return 'string';
      case 'integer': return 'integer';
      case 'boolean': return 'boolean';
      case 'timestamp': return 'timestamp';
      case 'date': return 'date';
      case 'json': return 'json';
      default: return 'string';
    }
  }

  /**
   * Find the user schema file from discovered schemas
   * Auto-detects whether user table is singular or plural
   */
  private findUserSchemaFile(existingSchemas: Schema[]): { path: string | null; tableName: string } {
    // Try to find from discovered schemas (checks both 'user' and 'users')
    const userSchema = existingSchemas.find(schema => 
      schema.name === 'user' || schema.name === 'users'
    );
    
    if (userSchema && userSchema.filePath) {
      return {
        path: resolve(this.projectRoot, userSchema.filePath),
        tableName: userSchema.name
      };
    }
    
    // Fallback: check common paths
    const possiblePaths = [
      { path: resolve(this.projectRoot, 'src/lib/users.schema.ts'), name: 'users' },
      { path: resolve(this.projectRoot, 'src/lib/user.schema.ts'), name: 'user' },
      { path: resolve(this.projectRoot, 'src/lib/schema/users.schema.ts'), name: 'users' },
      { path: resolve(this.projectRoot, 'src/lib/schema/user.schema.ts'), name: 'user' },
    ];

    for (const { path, name } of possiblePaths) {
      if (existsSync(path)) {
        return { path, tableName: name };
      }
    }

    return { path: null, tableName: 'user' }; // Default to 'user' if not found
  }

  /**
   * Get path for auth schema file
   * Always saved to .omni directory for now (can be enhanced later)
   */
  private getAuthSchemaPath(): string {
    return resolve(this.projectRoot, '.omni/auth.schema.ts');
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
