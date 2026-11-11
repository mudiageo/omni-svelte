import type { AuthRegistry, PkType } from '../runtime/auth/registry.js';
import { AuthDiagnostic } from '../runtime/auth/diagnostics.js';
import type { defineSchema } from './index.js';

/** Augmented by .omni/auth-registry.d.ts */
export interface AuthTables {}

export interface SystemSchemaRef<K extends string = string> {
  readonly __omniSystem: true;
  readonly key: K;
}

// Auth tanles ref
export const auth = new Proxy({} as { readonly [K in keyof AuthTables & string]: SystemSchemaRef<K> }, {
  get: (_t, key) => ({ __omniSystem: true as const, key: String(key) }),
}) as { readonly [K in keyof AuthTables & string]: SystemSchemaRef<K> };

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
    sys = target;
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
    const pkType = !pkCol
      ? 'serial'
      : fieldType === 'uuid'
        ? 'uuid'
        : ['string', 'email', 'password', 'url', 'slug'].includes(fieldType)
          ? 'text'
          : 'integer';
    return {
      kind: 'user',
      tableName: userTable,
      exportName: userTable,
      pk: {
        column: pkCol ? pkCol[0] : 'id',
        property: pkCol ? pkCol[0] : 'id',
        type: pkType as any
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