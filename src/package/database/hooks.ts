import type { Handle, RequestEvent, ServerInit } from '@sveltejs/kit'
import { configureDatabase, getDatabase } from './database.js'
import { QueryBuilder } from './query-builder.js'
import type { DatabaseConfig } from './database.js'
import type { Model } from './model.js'
import { sql } from 'drizzle-orm'

export interface QueryHelpers {
	model<T extends typeof Model>(modelClass: T): QueryBuilder<T>
	raw(rawSql: string): Promise<any>
	transaction<T>(callback: (db: ReturnType<typeof getDatabase>) => Promise<T>): Promise<T>
	[key: string]: any // Allow dynamic model properties
}

export interface OmniSvelteLocals {
	db: ReturnType<typeof getDatabase>
	query: QueryHelpers
	user?: any
}


// Model registry for dynamic access
const modelRegistry = new Map<string, typeof Model>()

export const registerModel = (name: string, modelClass: typeof Model) => {
	modelRegistry.set(name, modelClass)
}
export const initDb = (config: DatabaseConfig) => {
	// Initialize database connection
	if(configureDatabase(config)) console.log("Database initialised")
}

export async  function createDatabaseHandle({ event, resolve }: { event: RequestEvent, resolve: any }) {
		// Add database to locals
		event.locals.db = getDatabase()
		//  event.locals.db = configureDatabase(config.database)

		// Add query helpers to locals with dynamic model access
		event.locals.query = {
			model: <T extends typeof Model>(modelClass: T) => new QueryBuilder(modelClass),
			raw: async (rawSql: string) => {
				return await event.locals.db.execute(sql.raw(rawSql))
			},
			transaction: async <T>(callback: (db: ReturnType<typeof getDatabase>) => Promise<T>) => {
				return await event.locals.db.transaction(callback)
			}
		}

		// Add registered models as properties
		for (const [name, modelClass] of modelRegistry) {
			Object.defineProperty(event.locals.query, name, {
				get: () => modelClass.query(),
				enumerable: true
			})
		}

		// Add any user context here
		// event.locals.user = await getUserFromSession(event)

		const response = await resolve(event)
		return response
}

// Helper for getting typed locals
export function getOmniLocals(event: RequestEvent): OmniSvelteLocals {
	return event.locals as OmniSvelteLocals
}

// Transaction helper for SvelteKit actions
export async function withTransaction<T>(
	event: RequestEvent,
	callback: (db: ReturnType<typeof getDatabase>) => Promise<T>
): Promise<T> {
	const { db } = getOmniLocals(event)
	
	return await db.transaction(async (tx) => {
		return await callback(tx)
	})
}
