import type { DatabaseConfig } from '$pkg/database';
import type { SchemaConfig } from '$pkg/schema/types';
import type { AuthConfig } from '$pkg/runtime/auth/types';
import type { Config, KitConfig } from '@sveltejs/kit';

/**
 * Core omni-svelte configuration.
 */
export interface OmniConfig {
	/**
	 * SvelteKit specific configuration options.
	 */
	kit?: KitConfig;
	/**
	 * Database connection and initialization settings.
	 */
	database?: DatabaseConfig;
	/**
	 * Schema generation configuration for Drizzle and Zod.
	 */
	schema?: SchemaConfig;
	/**
	 * Auth configuration options.
	 */
	auth?: AuthConfig;
	/**
	 * Server and client logging settings.
	 */
	logging?: { enabled?: boolean; [key: string]: unknown };
	/**
	 * CORS configuration for API routes.
	 */
	cors?: { enabled?: boolean; [key: string]: unknown };
	/**
	 * Analytics integration configuration.
	 */
	analytics?: { enabled?: boolean; [key: string]: unknown };
	/**
	 * Error reporting integration (e.g., Sentry) settings.
	 */
	errorReporting?: { enabled?: boolean; [key: string]: unknown };
}

/**
 * Combined configuration for the omniSvelte Vite plugin.
 * Includes both omni-specific options and standard Svelte configuration.
 */
export type OmniSvelteConfig = OmniConfig & Config;
