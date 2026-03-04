import type { DatabaseConfig } from '$pkg/database';
import type { SchemaConfig } from '$pkg/schema/types';
import type { AuthConfig } from '$pkg/runtime/auth/types';
import type { Config } from '@sveltejs/kit';

export interface SvelteConfig extends Config {
    omni: OmniConfig
}

export interface OmniConfig {
    database: DatabaseConfig
    schema: SchemaConfig
    auth: AuthConfig;
    logging: unknown;
    cors: unknown;
    analytics: unknown;
    errorReporting: unknown;
}