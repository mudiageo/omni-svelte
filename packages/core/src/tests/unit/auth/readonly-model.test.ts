/// <reference path="../../../../.omni/auth-registry.d.ts" />
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as pgFixture from '../../fixtures/auth/auth-schema.pg';
import {
  introspectAuthModule,
  type AuthRegistry,
  setAuthRegistry,
  resetAuthRegistryCache
} from '../../../runtime/auth/registry.js';
import { ModelGenerator } from '../../../schema/generators/model.js';
import { resource } from '../../../remote/resource.js';
import { ReadonlyModel } from '../../../database/model.js';
import { checkAuthShadowing } from '../../../schema/auth-reference.js';
import { generateAllSchemas } from '../../../vite/schema.js';
import type { Schema } from '../../../schema/types.js';

describe('PR 3: Read-only model generation and diagnostics', () => {
  let registry: AuthRegistry;
  let pluralRegistry: AuthRegistry;

  beforeEach(() => {
    resetAuthRegistryCache();
    registry = {
      dialect: 'pg',
      schemas: introspectAuthModule(pgFixture, { dialect: 'pg', usePlural: false }),
      hash: 'test-hash'
    };
    pluralRegistry = {
      dialect: 'pg',
      schemas: new Map([
        [
          'user',
          {
            tableName: 'users',
            key: 'user',
            exportName: 'users',
            columns: [],
            primaryKey: { column: 'id', property: 'id', type: 'text' },
            compositePrimaryKey: false,
            source: 'core',
            readonly: true
          }
        ]
      ]),
      hash: 'test-plural-hash'
    };
  });

  afterEach(() => {
    resetAuthRegistryCache();
  });

  describe('ModelGenerator read-only mode', () => {
    it('generates a read-only model snapshot for an auth system schema', () => {
      const userSchema = registry.schemas.get('user')!;
      const generator = new ModelGenerator(userSchema, {
        readonly: true,
        drizzle: { path: './src/lib/db/server/schema.ts', format: 'single-file' },
        model: { path: './src/lib/models', format: 'per-schema' }
      });

      const content = generator.generate();

      // Header comment
      expect(content).toContain('src/lib/models/auth/user.ts, DO NOT EDIT (read-only, derived from Better Auth)');

      // Imports
      expect(content).toContain("import { ReadonlyModel } from 'omni-svelte/model';");
      expect(content).toContain("import { user } from '../../db/server/schema';");

      // Row type
      expect(content).toContain('export type UserRow = typeof user.$inferSelect;');

      // Class definition & methods
      expect(content).toContain('export class User extends ReadonlyModel {');
      expect(content).toContain('static override readonly = true as const;');
      expect(content).toContain("static override tableName = 'user';");
      expect(content).toContain('static override table = user;');
      expect(content).toContain("static override primaryKey = 'id';");

      // Read methods present
      expect(content).toContain('static override query() {');
      expect(content).toContain('static override find(id: any) {');
      expect(content).toContain('static override findMany(ids?: any[]) {');

      // Registration & default export
      expect(content).toContain("User.register('auth.user');");
      expect(content).toContain('export default User;');

      // Must NOT contain mutators or write-related properties
      expect(content).not.toContain('static create(');
      expect(content).not.toContain('static update(');
      expect(content).not.toContain('static delete(');
      expect(content).not.toContain('static fillable');
      expect(content).not.toContain('static hooks');
      expect(content).not.toContain('static hidden');
      expect(content).not.toContain('update(');
      expect(content).not.toContain('save(');
    });

    it('generates all auth models and index barrel file', () => {
      const authSchemas = Array.from(registry.schemas.values());
      const outputs = ModelGenerator.generateAuthModels(authSchemas, {
        drizzle: { path: './src/lib/db/server/schema.ts', format: 'single-file' },
        model: { path: './src/lib/models', format: 'per-schema' }
      });

      // 4 auth tables (user, session, account, verification) + 1 index barrel
      expect(outputs).toHaveLength(5);

      const paths = outputs.map((o) => o.path);
      expect(paths).toContain('./src/lib/models/auth/user.ts');
      expect(paths).toContain('./src/lib/models/auth/session.ts');
      expect(paths).toContain('./src/lib/models/auth/account.ts');
      expect(paths).toContain('./src/lib/models/auth/verification.ts');
      expect(paths).toContain('./src/lib/models/auth/index.ts');

      const indexOutput = outputs.find((o) => o.path === './src/lib/models/auth/index.ts')!;
      expect(indexOutput.content).toContain("// Auto-generated auth models");
      expect(indexOutput.content).toContain("export * from './user';");
      expect(indexOutput.content).toContain("export * from './session';");
      expect(indexOutput.content).toContain("export * from './account';");
      expect(indexOutput.content).toContain("export * from './verification';");
    });

    it('respects omni.auth.generate config overrides (model: false)', () => {
      const authSchemas = Array.from(registry.schemas.values());
      const outputs = ModelGenerator.generateAuthModels(
        authSchemas,
        {
          drizzle: { path: './src/lib/db/server/schema.ts', format: 'single-file' },
          model: { path: './src/lib/models', format: 'per-schema' }
        },
        {
          session: { model: false },
          verification: { model: false }
        }
      );

      const paths = outputs.map((o) => o.path);
      expect(paths).toContain('./src/lib/models/auth/user.ts');
      expect(paths).not.toContain('./src/lib/models/auth/session.ts');
      expect(paths).not.toContain('./src/lib/models/auth/verification.ts');

      const indexOutput = outputs.find((o) => o.path === './src/lib/models/auth/index.ts')!;
      expect(indexOutput.content).toContain("export * from './user';");
      expect(indexOutput.content).not.toContain("export * from './session';");
      expect(indexOutput.content).not.toContain("export * from './verification';");
    });
  });

  describe('resource() write guards (AUTH009)', () => {
    class MockUser extends ReadonlyModel {
      static override readonly = true as const;
      static override tableName = 'user';
      static override primaryKey = 'id';

      static override query() {
        return {
          with: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          paginate: vi.fn().mockResolvedValue({ data: [], meta: {} }),
          first: vi.fn().mockResolvedValue({ id: '1', name: 'Alice' })
        } as any;
      }

      static override find(id: any) {
        return Promise.resolve({ id, name: 'Alice' }) as any;
      }
    }

    it('exposes list and get queries for read-only models', () => {
      const res = resource(MockUser);
      expect(res.list).toBeDefined();
      expect(res.get).toBeDefined();
    });

    it('throws AUTH009 when calling a write operation at runtime', async () => {
      const res = resource(MockUser);

      expect(() => (res as any).create({})).toThrowError(/\[AUTH009\] Cannot write to auth table "user" using resource/);
      expect(() => (res as any).update('1', {})).toThrowError(/\[AUTH009\] Cannot write to auth table "user" using resource/);
      expect(() => (res as any).remove('1')).toThrowError(/\[AUTH009\] Cannot write to auth table "user" using resource/);
    });

    it('throws AUTH009 immediately when options.only specifies write operations', () => {
      expect(() =>
        resource(MockUser, { only: ['create'] as any })
      ).toThrowError(/\[AUTH009\] Cannot write to auth table "user" using resource/);

      expect(() =>
        resource(MockUser, { only: ['update'] as any })
      ).toThrowError(/\[AUTH009\] Cannot write to auth table "user" using resource/);

      expect(() =>
        resource(MockUser, { only: ['remove'] as any })
      ).toThrowError(/\[AUTH009\] Cannot write to auth table "user" using resource/);
    });

    it('omits create, update, remove from return type at compile-time', () => {
      const res = resource(MockUser);
      // @ts-expect-error create does not exist on read-only resource
      const _create = res.create;
      // @ts-expect-error update does not exist on read-only resource
      const _update = res.update;
      // @ts-expect-error remove does not exist on read-only resource
      const _remove = res.remove;

      expect(res.list).toBeDefined();
      expect(res.get).toBeDefined();
    });
  });

  describe('AUTH006 shadow diagnostic', () => {
    it('emits warning when user schema name matches auth key without Drizzle table clash', () => {
      // In pluralRegistry, auth key is 'user', but table name is 'users'.
      // A user schema named 'user' produces a warning since there is no table collision.
      const warnMock = vi.fn();
      const diags = checkAuthShadowing(
        [{ name: 'user', tableName: 'user' }],
        pluralRegistry,
        { warn: warnMock, throwOnError: false }
      );

      expect(diags).toHaveLength(1);
      expect(diags[0].code).toBe('AUTH006');
      expect(diags[0].severity).toBe('warning');
      expect(warnMock).toHaveBeenCalledTimes(1);
      expect(warnMock).toHaveBeenCalledWith(diags[0]);
    });

    it('throws AUTH006 error when user schema generates the same Drizzle table name as an auth table', () => {
      // In registry, auth table name is 'user' and user schema table name is 'user' (collision!)
      expect(() =>
        checkAuthShadowing([{ name: 'user', tableName: 'user' }], registry)
      ).toThrowError(/\[AUTH006\] Schema "user" generates the same Drizzle table name as auth table "user"/);

      const diags = checkAuthShadowing(
        [{ name: 'user', tableName: 'user' }],
        registry,
        { throwOnError: false }
      );
      expect(diags).toHaveLength(1);
      expect(diags[0].code).toBe('AUTH006');
      expect(diags[0].severity).toBe('error');
    });
  });

  describe('Orchestrator generateAllSchemas integration', () => {
    it('generates auth models and no Zod schemas or factories for auth tables', async () => {
      setAuthRegistry(registry);

      const outputs = await generateAllSchemas(
        [],
        {
          output: {
            drizzle: { path: './src/lib/db/server/schema.ts', format: 'single-file' },
            zod: { path: './src/lib/validation', format: 'per-schema' },
            model: { path: './src/lib/models', format: 'per-schema' }
          },
          dev: { logLevel: 'silent' }
        } as any
      );

      // Should contain auth model files and index barrel
      const paths = outputs.map((o) => o.path);
      expect(paths).toContain('./src/lib/models/auth/user.ts');
      expect(paths).toContain('./src/lib/models/auth/session.ts');
      expect(paths).toContain('./src/lib/models/auth/index.ts');

      // Assert NO Zod validation files generated for auth tables
      const zodOutputs = outputs.filter((o) => o.type === 'zod');
      expect(zodOutputs).toHaveLength(0);

      // Assert NO factory outputs generated unless configured
      const factoryOutputs = outputs.filter((o) => (o as any).type === 'factory');
      expect(factoryOutputs).toHaveLength(0);
    });
  });
});
