import { is, getTableName, getColumns } from 'drizzle-orm';
import { PgTable, getTableConfig as pgConfig } from 'drizzle-orm/pg-core';
import { MySqlTable, getTableConfig as mysqlConfig } from 'drizzle-orm/mysql-core';
import { SQLiteTable, getTableConfig as sqliteConfig } from 'drizzle-orm/sqlite-core';

import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { read, write_if_changed } from '../../utils/filesystem.js';
import { AuthDiagnostic } from './diagnostics.js';


export type PkType = 'text' | 'uuid' | 'integer' | 'serial' | 'bigint';
export type Dialect = 'pg' | 'mysql' | 'sqlite';

export interface SystemColumn {
  name: string;          // DB column name
  property: string;      // Drizzle property name
  type: string;          // Drizzle columnType, for example 'PgText'
  notNull: boolean;
  hasDefault: boolean;
  references?: { table: string; column: string };
}

export interface SystemSchema {
  tableName: string;     // actual DB table name
  key: string;           // stable key used by auth.* and string refs
  exportName: string;    // export name in .omni/auth-schema.ts
  columns: SystemColumn[];
  primaryKey: { column: string; property: string; type: PkType } | null; // null = composite
  compositePrimaryKey: boolean;
  source: 'core' | { plugin: string };
  readonly: true;
}

export interface AuthRegistry {
  dialect: Dialect;
  schemas: Map<string, SystemSchema>;   // by key
  hash: string;                         // content hash of .omni/auth-schema.ts
}

/**
 * Maps a DB table name to a stable registry key.
 * When Better Auth is configured with `usePlural: true`, table names end with
 * `s` (e.g. `users`). `deriveKey` strips the trailing `s` so the key is
 * always singular (`user`), matching the string users write in `auth.user`.
 */
export function deriveKey(tableName: string, usePlural: boolean): string {
    if (usePlural && tableName.length > 1 && tableName.endsWith('s')) {
      return tableName.slice(0, -1);
    }
    return tableName;
}

/**
 * Normalises a Drizzle `columnType` string (e.g. `'PgUUID'`, `'SQLiteInteger'`)
 * to one of the five canonical PK types. Returns `null` for unrecognised types
 * so callers can raise `AUTH002` with a clear message instead of silently
 * defaulting to the wrong type.
 *
 * Order of checks matters: `uuid` before `int`, `bigserial` before `serial`.
 */
export function normalizePkType(columnType: string): PkType | null {
    const t = columnType.toLowerCase();
    if (t.includes('uuid')) return 'uuid';
    if (t.includes('bigserial') || t.includes('bigint')) return 'bigint';
    if (t.includes('serial')) return 'serial';
    if (t.includes('int')) return 'integer';
    if (t.includes('text') || t.includes('varchar') || t.includes('char')) return 'text';
    return null;
}

function isTable(value: unknown, dialect: Dialect): boolean {
  if (dialect === 'pg') return is(value as any, PgTable);
  if (dialect === 'mysql') return is(value as any, MySqlTable);
  return is(value as any, SQLiteTable);
}

function getConfig(table: any, dialect: Dialect) {
  if (dialect === 'pg') return pgConfig(table);
  if (dialect === 'mysql') return mysqlConfig(table);
  return sqliteConfig(table);
}

export interface IntrospectOptions {
  dialect: Dialect;
  usePlural: boolean;
  /** table name -> plugin name, for tables contributed by Better Auth plugins */
  pluginTables?: Record<string, string>;
}

/**
 * Walks every export of a Better Auth Drizzle module and builds a
 * `Map<key, SystemSchema>`. Non-table exports are silently ignored.
 *
 * Throws:
 * - `AUTH002` — no Drizzle tables found in the module.
 * - `AUTH004` — two tables normalise to the same key (key collision).
 */
