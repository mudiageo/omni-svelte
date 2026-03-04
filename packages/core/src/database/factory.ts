import type { Model } from './model.js'

type Instantiable<T = {}> = new (...args: any[]) => T;
type ConcreteClass<T> = Instantiable<T> & {
    prototype: T;
};

export abstract class Factory<T extends Model> {
	protected modelClass: ConcreteClass<T>
	protected count = 1
	protected states: Record<string, any> = {}

	constructor(modelClass: ConcreteClass<T>) {
		this.modelClass = modelClass
	}

	abstract definition(): Record<string, any>

	// Create multiple instances
	times(count: number) {
		this.count = count
		return this
	}

	// Apply state transformations
	state(name: string, attributes: Record<string, any> = {}) {
		this.states[name] = attributes
		return this
	}

	// Generate fake data
	async make(): Promise<T[]> {
		const instances: T[] = []

		for (let i = 0; i < this.count; i++) {
			let attributes = this.definition()
			
			// Apply states
			for (const stateAttributes of Object.values(this.states)) {
				attributes = { ...attributes, ...stateAttributes }
			}

			const instance = new this.modelClass(attributes) as T
			instances.push(instance)
		}

		return instances
	}

	// Create and persist to database
	async create(): Promise<T[]> {
		const instances = await this.make()
		
		for (const instance of instances) {
			await instance.save()
		}

		return instances
	}

	// Create a single instance
	async createOne(): Promise<T> {
		const instances = await this.times(1).create()
		return instances[0]
	}

	// Create with relationships
	async createWith(relationships: Record<string, Factory<any> | any[]>) {
		const instances = await this.make()
		
		for (const instance of instances) {
			// Save the main instance first
			await instance.save()
			
			// Create relationships
			for (const [relationName, factory] of Object.entries(relationships)) {
				if (factory instanceof Factory) {
					const related = await factory.create()
					instance.setRelation(relationName, related)
				} else if (Array.isArray(factory)) {
					instance.setRelation(relationName, factory)
				}
			}
		}

		return instances
	}
}

// Faker utilities
export class Faker {
	static name() {
		const names = ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana']
		return names[Math.floor(Math.random() * names.length)]
	}

	static email() {
		const domains = ['example.com', 'test.com', 'demo.org']
		const domain = domains[Math.floor(Math.random() * domains.length)]
		return `${this.name().toLowerCase()}@${domain}`
	}

	static randomInt(min = 1, max = 100) {
		return Math.floor(Math.random() * (max - min + 1)) + min
	}

	static randomFloat(min = 0, max = 100, decimals = 2) {
		const num = Math.random() * (max - min) + min
		return Number(num.toFixed(decimals))
	}

	static boolean() {
		return Math.random() > 0.5
	}

	static dateTime(from = new Date(2020, 0, 1), to = new Date()) {
		const fromTime = from.getTime()
		const toTime = to.getTime()
		return new Date(fromTime + Math.random() * (toTime - fromTime))
	}

	static text(sentences = 3) {
		const words = ['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit']
		const result = []
		
		for (let i = 0; i < sentences; i++) {
			const sentence = []
			const wordCount = this.randomInt(5, 12)
			
			for (let j = 0; j < wordCount; j++) {
				sentence.push(words[Math.floor(Math.random() * words.length)])
			}
			
			result.push(sentence.join(' ') + '.')
		}
		
		return result.join(' ')
	}
}
