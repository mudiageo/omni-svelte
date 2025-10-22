import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { pathToFileURL } from 'url';
import type { Schema, FieldDefinition } from '../../schema/types';
import * as ts from 'typescript';
import { read, rimraf } from '../../utils/filesystem.js';

type FieldType = 'string' | 'integer' | 'boolean' | 'timestamp' | 'date' | 'json';
type ExecutionMode = 'import' | 'node' | 'bin' | 'package-manager';

export interface AuthSyncOptions {
  autoMigrate?: boolean;
  migrationStrategy?: 'push' | 'migrate';
  verbose?: boolean;
  executionMode?: ExecutionMode;
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
  private executionMode: ExecutionMode;

  constructor(projectRoot: string, executionMode: ExecutionMode = 'import') {
    this.projectRoot = projectRoot;
    this.tempSchemaPath = resolve(projectRoot, '.omni/temp-auth-schema.ts');
    this.executionMode = executionMode;
  }

  private findBetterAuthCli(): { module?: string, bin?: string, node?: string } {
    const result: { module?: string, bin?: string, node?: string } = {};
    
    const modulePath = resolve(this.projectRoot, 'node_modules/@better-auth/cli/dist/index.mjs');
    if (existsSync(modulePath)) {
      result.module = '@better-auth/cli';
      result.node = modulePath;
    }

    const binPaths = [
      'node_modules/.bin/cli',
      'node_modules/.bin/cli.cmd',
      'node_modules/.bin/cli.ps1'
    ];
    
    for (const binPath of binPaths) {
      const fullPath = resolve(this.projectRoot, binPath);
      if (existsSync(fullPath)) {
        result.bin = fullPath;
        break;
      }
    }

    return result;
  }

  private findDrizzleKit(): { module?: string, bin?: string, node?: string } {
    const result: { module?: string, bin?: string, node?: string } = {};
    
    const nodePath = resolve(this.projectRoot, 'node_modules/drizzle-kit/bin.cjs');
    if (existsSync(nodePath)) {
      result.node = nodePath;
    }

    const binPaths = [
      'node_modules/.bin/drizzle-kit',
      'node_modules/.bin/drizzle-kit.cmd',
      'node_modules/.bin/drizzle-kit.ps1'
    ];
    
    for (const binPath of binPaths) {
      const fullPath = resolve(this.projectRoot, binPath);
      if (existsSync(fullPath)) {
        result.bin = fullPath;
        break;
      }
    }

    return result;
  }