export function introspectAuthModule(
  mod: Record<string, unknown>,
  opts: IntrospectOptions
): Map<string, SystemSchema> {
  const out = new Map<string, SystemSchema>();

  for (const [exportName, value] of Object.entries(mod)) {
    if (!isTable(value, opts.dialect)) continue;

    const cfg: any = getConfig(value, opts.dialect);
    const tableName = getTableName(value as any);
    const key = deriveKey(tableName, opts.usePlural);

    if (out.has(key)) {
      throw new AuthDiagnostic(
        'AUTH004',
        `Tables "${out.get(key)!.tableName}" and "${tableName}" both normalize to key "${key}".`,
        'Check the usePlural option for Better Auth, or rename one of the tables.'
      );
    }

    const props = getColumns(value as any) as Record<string, any>;
    const propByColumn = new Map<string, string>(
      Object.entries(props).map(([prop, col]) => [col.name, prop])
    );

    // foreign keys: column name -> referenced table/column
    const fkByColumn = new Map<string, { table: string; column: string }>();
    for (const fk of cfg.foreignKeys ?? []) {
      const ref = fk.reference();
      ref.columns.forEach((c: any, i: number) => {
        fkByColumn.set(c.name, {
          table: getTableName(ref.foreignTable),
          column: ref.foreignColumns[i].name,
        });
      });
    }

    const columns: SystemColumn[] = cfg.columns.map((c: any) => ({
      name: c.name,
      property: propByColumn.get(c.name) ?? c.name,
      type: c.columnType,
      notNull: !!c.notNull,
      hasDefault: !!c.hasDefault,
      references: fkByColumn.get(c.name),
    }));

    const compositePrimaryKey = (cfg.primaryKeys?.length ?? 0) > 0;
    const pkCols = cfg.columns.filter((c: any) => c.primary);
    let primaryKey: SystemSchema['primaryKey'] = null;
    if (!compositePrimaryKey && pkCols.length === 1) {
      const type = normalizePkType(pkCols[0].columnType);
      if (!type) {
        throw new AuthDiagnostic(
          'AUTH002',
          `Cannot determine primary-key type for ${tableName}.${pkCols[0].name} (${pkCols[0].columnType}).`
        );
      }
      primaryKey = {
        column: pkCols[0].name,
        property: propByColumn.get(pkCols[0].name) ?? pkCols[0].name,
        type,
      };
    }

    out.set(key, {
      tableName,
      key,
      exportName,
      columns,
      primaryKey,
      compositePrimaryKey,
      source: opts.pluginTables?.[tableName] ? { plugin: opts.pluginTables[tableName] } : 'core',
      readonly: true,
    });
  }

  if (out.size === 0) {
    throw new AuthDiagnostic(
      'AUTH002',
      'No tables found in .omni/auth-schema.ts.',
      'Run the auth generate step first and check the dialect in your omni config.'
    );
  }
  return out;
}

/**
 * Renders `.omni/auth-registry.d.ts` — a declaration file that augments
 * `omni-svelte/schema`'s `AuthTables` interface with one entry per auth table
 * key. Keys are sorted for deterministic output (stable snapshots, no
 * spurious rewrites).
 */
export function renderRegistryDts(reg: AuthRegistry): string {
    const keys = [...reg.schemas.keys()].sort();
    return [
      '// AUTO-GENERATED by omni-svelte. DO NOT EDIT.',
      `// registry hash: ${reg.hash}`,
      "declare module 'omni-svelte/schema' {",
      '  interface AuthTables {',
      ...keys.map((k) => `    ${JSON.stringify(k)}: true;`),
      '  }',
      '}',
      'export {};',
      '',
    ].join('\n');
}

export interface BuildRegistryOptions extends IntrospectOptions {
  /** Project root — the directory that contains `.omni/`. */
  root: string;
  /**
   * Optional module loader override. When omitted, the registry loads
   * `.omni/auth-schema.ts` via a native dynamic `import()` (using
   * `pathToFileURL`). Pass a custom loader only in tests that need to inject
   * mock modules without hitting the filesystem.
   */
  loadModule?: (absPath: string) => Promise<Record<string, unknown>>;
}

/** Process-level cache — invalidated whenever the file content hash changes. */
let cached: AuthRegistry | null = null;

/**
 * Returns the most recently built `AuthRegistry`, or `null` if
 * `buildAuthRegistry` has not been called yet in this process.
 *
 * Downstream code (generators, resolvers) should call this instead of
 * holding their own reference to the registry object.
 */
export function getAuthRegistry(): AuthRegistry | null {
  return cached;
}

/**
 * Reads `.omni/auth-schema.ts`, introspects every exported Drizzle table,
 * writes `.omni/auth-registry.d.ts`, and returns the `AuthRegistry`.
 *
 * Results are cached by the SHA-256 hash of the source file — a second call
 * with an unchanged file returns the same object reference (useful for
 * verifying cache hits in tests).
 *
 * Throws `AuthDiagnostic(AUTH002)` when the file is missing.
 * Throws `AuthDiagnostic(AUTH004)` when two tables normalise to the same key.
 */
export async function buildAuthRegistry(opts: BuildRegistryOptions): Promise<AuthRegistry> {
  const file = join(opts.root, '.omni', 'auth-schema.ts');
  if (!existsSync(file)) {
    throw new AuthDiagnostic('AUTH002', `Missing ${file}.`, 'Run the auth generate step.');
  }

  let source: string;
  try {
    source = read(file);
  } catch {
    throw new AuthDiagnostic('AUTH002', `Missing ${file}.`, 'Run the auth generate step.');
  }

  const hash = createHash('sha256').update(source).digest('hex').slice(0, 16);
  if (cached && cached.hash === hash) return cached;

  const mod = opts.loadModule
    ? await opts.loadModule(file)
    : ((await import(pathToFileURL(file).href + `?t=${Date.now()}`)) as Record<string, unknown>);

  const registry: AuthRegistry = {
    dialect: opts.dialect,
    schemas: introspectAuthModule(mod, opts),
    hash,
  };

  // write_if_changed skips the disk write when content is identical,
  // preventing unnecessary filesystem churn on repeated builds.
  write_if_changed(join(opts.root, '.omni', 'auth-registry.d.ts'), renderRegistryDts(registry));
  cached = registry;
  return registry;
}

/** Clears the process-level cache. Call in `beforeEach` for tests that need a clean slate. */
export function resetAuthRegistryCache() { cached = null; }

