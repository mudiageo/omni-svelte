import { betterAuth } from 'better-auth';
import generatedConfig from './__generated__/config.js';
import { getRequestEvent } from "$app/server";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDatabase } from '../../database'
import { sveltekitCookies } from "better-auth/svelte-kit";
import { redirect, type RequestEvent } from '@sveltejs/kit';
import { getAuthSchema } from './schema-generator';
import { validateAuthSchema, logValidationResults } from './schema-validator';

const db = getDatabase();
const isDev = process.env.NODE_ENV !== 'production';
const projectRoot = process.cwd();

// Get auth schema (hybrid approach: files in dev, direct in prod)
const schema = await getAuthSchema(projectRoot, generatedConfig, isDev);
// Validate schema in development
if (isDev) {
  const validation = validateAuthSchema(schema, generatedConfig);
  logValidationResults(validation, true);
  
  if (!validation.valid) {
    console.error('\n⚠️  Auth schema validation failed. Authentication may not work correctly.');
    console.error('Run the build process to regenerate the auth schema.\n');
  }
}

// Single auth instance
export const auth = betterAuth({
  ...generatedConfig,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  plugins: [...(generatedConfig.plugins || []), sveltekitCookies(getRequestEvent)]
} as any);

// Re-export common server utilities
export const {
  api: authApi,
  handler: authHandler,
} = auth;

// Helper to get session in SvelteKit load functions
export async function getSession(event: RequestEvent) {
  const session = await auth.api.getSession({
    headers: event.request.headers,
  });
  
  return session;
}

// Helper for protected routes
export async function requireAuth(event: RequestEvent) {
  const session = await getSession(event);
  
  if (!session?.user) {
    redirect(302, '/sign-in');
  }
  
  return session;
}