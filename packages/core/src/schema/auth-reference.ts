import type { AuthRegistry, PkType } from '../runtime/auth/registry.js';
import { AuthDiagnostic } from '../runtime/auth/diagnostics.js';
import type { defineSchema } from './index.js';

/** Augmented by .omni/auth-registry.d.ts */
export interface AuthTables {}

export interface SystemSchemaRef<K extends string = string> {
  readonly __omniSystem: true;
  readonly key: K;
}

/**
 * Typed proxy for referencing Better Auth system tables in `field.reference(() => auth.user)`.
 */
export const auth = new Proxy({} as { readonly [K in keyof AuthTables & string]: SystemSchemaRef<K> }, {
  get: (_t, key) => ({ __omniSystem: true as const, key: String(key) }),
}) as { readonly [K in keyof AuthTables & string]: SystemSchemaRef<K> };

/**
 * Type guard to check if an object is a `SystemSchemaRef`.
 *
 * @param v - Unknown value to check
 * @returns True if `v` represents a system schema reference
 */
export function isSystemRef(v: unknown): v is SystemSchemaRef {
  return !!v && typeof v === 'object' && (v as any).__omniSystem === true;
}

export interface ResolvedReference {
  kind: 'user' | 'system';
  tableName: string;               // DB table
  exportName: string;              // identifier to use in generated Drizzle code
  pk: { column: string; property: string; type: PkType };
  schema?: ReturnType<typeof defineSchema>;
}

/**
 * Resolves a reference target (either a user schema thunk or a system auth reference)
 * into a normalized reference definition containing target table name, export identifier,
 * and primary-key type information.
 *
 * @param target - The reference target from `field.reference()`
 * @param ctx - Resolution context containing the auth registry and location info
 * @returns Normalized target reference metadata
 */
export function resolveReference(
  target: any,
  ctx: {
    registry: AuthRegistry | null;
    userSchemaByTable: Map<string, { tableName: string; pk: ResolvedReference['pk'] }>;
    where: string;                 // 'posts.authorId' for messages
  },
  options?: {
    includeSchema: boolean;
  }
): ResolvedReference {
  let sys: string | null = null;
  let userTable: string | null = null;

  if (target && typeof target === 'object' && target.kind === 'system') {
    sys = target.key;
  } else if (typeof target === 'string') {
    // String reference: user schema takes precedence over auth table if there is a match
    if (ctx.userSchemaByTable?.has(target)) {
      userTable = target;
      if (ctx.registry?.schemas.has(target)) {
        console.warn(
          new AuthDiagnostic(
            'AUTH006',
            `Schema "${target}" has the same name as the auth table "${target}".`,
            `Use auth.${target} to reference the auth table, or rename your schema.`,
            'warning'
          ).message
        );
      }
    } else {
      sys = target;
    }
  } else {
    const fn = typeof target?.resolve === 'function' ? target.resolve : (typeof target === 'function' ? target : null);
    if (!fn) {
      throw new Error(`Invalid reference target`);
    }
    const r = fn();
    if (isSystemRef(r) || (r && typeof r === 'object' && (r as any).__omniSystem === true)) {
      sys = (r as any).key;
    } else {
      userTable = (r as any)?.tableName ?? (r as any)?.name;
    }
  }

  if (userTable) {
    const u = ctx.userSchemaByTable?.get(userTable);
    if (u) {
      return { kind: 'user', tableName: u.tableName, exportName: u.tableName, pk: u.pk };
    }
    // Fallback: target schema object directly contains PK info or defaults to serial/integer id
    const fn = typeof target?.resolve === 'function' ? target.resolve : (typeof target === 'function' ? target : null);
    const r = fn ? fn() : target;
    const pkCol = Object.entries((r as any)?.fields ?? {}).find(([_, f]: any) => f?.primary);
    const fieldType = (pkCol?.[1] as any)?.type;
    const pkType: PkType = !pkCol
      ? 'serial'
      : fieldType === 'uuid'
        ? 'uuid'
        : fieldType === 'bigint'
          ? 'bigint'
          : ['string', 'text', 'email', 'password', 'url', 'slug'].includes(fieldType)
            ? 'text'
            : 'integer';
    return {
      kind: 'user',
      tableName: userTable,
      exportName: userTable,
      pk: {
        column: pkCol ? pkCol[0] : 'id',
        property: pkCol ? pkCol[0] : 'id',
        type: pkType
      }
    };
  }

  if (!ctx.registry) {
    throw new AuthDiagnostic('AUTH002', `${ctx.where}: auth tables are not available.`,
      'Run the auth generate step so .omni/auth-schema.ts exists.');
  }
  const s = ctx.registry.schemas.get(sys!);
  if (!s) {
    const close = [...ctx.registry.schemas.keys()].join(', ');
    throw new AuthDiagnostic('AUTH001', `${ctx.where}: unknown auth table "${sys}".`, `Available: ${close}`);
  }
  if (!s.primaryKey) {
    throw new AuthDiagnostic('AUTH003', `${ctx.where}: "${sys}" has a composite or missing primary key; cannot reference it.`);
  }
  return { kind: 'system', tableName: s.tableName, exportName: s.exportName, pk: s.primaryKey };
}

/**
 * Validates user schemas against the AuthRegistry to detect naming collisions and shadows.
 *
 * - Warning: if user schema name or table name matches an auth table key (e.g. user schema named 'user' when Better Auth has table 'users').
 * - Error: if user schema would generate the exact same Drizzle DB table name as an auth table.
 */
export function checkAuthShadowing(
  userSchemas: ({ name: string; tableName?: string })[],
  registry: AuthRegistry | null,
  options?: {
    warn?: (d: AuthDiagnostic) => void;
    throwOnError?: boolean;
  }
): AuthDiagnostic[] {
  if (!registry) return [];
  const diagnostics: AuthDiagnostic[] = [];
  const authTableNames = new Map<string, string>(); // tableName -> key
  for (const [key, schema] of registry.schemas) {
    authTableNames.set(schema.tableName, key);
  }

  const warnFn = options?.warn || ((d: AuthDiagnostic) => console.warn(d.message));
  const throwOnError = options?.throwOnError !== false;

  for (const s of userSchemas) {
    const tableName = s.tableName ?? s.name;
    const name = s.name;

    // 1. Escalate to an error if both would generate a Drizzle table with the same name
    if (authTableNames.has(tableName)) {
      const authKey = authTableNames.get(tableName)!;
      const diag = new AuthDiagnostic(
        'AUTH006',
        `Schema "${name}" generates the same Drizzle table name as auth table "${tableName}".`,
        'Rename your schema to avoid database table collision.',
        'error'
      );
      diagnostics.push(diag);
      if (throwOnError) {
        throw diag;
      }
      continue;
    }

    // 2. Warning if user schema has the same key as a registry entry
    if (registry.schemas.has(name) || registry.schemas.has(tableName)) {
      const matchedKey = registry.schemas.has(name) ? name : tableName;
      const diag = new AuthDiagnostic(
        'AUTH006',
        `Schema "${name}" has the same name as the auth table "${matchedKey}".`,
        `Use auth.${matchedKey} to reference the auth table, or rename your schema.`,
        'warning'
      );
      diagnostics.push(diag);
      warnFn(diag);
    }
  }

  return diagnostics;
}