  private async runCommand(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: this.projectRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: process.platform === 'win32'
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => { stdout += data.toString(); });
      child.stderr?.on('data', (data) => { stderr += data.toString(); });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr || stdout}`));
        }
      });

      child.on('error', reject);

      setTimeout(() => {
        child.kill();
        reject(new Error('Command timed out after 30 seconds'));
      }, 30000);
    });
  }

  private detectPackageManager(): string {
    if (existsSync(resolve(this.projectRoot, 'pnpm-lock.yaml'))) return 'pnpm';
    if (existsSync(resolve(this.projectRoot, 'yarn.lock'))) return 'yarn';
    if (existsSync(resolve(this.projectRoot, 'bun.lockb'))) return 'bun';
    return 'npm';
  }

  async sync(existingSchemas: Schema[], options: AuthSyncOptions = {}): Promise<AuthSyncResult> {
    const verbose = options.verbose !== false;
    if (options.executionMode) this.executionMode = options.executionMode;

    if (verbose) console.log('\n🔐 Syncing auth schemas...');

    try {
      if (verbose) console.log('   📋 Generating auth schema...');
      await this.generateAuthSchema(verbose);

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

  private async generateAuthSchema(verbose: boolean = false): Promise<void> {
    try {
      const cli = this.findBetterAuthCli();
      
      switch (this.executionMode) {
        case 'import':
          if (cli.module) {
            if (verbose) console.log(`   [import mode] Importing from ${cli.module}`);
            await this.generateViaImport(cli.module);
          } else {
            if (verbose) console.log('   [import mode] Module not found, falling back to node mode');
            await this.generateViaNode(cli, verbose);
          }
          break;

        case 'node':
          await this.generateViaNode(cli, verbose);
          break;

        case 'bin':
          await this.generateViaBin(cli, verbose);
          break;

        case 'package-manager':
          await this.generateViaPackageManager(verbose);
          break;
      }

      if (!existsSync(this.tempSchemaPath)) {
        throw new Error('Better Auth CLI did not generate schema file');
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('timed out')) {
          throw new Error('Better Auth CLI timed out. Is it installed?');
        }
        if (error.message.includes('ENOENT') || error.message.includes('not found')) {
          throw new Error('Better Auth CLI not found. Run: npm install -D @better-auth/cli');
        }
      }
      throw new Error(`Failed to run Better Auth CLI: ${error}`);
    }
  }

  private async generateViaImport(moduleName: string): Promise<void> {
    const modulePath = resolve(this.projectRoot, 'node_modules', moduleName, 'dist/index.mjs');
    const module = await import(pathToFileURL(modulePath).href);
    
    await module.generateSchema({
      output: this.tempSchemaPath,
      cwd: this.projectRoot
    });
  }

  private async generateViaNode(cli: { node?: string, bin?: string }, verbose: boolean): Promise<void> {
    if (!cli.node) {
      if (verbose) console.log('   [node mode] Node path not found, falling back to bin mode');
      return this.generateViaBin(cli, verbose);
    }
    
    if (verbose) console.log(`   [node mode] Running: node ${cli.node}`);
    await this.runCommand(process.execPath, [cli.node, 'generate', '--output', this.tempSchemaPath]);
  }

  private async generateViaBin(cli: { bin?: string }, verbose: boolean): Promise<void> {
    if (!cli.bin) {
      if (verbose) console.log('   [bin mode] Bin not found, falling back to package manager');
      return this.generateViaPackageManager(verbose);
    }
    
    if (verbose) console.log(`   [bin mode] Running: ${cli.bin}`);
    await this.runCommand(cli.bin, ['generate', '--output', this.tempSchemaPath]);
  }

  private async generateViaPackageManager(verbose: boolean): Promise<void> {
    const pm = this.detectPackageManager();
    if (verbose) console.log(`   [package-manager mode] Using ${pm}`);
    
    const pmCommands = {
      npm: ['npx', '@better-auth/cli@latest'],
      pnpm: ['pnpm', 'exec', '@better-auth/cli'],
      yarn: ['yarn', '@better-auth/cli'],
      bun: ['bunx', '@better-auth/cli']
    };

    const [cmd, ...baseArgs] = pmCommands[pm as keyof typeof pmCommands];
    await this.runCommand(cmd, [...baseArgs, 'generate', '--output', this.tempSchemaPath]);
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
      const drizzle = this.findDrizzleKit();
      
      const commands = strategy === 'push' ? ['push'] : ['generate', 'migrate'];
      
      for (const cmd of commands) {
        switch (this.executionMode) {
          case 'import':
            if (verbose) console.log(`   [import mode] Running drizzle-kit ${cmd}`);
            await this.runDrizzleViaImport(cmd);
            break;

          case 'node':
            if (drizzle.node) {
              if (verbose) console.log(`   [node mode] Running: node ${drizzle.node} ${cmd}`);
              await this.runCommand(process.execPath, [drizzle.node, cmd]);
            } else {
              await this.runDrizzleViaBin(drizzle, cmd, verbose);
            }
            break;

          case 'bin':
            await this.runDrizzleViaBin(drizzle, cmd, verbose);
            break;

          case 'package-manager':
            await this.runDrizzleViaPackageManager(cmd, verbose);
            break;
        }
      }
    } catch (error) {
      console.warn('   ⚠️  Could not auto-run migration. Run manually with drizzle-kit');
    }
  }

  private async runDrizzleViaImport(command: string): Promise<void> {
    const modulePath = resolve(this.projectRoot, 'node_modules/drizzle-kit/api.mjs');
    if (existsSync(modulePath)) {
      const drizzleKit = await import(pathToFileURL(modulePath).href);
      
      if (command === 'push') {
        await drizzleKit.push({ cwd: this.projectRoot });
      } else if (command === 'generate') {
        await drizzleKit.generate({ cwd: this.projectRoot });
      } else if (command === 'migrate') {
        await drizzleKit.migrate({ cwd: this.projectRoot });
      }
    } else {
      throw new Error('Drizzle Kit API not found');
    }
  }

  private async runDrizzleViaBin(drizzle: { bin?: string }, command: string, verbose: boolean): Promise<void> {
    if (!drizzle.bin) {
      if (verbose) console.log('   [bin mode] Drizzle bin not found, falling back to package manager');
      return this.runDrizzleViaPackageManager(command, verbose);
    }
    
    if (verbose) console.log(`   [bin mode] Running: ${drizzle.bin} ${command}`);
    await this.runCommand(drizzle.bin, [command]);
  }

  private async runDrizzleViaPackageManager(command: string, verbose: boolean): Promise<void> {
    const pm = this.detectPackageManager();
    if (verbose) console.log(`   [package-manager mode] Using ${pm} for drizzle-kit ${command}`);
    
    const pmCommands = {
      npm: ['npx', 'drizzle-kit'],
      pnpm: ['pnpm', 'exec', 'drizzle-kit'],
      yarn: ['yarn', 'drizzle-kit'],
      bun: ['bunx', 'drizzle-kit']
    };

    const [cmd, ...baseArgs] = pmCommands[pm as keyof typeof pmCommands];
    await this.runCommand(cmd, [...baseArgs, command]);
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
  const sync = new AuthSchemaSync(projectRoot, options?.executionMode);
  return sync.sync(schemas, options);
}
