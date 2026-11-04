import { mkdtemp, mkdir, copyFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { beforeEach, describe, it, expect } from 'vitest';
import * as pgFixture from '../../fixtures/auth/auth-schema.pg';
import * as plural from '../../fixtures/auth/auth-schema.plural.pg';
import * as uuid from '../../fixtures/auth/auth-schema.uuid.pg';
import * as composite from '../../fixtures/auth/auth-schema.composite.pg';
import * as empty from '../../fixtures/auth/auth-schema.empty';
import * as collision from '../../fixtures/auth/auth-schema.collision.pg';
import * as sqlite from '../../fixtures/auth/auth-schema.sqlite';
import {
  deriveKey,
  normalizePkType,
  introspectAuthModule,
  buildAuthRegistry,
  resetAuthRegistryCache,
  getAuthRegistry,
} from '../../../runtime/auth/registry';

const base = { dialect: 'pg' as const, usePlural: false };

describe('normalizePkType', () => {
  const cases: Array<[string, ReturnType<typeof normalizePkType>]> = [
    ['PgText', 'text'],
    ['PgUUID', 'uuid'],
    ['PgSerial', 'serial'],
    ['PgBigSerial53', 'bigint'],
    ['PgBigInt64', 'bigint'],
    ['PgInteger', 'integer'],
    ['SQLiteInteger', 'integer'],
    ['MySqlVarChar', 'text'],
    ['MySqlInt', 'integer'],
    ['PgJson', null],
    ['PgCustom', null],
  ];

  it.each(cases)('normalizes %s to %s', (columnType, expected) => {
    expect(normalizePkType(columnType)).toBe(expected);
  });
});

describe('deriveKey', () => {
  it('singularizes plural table names when usePlural is true', () => {
    expect(deriveKey('users', true)).toBe('user');
    expect(deriveKey('sessions', true)).toBe('session');
    expect(deriveKey('accounts', true)).toBe('account');
  });

  it('preserves table names when usePlural is false', () => {
    expect(deriveKey('users', false)).toBe('users');
    expect(deriveKey('user', false)).toBe('user');
  });

  it('handles edge case single-character table names', () => {
    expect(deriveKey('s', true)).toBe('s');
  });
});

describe('introspectAuthModule', () => {
  it('registers all core tables by key', () => {
    const r = introspectAuthModule(pgFixture, base);
    expect([...r.keys()].sort()).toEqual(['account', 'session', 'user', 'verification']);
  });

  it('detects text primary key and property names', () => {
    const u = introspectAuthModule(pgFixture, base).get('user')!;
    expect(u.primaryKey).toEqual({ column: 'id', property: 'id', type: 'text' });
    expect(u.columns.find((c) => c.name === 'email_verified')?.property).toBe('emailVerified');
  });

  it('records foreign keys', () => {
    const s = introspectAuthModule(pgFixture, base).get('session')!;
    expect(s.columns.find((c) => c.name === 'user_id')?.references).toEqual({ table: 'user', column: 'id' });
  });

  it('singularizes keys when usePlural is true', () => {
    const r = introspectAuthModule(plural, { ...base, usePlural: true });
    expect(r.has('user')).toBe(true);
    expect(r.get('user')!.tableName).toBe('users');
  });

  it('detects uuid primary keys', () => {
    expect(introspectAuthModule(uuid, base).get('user')!.primaryKey?.type).toBe('uuid');
  });

  it('flags composite primary keys', () => {
    const t = [...introspectAuthModule(composite, base).values()].find((s) => s.compositePrimaryKey)!;
    expect(t.primaryKey).toBeNull();
  });

  it('supports sqlite dialect tables', () => {
    const r = introspectAuthModule(sqlite, { dialect: 'sqlite', usePlural: false });
    expect([...r.keys()].sort()).toEqual(['session', 'user']);
    expect(r.get('user')!.primaryKey).toEqual({ column: 'id', property: 'id', type: 'text' });
    expect(r.get('session')!.columns.find((c) => c.name === 'user_id')?.references).toEqual({
      table: 'user',
      column: 'id',
    });
  });

  it('throws AUTH002 when no tables are found', () => {
    expect(() => introspectAuthModule(empty as any, base)).toThrow(/AUTH002/);
  });

  it('throws AUTH004 on key collisions', () => {
    expect(() => introspectAuthModule(collision, { ...base, usePlural: true })).toThrow(/AUTH004/);
  });
});

describe('buildAuthRegistry', () => {
  beforeEach(() => resetAuthRegistryCache());

  it('writes a deterministic .d.ts and caches by hash without loadModule', async () => {
  // Anchor to packages/core using __dirname rather than process.cwd()
    const packageRoot = resolve(__dirname, '../..');
    const root = join(packageRoot, 'test-auth-schema');
  
    // Ensure clean state before running
    await rm(root, { recursive: true, force: true });
    await mkdir(join(root, '.omni'), { recursive: true });
  
    try {
      await copyFile(
        join(__dirname, '../../fixtures/auth/auth-schema.pg.ts'),
        join(root, '.omni', 'auth-schema.ts')
      );
  
      const a = await buildAuthRegistry({ root, dialect: 'pg', usePlural: false });
      const dts = await readFile(join(root, '.omni', 'auth-registry.d.ts'), 'utf8');
  
      expect(dts).toContain("declare module 'omni-svelte/schema'");
      expect(dts).toContain('"user": true;');
      expect(dts).toContain('"session": true;');
      expect(getAuthRegistry()).toBe(a);
  
      const b = await buildAuthRegistry({ root, dialect: 'pg', usePlural: false });
      expect(b).toBe(a); // Cache hit returns same object
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('supports optional custom loadModule override', async () => {
    const root = await mkdtemp(join(tmpdir(), 'omni-auth-'));
    await mkdir(join(root, '.omni'));
    await copyFile(
      join(__dirname, '../../fixtures/auth/auth-schema.pg.ts'),
      join(root, '.omni', 'auth-schema.ts')
    );
    const mockLoader = async () => pgFixture;
    const a = await buildAuthRegistry({ root, dialect: 'pg', usePlural: false, loadModule: mockLoader });
    expect(a.schemas.has('user')).toBe(true);
  });

  it('throws AUTH002 when the file is missing', async () => {
    const root = await mkdtemp(join(tmpdir(), 'omni-auth-'));
    await expect(
      buildAuthRegistry({ root, dialect: 'pg', usePlural: false })
    ).rejects.toThrow(/AUTH002/);
  });
});

