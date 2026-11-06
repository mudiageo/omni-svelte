import { describe, it, expect, beforeEach } from 'vitest';
import * as pgFixture from '../fixtures/auth/auth-schema.pg';
import * as compositeFixture from '../fixtures/auth/auth-schema.composite.pg';
import { introspectAuthModule, type AuthRegistry } from '../../runtime/auth/registry.js';
import { resolveReference, auth } from '../../schema/auth-reference.js';
import { AuthDiagnostic } from '../../runtime/auth/diagnostics.js';

describe('resolveReference', () => {
  let registry: AuthRegistry;

  beforeEach(() => {
    registry = {
      dialect: 'pg',
      schemas: introspectAuthModule(pgFixture, { dialect: 'pg', usePlural: false }),
      hash: 'test-hash'
    };
  });

  it('resolves auth.user to a system reference with text pk', () => {
    const target = { kind: 'thunk' as const, resolve: () => auth.user };
    const resolved = resolveReference(target, {
      registry,
      userSchemaByTable: new Map(),
      where: 'posts.authorId'
    });

    expect(resolved).toEqual({
      kind: 'system',
      tableName: 'user',
      exportName: 'user',
      pk: {
        column: 'id',
        property: 'id',
        type: 'text'
      }
    });
  });

  it('resolves string auth key reference', () => {
    const target = { kind: 'system' as const, key: 'session' };
    const resolved = resolveReference(target, {
      registry,
      userSchemaByTable: new Map(),
      where: 'tokens.sessionId'
    });

    expect(resolved).toEqual({
      kind: 'system',
      tableName: 'session',
      exportName: 'session',
      pk: {
        column: 'id',
        property: 'id',
        type: 'text'
      }
    });
  });

  it('throws AUTH001 for unknown auth table key with available options', () => {
    const target = { kind: 'system' as const, key: 'unknown_table' };
    expect(() =>
      resolveReference(target, {
        registry,
        userSchemaByTable: new Map(),
        where: 'posts.authorId'
      })
    ).toThrowError(/\[AUTH001\]/);
  });

  it('throws AUTH002 when registry is null', () => {
    const target = { kind: 'thunk' as const, resolve: () => auth.user };
    expect(() =>
      resolveReference(target, {
        registry: null,
        userSchemaByTable: new Map(),
        where: 'posts.authorId'
      })
    ).toThrowError(/\[AUTH002\]/);
  });

  it('throws AUTH003 for composite primary key targets', () => {
    const compositeReg: AuthRegistry = {
      dialect: 'pg',
      schemas: introspectAuthModule(compositeFixture, { dialect: 'pg', usePlural: false }),
      hash: 'composite-hash'
    };

    const target = { kind: 'system' as const, key: 'user_role' };
    expect(() =>
      resolveReference(target, {
        registry: compositeReg,
        userSchemaByTable: new Map(),
        where: 'members.roleId'
      })
    ).toThrowError(/\[AUTH003\]/);
  });

  it('resolves user schema thunk fallback with default integer pk', () => {
    const mockUserSchema = {
      name: 'categories',
      fields: {
        id: { type: 'serial', primary: true },
        name: { type: 'string' }
      }
    };

    const target = { kind: 'thunk' as const, resolve: () => mockUserSchema };
    const resolved = resolveReference(target, {
      registry,
      userSchemaByTable: new Map(),
      where: 'posts.categoryId'
    });

    expect(resolved).toMatchObject({
      kind: 'user',
      tableName: 'categories',
      exportName: 'categories',
      pk: {
        column: 'id',
        property: 'id',
        type: 'integer'
      }
    });
  });
});
