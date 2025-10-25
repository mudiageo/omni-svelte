import { betterAuth } from 'better-auth';
import generatedConfig from './__generated__/config.js';
import { getRequestEvent } from "$app/server";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDatabase } from '../../database'
import { sveltekitCookies } from "better-auth/svelte-kit";
import { redirect, type RequestEvent } from '@sveltejs/kit';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { pathToFileURL } from 'url';
import * as defaultSchema from './default-schema';

const db = getDatabase();

// Dynamically load auth schema
async function getAuthSchema() {
  console.log(process.cwd())
  const authSchemaPath = resolve(process.cwd(), '__generated__/temp-auth-schema.ts');
  
  if (existsSync(authSchemaPath)) {
    try {
      const authModule = await import(pathToFileURL(authSchemaPath).href);
      return authModule;
    } catch (error) {
      console.warn('Failed to load auth schema, using default:', error);
    }
  }
  
  // Return default schema - provides minimum required tables for Better Auth
  return defaultSchema;
}

const schema = await getAuthSchema();

// Single auth instance
export const auth = betterAuth({
  ... generatedConfig,
  database: drizzleAdapter(db, {
    provider: "pg", // or "pg" or "mysql"
    schema,
  }), 
  plugins: [...generatedConfig.plugins, sveltekitCookies(getRequestEvent)]
});

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