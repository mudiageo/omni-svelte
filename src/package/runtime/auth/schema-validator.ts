/**
 * Validates that auth schema contains all required tables and fields
 * based on Better Auth configuration
 */

interface ValidationError {
  type: 'missing_table' | 'missing_field' | 'invalid_type';
  message: string;
  table?: string;
  field?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

/**
 * Core tables required by Better Auth
 */
const CORE_TABLES = ['user', 'session', 'account', 'verification'];

/**
 * Plugin-specific table requirements
 */
const PLUGIN_TABLES: Record<string, string[]> = {
  passkey: ['passkey'],
  twoFactor: ['twoFactorBackupCode'],
  organization: ['organization', 'member', 'invitation'],
  admin: [], // Admin plugin modifies existing tables
  multiSession: [], // Uses session table
  bearer: [], // Uses account table
  jwt: [], // No additional tables
  openAPI: [], // No additional tables
};

/**
 * Required fields for core tables
 */
const REQUIRED_FIELDS: Record<string, string[]> = {
  user: ['id', 'email', 'emailVerified', 'createdAt', 'updatedAt'],
  session: ['id', 'userId', 'expiresAt', 'token', 'createdAt', 'updatedAt'],
  account: ['id', 'userId', 'accountId', 'providerId', 'createdAt', 'updatedAt'],
  verification: ['id', 'identifier', 'value', 'expiresAt'],
};

/**
 * Validate auth schema against Better Auth configuration
 */
export function validateAuthSchema(schema: any, config: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // Check core tables
  for (const table of CORE_TABLES) {
    if (!schema[table]) {
      errors.push({
        type: 'missing_table',
        message: `Missing required table: ${table}`,
        table,
      });
      continue;
    }

    // Check required fields for this table
    const requiredFields = REQUIRED_FIELDS[table] || [];
    for (const field of requiredFields) {
      if (!schema[table][field] && !hasField(schema[table], field)) {
        errors.push({
          type: 'missing_field',
          message: `Missing required field: ${table}.${field}`,
          table,
          field,
        });
      }
    }
  }

  // Check plugin-specific tables
  if (config.plugins && Array.isArray(config.plugins)) {
    for (const plugin of config.plugins) {
      const pluginId = getPluginId(plugin);
      const requiredTables = PLUGIN_TABLES[pluginId] || [];
      
      for (const table of requiredTables) {
        if (!schema[table]) {
          errors.push({
            type: 'missing_table',
            message: `Missing table required by ${pluginId} plugin: ${table}`,
            table,
          });
        }
      }
    }
  }

  // Warnings for common issues
  if (!schema.user?.emailVerified) {
    warnings.push('User table missing emailVerified field - email verification may not work');
  }

  if (!schema.session?.token) {
    warnings.push('Session table missing token field - sessions may not work correctly');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Helper to check if a Drizzle table definition has a specific field
 */
function hasField(tableObj: any, fieldName: string): boolean {
  // Drizzle tables store columns in a special structure
  // Try multiple access patterns
  if (tableObj[fieldName]) return true;
  if (tableObj._.columns && tableObj._.columns[fieldName]) return true;
  if (tableObj.$inferSelect && fieldName in tableObj.$inferSelect) return true;
  return false;
}

/**
 * Extract plugin ID from plugin object or function
 */
function getPluginId(plugin: any): string {
  if (typeof plugin === 'string') return plugin;
  if (plugin.id) return plugin.id;
  if (plugin.name) return plugin.name;
  if (plugin.$id) return plugin.$id;
  return 'unknown';
}

/**
 * Log validation results
 */
export function logValidationResults(result: ValidationResult, verbose: boolean = true): void {
  if (result.valid) {
    if (verbose) {
      console.log('✅ Auth schema validation passed');
      if (result.warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        result.warnings.forEach(w => console.log(`   - ${w}`));
      }
    }
    return;
  }

  console.error('\n❌ Auth schema validation failed:');
  result.errors.forEach(error => {
    console.error(`   - ${error.message}`);
  });

  if (result.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    result.warnings.forEach(w => console.log(`   - ${w}`));
  }

  console.error('\nPlease regenerate your auth schema or check your Better Auth configuration.');
}

/**
 * Get detailed requirements for current config
 */
export function getSchemaRequirements(config: any): {
  requiredTables: string[];
  requiredFields: Record<string, string[]>;
} {
  const requiredTables = [...CORE_TABLES];
  const requiredFields = { ...REQUIRED_FIELDS };

  if (config.plugins && Array.isArray(config.plugins)) {
    for (const plugin of config.plugins) {
      const pluginId = getPluginId(plugin);
      const tables = PLUGIN_TABLES[pluginId] || [];
      requiredTables.push(...tables);
    }
  }

  return {
    requiredTables: Array.from(new Set(requiredTables)),
    requiredFields,
  };
}
