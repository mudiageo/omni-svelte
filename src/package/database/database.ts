import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { env } from '$env/dynamic/private'

export let database: PostgresJsDatabase = drizzle(postgres(env.DATABASE_URL))

export interface DatabaseConnectionConfig {
    url?: string // Connection string takes priority
    host?: string
    port?: number
    database?: string
    username?: string
    password?: string
    ssl?: boolean
}
export interface DatabaseConfig {
    enabled: boolean
    connection: DatabaseConnectionConfig
    schema: any

}

export function configureDatabase(config: DatabaseConfig) {
    let client: postgres.Sql
    
    const url = config?.connection.url || env.DATABASE_URL
    if (url) {
        // Use connection string if provided
        client = postgres(url)
    } else {
        // Fall back to individual parameters
        if (!config?.connection.host || !config?.connection.database || !config?.connection.username) {
            throw new Error('Either provide a DATABASE_URL or all required connection parameters (host, database, username)')
        }
        
        client = postgres({
            host: config?.connection.host,
            port: config?.connection.port || 5432,
            database: config?.connection.database,
            username: config?.connection.username,
            password: config?.connection.password,
            ssl: config?.connection.ssl
        })
    }
    
    database = drizzle(client, { schema: config.schema})
    return database
}

export function getDatabase(): PostgresJsDatabase {
    if (!database) {
        throw new Error('Database not initialized. Call configureDatabase() first.');
    }
    return database;
}