/// <reference path="../../fixtures/auth/auth-registry.fixture.d.ts" />
import { describe, it, expect } from 'vitest';
import { auth, isSystemRef } from '../../../schema/auth-reference.js';
import { field } from '../../../schema/field.js';

describe('auth reference API', () => {
  it('returns a SystemSchemaRef proxy with the correct key and flag', () => {
    const userRef = auth.user;
    expect(userRef.__omniSystem).toBe(true);
    expect(userRef.key).toBe('user');
    expect(isSystemRef(userRef)).toBe(true);
    expect(isSystemRef({ not: 'system' })).toBe(false);
    expect(isSystemRef(null)).toBe(false);
    expect(isSystemRef(undefined)).toBe(false);
  });

  it('builds reference field with thunk returning auth table', () => {
    const refBuilder = field.reference(() => auth.user);
    const def = (refBuilder as any).def;
    expect(def.type).toBe('reference');
    expect(def.target.kind).toBe('thunk');
    const resolved = def.target.resolve();
    expect(isSystemRef(resolved)).toBe(true);
    expect(resolved.key).toBe('user');
  });

  it('builds reference field with string auth key', () => {
    const refBuilder = field.reference('session');
    const def = (refBuilder as any).def;
    expect(def.type).toBe('reference');
    expect(def.target).toEqual({ kind: 'system', key: 'session' });
  });

  it('typechecks valid and invalid reference targets', () => {
    // Valid references
    const validThunk = field.reference(() => auth.user);
    const validString = field.reference('user');
    expect(validThunk).toBeDefined();
    expect(validString).toBeDefined();

    // @ts-expect-error non-existent auth table
    const _invalidThunk = () => auth.nope;
    // @ts-expect-error non-existent string reference
    const _invalidString = () => field.reference('nope');
  });
});
