import { eq, and, or, desc, asc, sql } from 'drizzle-orm';
import { getDatabase } from './database.js'
import { RelationshipLoader } from './relationships.js'
import { registerModel } from './hooks.js'
import type { PgTable, PgSelectQueryBuilder } from 'drizzle-orm/pg-core';
import { QueryBuilder } from './query-builder.js';
import { z } from 'zod';

export abstract class Model {
	static table: PgTable;
	static primaryKey = 'id';
	static timestamps = true;
	static fillable: string[] = [];
	static hidden: string[] = [];
	static casts: Record<string, 'string' | 'number' | 'boolean' | 'date' | 'json'> = {};
	static drizzleTable: any;
	static validation: { create: z.ZodSchema; update: z.ZodSchema };
	static hooks: Record<string, Function[]>;
	static realtime: any;

	// Relationship definitions
	static relationships: Record<string, any> = {};

	// Instance properties
	public attributes: Record<string, any> = {};
	public original: Record<string, any> = {};
	public relations: Record<string, any> = {};
	public exists = false;
	public isDirty = false;
	
	private dirty: Set<string> = new Set();



	constructor(attributes: Record<string, any> = {}) {
		this.fill(attributes);
		this.syncOriginal();
		this.setupAttributeAccessors();
	}

	static query() {
		return new QueryBuilder(this);
	}

	static with(relations: string[]) {
		return this.query().with(relations);
	}

	// Escape hatch for full Drizzle power
	static drizzle() {
		return getDatabase();
	}

	static all() {
		return this.query().get();
	}

	static find(id: any) {
		return this.query().where(this.primaryKey, id).first();
	}

	static findOrFail(id: any) {
		return this.query().where(this.primaryKey, id).firstOrFail();
	}

	static where(column: string, operator?: any, value?: any) {
		return this.query().where(column, operator, value);
	}

	static create(attributes: Record<string, any>) {
		const instance = new this(attributes);

		return instance.save();
	}

	update(updatedData: Record<string, any>) {
		this.fill(updatedData);

		return this.save();
	}

	// Setup property accessors for attributes
	private setupAttributeAccessors() {
		// Get all possible attribute keys from current attributes and common table columns
		const allKeys = new Set([
			...Object.keys(this.attributes),
			// Add common table columns that might not be in attributes yet
			'id', 'created_at', 'updated_at'
		]);

		// Try to get column names from the table if available
		try {
			const table = (this.constructor as typeof Model).table;
			if (table && typeof table === 'object') {
				// Get column names from table schema
				const columns = Object.keys(table);
				columns.forEach(col => allKeys.add(col));
			}
		} catch (error) {
			// Ignore errors accessing table schema
		}

		for (const key of allKeys) {
			// Skip if property already exists (avoid overriding methods)
			if (this.hasOwnProperty(key) || key in this) continue;

			Object.defineProperty(this, key, {
				get: () => this.getAttribute(key),
				set: (value: any) => this.setAttribute(key, value),
				enumerable: true,
				configurable: true
			});
		}
	}

	// Instance methods
	fill(attributes: Record<string, any>) {
		for (const [key, value] of Object.entries(attributes)) {
			if (this.isFillable(key)) {
				this.setAttribute(key, value);
			}
		}
		
		// Setup accessors for any new attributes
		this.setupAttributeAccessors();
		return this;
	}

	private isFillable(key: string): boolean {
		const fillable = (this.constructor as typeof Model).fillable;
		return fillable.length === 0 || fillable.includes(key);
	}

	async save() {
		if ((this.constructor as typeof Model).timestamps) {
			this.updateTimestamps();
		}
		
		if (this.exists) {
			return this.performUpdate();
		} else {
			return this.performInsert();
		}
	}

	async delete() {
		const constructor = this.constructor as typeof Model;

		if (!this.exists) return false;

		const db = getDatabase();

		// Check for soft deletes
		if (this.attributes.deleted_at !== undefined) {
			this.attributes.deleted_at = new Date();
			await this.save();
		} else {
			await db
				.delete(constructor.table)
				.where(eq((constructor.table as any)[constructor.primaryKey], this.getKey()));
		}


		this.exists = false;

		// Broadcast realtime event
		if (constructor.realtime?.enabled && constructor.realtime.events?.includes('deleted')) {
			constructor.broadcastRealtimeEvent('deleted', this);
		}


		return true;
	}

