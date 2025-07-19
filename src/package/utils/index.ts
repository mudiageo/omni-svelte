export async function hashPassword(password: string, method: string): Promise<string> {
//   if (method === 'bcrypt') {
//     const bcrypt = await import('bcrypt');
//     return bcrypt.hash(password, 10);
//   }
  // TODO: Add other hashing methods as needed
  return password;
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}