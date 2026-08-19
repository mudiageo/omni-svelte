/**
 * OmniSvelte Drizzle PostgreSQL Export
 * 
 * Re-exports the underlying drizzle-orm modules used by the code generator.
 * This ensures consumer projects use the exact same Drizzle instance and types
 * as the framework, preventing version mismatch issues.
 */

// Re-export common drizzle-orm utilities
export * from 'drizzle-orm';

// Re-export postgres-specific core
export * from 'drizzle-orm/pg-core';