	// Enhanced attribute management with automatic casting
	setAttribute(key: string, value: any) {
		this.attributes[key] = this.castAttribute(key, value);
		this.isDirty = true;
		
		// Setup accessor if it doesn't exist
		if (!this.hasOwnProperty(key) && !(key in this)) {
			Object.defineProperty(this, key, {
				get: () => this.getAttribute(key),
				set: (value: any) => this.setAttribute(key, value),
				enumerable: true,
				configurable: true
			});
		}
	}

	getAttribute(key: string) {
		// Return the raw value from attributes without additional casting
		// since casting is already done in setAttribute
		return this.attributes[key];
	}

	// Automatic timestamp management
	private updateTimestamps() {
		const now = new Date();
		if (!this.exists) {
			this.setAttribute('created_at', now);
		}
		this.setAttribute('updated_at', now);
	}

	// Enhanced attribute casting
	private castAttribute(key: string, value: any) {
		if (value === null || value === undefined) return value;
		
		const cast = (this.constructor as typeof Model).casts[key];
		if (!cast) return value;

		switch (cast) {
			case 'string':
				return String(value);
			case 'number':
				return Number(value);
			case 'boolean':
				return typeof value === 'string' ? 
					['true', '1', 'yes', 'on'].includes(value.toLowerCase()) : 
					Boolean(value);
			case 'date':
				return value instanceof Date ? value : new Date(value);
			case 'json':
				return typeof value === 'string' ? JSON.parse(value) : value;
			default:
				return value;
		}
	}

	static fromAttributes<T extends typeof Model>(this: T, attributes: Record<string, any>): InstanceType<T> {
		const instance = new this() as InstanceType<T>
		
		// Directly set attributes without going through fill() to avoid fillable restrictions
		instance.attributes = { ...attributes }
		instance.exists = true
		instance.isDirty = false
		instance.syncOriginal()
		instance.setupAttributeAccessors()
		
		return instance
	}

	// Serialization with hidden attributes
	toJSON() {
		const attributes = { ...this.attributes };
		const hidden = (this.constructor as typeof Model).hidden;
		
		for (const key of hidden) {
			delete attributes[key];
		}
		
		// Include loaded relations
		for (const [key, value] of Object.entries(this.relations)) {
			attributes[key] = value;
		}
		
		return attributes;
	}

	// Relationship methods
	setRelation(name: string, value: any) {
		this.relations[name] = value;
	}

	getRelation(name: string) {
		return this.relations[name];
	}

	async load(relations: string[]) {
		await RelationshipLoader.loadRelations([this], relations);
		return this;
	}

	// Helper methods for defining relationships
	static hasMany(related: typeof Model, foreignKey?: string, localKey?: string) {
		return {
			type: 'hasMany',
			related,
			foreignKey: foreignKey || `${this.name.toLowerCase()}_id`,
			localKey: localKey || this.primaryKey
		};
	}

	static belongsTo(related: typeof Model, foreignKey?: string, ownerKey?: string) {
		return {
			type: 'belongsTo',
			related,
			foreignKey: foreignKey || `${related.name.toLowerCase()}_id`,
			ownerKey: ownerKey || related.primaryKey
		};
	}

	static hasOne(related: typeof Model, foreignKey?: string, localKey?: string) {
		return {
			type: 'hasOne',
			related,
			foreignKey: foreignKey || `${this.name.toLowerCase()}_id`,
			localKey: localKey || this.primaryKey
		};
	}

	static belongsToMany(related: typeof Model, pivotTable?: string, foreignPivotKey?: string, relatedPivotKey?: string) {
		return {
			type: 'belongsToMany',
			related,
			pivotTable: pivotTable || [this.name.toLowerCase(), related.name.toLowerCase()].sort().join('_'),
			foreignPivotKey: foreignPivotKey || `${this.name.toLowerCase()}_id`,
			relatedPivotKey: relatedPivotKey || `${related.name.toLowerCase()}_id`
		};
	}

