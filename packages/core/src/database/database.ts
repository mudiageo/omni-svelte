import { drizzle } from 'drizzle-orm/postgres-js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { loadEnvFile } from 'node:process';
try {
	loadEnvFile();
} catch (e: any) {
	if (e?.code !== 'ENOENT') {
		throw e;
	}
}

export let database: PostgresJsDatabase = process.env.DATABASE_URL
	? drizzle({ connection: { url: process.env.DATABASE_URL } })
	: (null as any);

export interface DatabaseConnectionConfig {
	url?: string; // Connection string takes priority
	host?: string;
	port?: number;
	database?: string;
	username?: string;
	password?: string;
	ssl?: boolean;
}
export interface DatabaseConfig {
	enabled: boolean;
	connection: DatabaseConnectionConfig;
	schema: any;
}

export function configureDatabase(config: DatabaseConfig) {
	const url = config?.connection?.url || process.env.DATABASE_URL;
	let connectionOpts = {};

	if (url) {
		connectionOpts = { url };
	} else {
		// Fall back to individual parameters
		if (!config?.connection?.host || !config?.connection?.database || !config?.connection?.username) {
			throw new Error(
				'Either provide a DATABASE_URL or all required connection parameters (host, database, username)'
			);
		}

		connectionOpts = {
			host: config.connection.host,
			port: config.connection.port || 5432,
			database: config.connection.database,
			username: config.connection.username,
			password: config.connection.password,
			ssl: config.connection.ssl
		};
	}

	database = drizzle({ connection: connectionOpts, schema: config?.schema });
	return database;
}

export function getDatabase(): PostgresJsDatabase {
	if (!database) {
		throw new Error('Database not initialized. Call configureDatabase() first.');
	}
	return database;
}
