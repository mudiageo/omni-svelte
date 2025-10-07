import type { DatabaseConfig } from '$pkg/database';
import type { SchemaConfig } from '$pkg/schema/types';
import type { Config } from '@sveltejs/kit';

export interface SvelteConfig extends Config {
    omni: OmniConfig
}

export interface OmniConfig {
    database: DatabaseConfig
    schema: SchemaConfig
    auth: unknown;
    logging: unknown;
    cors: unknown;
    analytics: unknown;
    errorReporting: unknown;
}