	async performInsert() {
		const db = getDatabase();
		const insertData = this.getAttributesForInsert();
		const constructor = this.constructor as typeof Model;

		// Run validation
		const validation = constructor.validation.create.safeParse(insertData);
		if (!validation.success) {
			throw new Error(`Validation failed: ${validation.error.message}`);
		}

		// Run creating hooks
		await constructor.runHooks('creating', this);
		
		const result = await db
			.insert(constructor.table)
			.values(insertData)
			.returning();

		if (result[0]) {
			this.fill(result[0]);
			//Manually set id
			this.setAttribute('id', result[0]?.id)
			this.exists = true;
			this.isDirty = false;
			this.syncOriginal();
		}
		// Run created hooks
		await constructor.runHooks('created', this);

		// Broadcast realtime event
		if (constructor.realtime?.enabled && constructor.realtime.events?.includes('created')) {
			constructor.broadcastRealtimeEvent('created', this);
		}


		return this;
	}

	async performUpdate() {
		const constructor = this.constructor as typeof Model;

		const db = getDatabase();
		const updateData = this.getDirtyAttributes();
		
		if (Object.keys(updateData).length === 0) {
			return this;
		}

		// Run validation
		const validation = constructor.validation.update.safeParse(updateData);
		if (!validation.success) {
			throw new Error(`Validation failed: ${validation.error.message}`);
		}

		// Run updating hooks
		await constructor.runHooks('updating', this);

		await db
			.update(constructor.table)
			.set(updateData)
			.where(eq(
				(constructor.table as any)[constructor.primaryKey], 
				this.getKey()
			));

		this.isDirty = false;
		this.syncOriginal();

		// Run updated hooks
		await constructor.runHooks('updated', this);

		// Broadcast realtime event
		if (constructor.realtime?.enabled && constructor.realtime.events?.includes('updated')) {
			constructor.broadcastRealtimeEvent('updated', this);
		}
		return this;
	}

	private getAttributesForInsert() {
		const attributes = { ...this.attributes };
		
		if ((this.constructor as typeof Model).timestamps) {
			const now = new Date();
			attributes.created_at = now;
			attributes.updated_at = now;
		}
		
		return attributes;
	}

	private getDirtyAttributes() {
		const dirty: Record<string, any> = {};
		
		for (const [key, value] of Object.entries(this.attributes)) {
			if (this.original[key] !== value) {
				dirty[key] = value;
			}
		}
		
		if ((this.constructor as typeof Model).timestamps && Object.keys(dirty).length > 0) {
			dirty.updated_at = new Date();
		}
		
		return dirty;
	}

	private getKey() {
		return this.getAttribute((this.constructor as typeof Model).primaryKey);
	}

	private syncOriginal() {
		this.original = { ...this.attributes };
		this.isDirty = false;
	}

	// Auto-register model when class is defined
	static register(name?: string) {
		const modelName = name || this.name
		registerModel(modelName, this)
		return this
	}

	 // Hook system
	static async runHooks(event: string, model: any): Promise<void> {
		const hooks = this.hooks[event] || [];
		for (const hook of hooks) {
		await hook(model);
		}
	}

	// Realtime system
	static broadcastRealtimeEvent(event: string, model: any): void {
		if (this.realtime?.channels) {
		const channels = this.realtime.channels(model);
		channels.forEach((channel: string) => {
			// Implementation would depend on our realtime system (e.g. CrossWS, SSE)
			// broadcast(channel, event, model.toJSON());
		});
		}
	}

	// Extension system
	static extend(extensions: any): typeof Model {
		const ExtendedModel = class extends this {};

		Object.entries(extensions).forEach(([key, value]) => {
		if (typeof value === 'function') {
			(ExtendedModel.prototype as any)[key] = value;
		} else {
			(ExtendedModel as any)[key] = value;
		}
		});

		return ExtendedModel;
	}
}

// Decorator for auto-registration
export function RegisterModel(name?: string) {
	return function <T extends typeof Model>(target: T) {
		target.register(name)
		return target
	}
}
