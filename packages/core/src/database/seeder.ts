import { getDatabase } from './database.js'

export abstract class Seeder {
	abstract run(): Promise<void>

	protected async call(seeders: (typeof Seeder)[]) {
		for (const SeederClass of seeders) {
			const seeder = new SeederClass()
			console.log(`Running seeder: ${SeederClass.name}`)
			await seeder.run()
			console.log(`✅ Seeder ${SeederClass.name} completed`)
		}
	}

	protected async truncate(tables: string[]) {
		const db = getDatabase()
		
		for (const table of tables) {
			await db.execute(sql`TRUNCATE TABLE ${sql.identifier(table)} RESTART IDENTITY CASCADE`)
		}
	}
}

export class DatabaseSeeder extends Seeder {
	async run() {
		// Override in your application
		// await this.call([UserSeeder, PostSeeder])
	}
}

export async function runSeeders(seeders: (typeof Seeder)[] = [DatabaseSeeder]) {
	console.log('🌱 Starting database seeding...')
	
	for (const SeederClass of seeders) {
		const seeder = new SeederClass()
		await seeder.run()
	}
	
	console.log('🌱 Database seeding completed!')
}
