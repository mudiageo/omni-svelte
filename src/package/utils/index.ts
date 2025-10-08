export async function hashPassword(password: string, method: string): Promise<string> {
//   if (method === 'bcrypt') {
//     const bcrypt = await import('bcrypt');
//     return bcrypt.hash(password, 10);
//   }
  // TODO: Add other hashing methods as needed update to use  brtter auth hashPassword from better-auth/crypto
  return password;
}

export function deepEqual(a: any, b: any, visited = new WeakSet()): boolean {
    if (a === b) return true;

    if (a == null || typeof a != 'object' || b == null || typeof b != 'object') {
        return false;
    }

    if (a instanceof Date && b instanceof Date) {
        return a.getTime() === b.getTime();
    }

    // Handle circular references
    if (visited.has(a) || visited.has(b)) {
        // If we've already visited these objects, and they weren't strictly equal,
        // we're in a circular reference. For simplicity, we might return false.
        // A more robust solution might track pairs (a,b) and return true if (a,b) was already compared and found equal.
        return false;
    }
    visited.add(a);
    visited.add(b);

    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (!deepEqual(a[i], b[i], visited)) return false;
        }
        visited.delete(a);
        visited.delete(b);
        return true;
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
        if (!keysB.includes(key) || !deepEqual(a[key], b[key], visited)) {
            visited.delete(a);
            visited.delete(b);
            return false;
        }
    }

    visited.delete(a);
    visited.delete(b);
    return true;
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}