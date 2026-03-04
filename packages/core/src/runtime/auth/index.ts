export { syncAuthSchemas, AuthSchemaSync, type AuthSyncOptions, type AuthSyncResult } from './auth-sync.js';
export { generateAuthSchema } from './schema-generator.js';
export { generateAuthConfig } from './generator.js';
export { validateAuthSchema, logValidationResults, getSchemaRequirements } from './schema-validator.js';
export type { AuthConfig } from './types.js';
export * as defaultAuthSchema from './default-schema.js';
export { authHandle } from './hook.js'