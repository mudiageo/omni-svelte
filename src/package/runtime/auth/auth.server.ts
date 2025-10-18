import { betterAuth } from 'better-auth';
import generatedConfig from './__generated__/config';
import { getRequestEvent } from "$app/server";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDatabase } from '../..//database'
import { sveltekitCookies } from "better-auth/svelte-kit";

const db = getDatabase();
// Single auth instance
export const auth = betterAuth({
  ... generatedConfig,
  database: drizzleAdapter(db, {
    provider: "pg", // or "pg" or "mysql"
  }), 
  plugins: [...generatedConfig.plugins, sveltekitCookies(getRequestEvent)]
});

// Re-export common server utilities
export const {
  api: authApi,
  handler: authHandler,
  $fetch: authFetch,
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
    throw redirect(302, '/sign-in');
  }
  
  return session;
}