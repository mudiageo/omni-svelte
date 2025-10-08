import { describe, it, expect } from 'vitest';
import { deepEqual } from '$pkg/utils';

describe('deepEqual', () => {
  it('should return true for strictly equal primitives', () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual('hello', 'hello')).toBe(true);
    expect(deepEqual(true, true)).toBe(true);
    expect(deepEqual(null, null)).toBe(true);
    expect(deepEqual(undefined, undefined)).toBe(true);
  });

  it('should return false for different primitives', () => {
    expect(deepEqual(1, 2)).toBe(false);
    expect(deepEqual('hello', 'world')).toBe(false);
    expect(deepEqual(true, false)).toBe(false);
    expect(deepEqual(null, undefined)).toBe(false);
  });

  it('should return false when comparing primitive to object', () => {
    expect(deepEqual(1, {})).toBe(false);
    expect(deepEqual('hello', [])).toBe(false);
    expect(deepEqual(null, {})).toBe(false);
  });

  it('should handle simple objects', () => {
    expect(deepEqual({}, {})).toBe(true);
    expect(deepEqual({ a: 1 }, { a: 1 })).toBe(true);
    expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
    expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
  });

  it('should return false for objects with different keys', () => {
    expect(deepEqual({ a: 1 }, { b: 1 })).toBe(false);
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it('should return false for objects with different values', () => {
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
    expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
  });

  it('should handle nested objects', () => {
    expect(deepEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true);
    expect(deepEqual({ a: { b: { c: 2 } } }, { a: { b: { c: 2 } } })).toBe(true);
    expect(deepEqual({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false);
  });

  it('should handle simple arrays', () => {
    expect(deepEqual([], [])).toBe(true);
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
    expect(deepEqual([1, 2, 3], [1, 3, 2])).toBe(false);
  });

  it('should handle nested arrays', () => {
    expect(deepEqual([1, [2, 3]], [1, [2, 3]])).toBe(true);
    expect(deepEqual([[1, 2], [3, 4]], [[1, 2], [3, 4]])).toBe(true);
    expect(deepEqual([1, [2, 3]], [1, [2, 4]])).toBe(false);
  });

  it('should handle arrays with objects', () => {
    expect(deepEqual([{ a: 1 }], [{ a: 1 }])).toBe(true);
    expect(deepEqual([{ a: 1 }, { b: 2 }], [{ a: 1 }, { b: 2 }])).toBe(true);
    expect(deepEqual([{ a: 1 }], [{ a: 2 }])).toBe(false);
  });

  it('should handle objects with arrays', () => {
    expect(deepEqual({ a: [1, 2] }, { a: [1, 2] })).toBe(true);
    expect(deepEqual({ a: [1, 2], b: [3, 4] }, { a: [1, 2], b: [3, 4] })).toBe(true);
    expect(deepEqual({ a: [1, 2] }, { a: [1, 3] })).toBe(false);
  });

  it('should handle Date objects', () => {
    const date1 = new Date('2024-01-01');
    const date2 = new Date('2024-01-01');
    const date3 = new Date('2024-01-02');

    expect(deepEqual(date1, date2)).toBe(true);
    expect(deepEqual(date1, date3)).toBe(false);
  });

  it('should handle objects with Date properties', () => {
    const date1 = new Date('2024-01-01');
    const date2 = new Date('2024-01-01');
    const date3 = new Date('2024-01-02');

    expect(deepEqual({ date: date1 }, { date: date2 })).toBe(true);
    expect(deepEqual({ date: date1 }, { date: date3 })).toBe(false);
  });

  it('should handle circular references', () => {
    const obj1: any = { a: 1 };
    obj1.self = obj1;

    const obj2: any = { a: 1 };
    obj2.self = obj2;

    // Should return false for circular references (based on implementation)
    expect(deepEqual(obj1, obj2)).toBe(false);
  });

  it('should handle self-referential objects', () => {
    const obj: any = { a: 1 };
    obj.self = obj;

    // Comparing with itself should still work
    expect(deepEqual(obj, obj)).toBe(true);
  });

  it('should handle complex nested structures', () => {
    const complex1 = {
      name: 'test',
      numbers: [1, 2, 3],
      nested: {
        array: [{ id: 1 }, { id: 2 }],
        date: new Date('2024-01-01'),
        deep: {
          value: 'nested'
        }
      }
    };

    const complex2 = {
      name: 'test',
      numbers: [1, 2, 3],
      nested: {
        array: [{ id: 1 }, { id: 2 }],
        date: new Date('2024-01-01'),
        deep: {
          value: 'nested'
        }
      }
    };

    const complex3 = {
      name: 'test',
      numbers: [1, 2, 3],
      nested: {
        array: [{ id: 1 }, { id: 2 }],
        date: new Date('2024-01-01'),
        deep: {
          value: 'different'
        }
      }
    };

    expect(deepEqual(complex1, complex2)).toBe(true);
    expect(deepEqual(complex1, complex3)).toBe(false);
  });

  it('should handle empty structures', () => {
    expect(deepEqual({}, {})).toBe(true);
    expect(deepEqual([], [])).toBe(true);
    expect(deepEqual({}, [])).toBe(false);
  });

  it('should handle special number values', () => {
    expect(deepEqual(NaN, NaN)).toBe(false); // NaN !== NaN in JavaScript
    expect(deepEqual(Infinity, Infinity)).toBe(true);
    expect(deepEqual(-Infinity, -Infinity)).toBe(true);
    expect(deepEqual(0, -0)).toBe(true);
  });
});