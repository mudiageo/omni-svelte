import { sql } from 'drizzle-orm'
import { getDatabase } from './database.js'

export abstract class Migration {
  abstract up(): Promise<void>
  abstract down(): Promise<void>

  protected async execute(query: string) {
    const db = getDatabase()
    await db.execute(sql.raw(query))
  }

  // Helper methods for common operations
  protected createTable(name: string, columns: string) {
    return `CREATE TABLE ${name} (${columns})`
  }

  protected addColumn(table: string, column: string, type: string) {
    return `ALTER TABLE ${table} ADD COLUMN ${column} ${type}`
  }

  protected dropColumn(table: string, column: string) {
    return `ALTER TABLE ${table} DROP COLUMN ${column}`
  }

  protected addIndex(table: string, columns: string[], name?: string) {
    const indexName = name || `${table}_${columns.join('_')}_index`
    return `CREATE INDEX ${indexName} ON ${table} (${columns.join(', ')})`
  }

  protected addForeignKey(table: string, column: string, references: string) {
    return `ALTER TABLE ${table} ADD CONSTRAINT fk_${table}_${column} 
            FOREIGN KEY (${column}) REFERENCES ${references}`
  }
}

// packages/database/src/migrations/runner.ts
export class MigrationRunner {
  private migrationsPath: string

  constructor(migrationsPath = './migrations') {
    this.migrationsPath = migrationsPath
  }

  async runMigrations() {
    const db = getDatabase()
    
    // Ensure migrations table exists
    await this.createMigrationsTable()
    
    // Get pending migrations
    const pendingMigrations = await this.getPendingMigrations()
    
    for (const migration of pendingMigrations) {
      console.log(`Running migration: ${migration.name}`)
      
      try {
        await migration.instance.up()
        await this.recordMigration(migration.name)
        console.log(`✅ Migration ${migration.name} completed`)
      } catch (error) {
        console.error(`❌ Migration ${migration.name} failed:`, error)
        throw error
      }
    }
  }

  async rollback(steps = 1) {
    const db = getDatabase()
    const executedMigrations = await this.getExecutedMigrations()
    
    for (let i = 0; i < steps && i < executedMigrations.length; i++) {
      const migration = executedMigrations[i]
      console.log(`Rolling back migration: ${migration.name}`)
      
      try {
        await migration.instance.down()
        await this.removeMigrationRecord(migration.name)
        console.log(`✅ Rollback ${migration.name} completed`)
      } catch (error) {
        console.error(`❌ Rollback ${migration.name} failed:`, error)
        throw error
      }
    }
  }

  private async createMigrationsTable() {
    const db = getDatabase()
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
  }
}