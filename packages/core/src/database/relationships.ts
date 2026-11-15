import { eq, inArray } from 'drizzle-orm';
import { getDatabase } from './database.js';
import type { Model, ReadonlyModel } from './model.js';
import { getModel } from './hooks.js';
import { getVirtualRelationRegistry } from '../schema/virtual-relations.js';

export interface Relationship {
	type: 'belongsTo' | 'hasMany' | 'hasOne' | 'manyToMany' | 'morphTo' | 'morphMany';
	model: string;
	foreignKey?: string; // for belongsTo and hasMany
	localKey?: string; // for hasMany and hasOne
	ownerKey?: string;
	pivotTable?: any;
	foreignPivotKey?: string;
	relatedPivotKey?: string;
	related?: any;
}

export class RelationshipLoader {
	static async loadRelations<T extends ReadonlyModel>(
		models: T[],
		relations: string[]
	): Promise<T[]> {
		for (const relation of relations) {
			await this.loadRelationPath(models, relation);
		}
		return models;
	}

	private static async loadRelationPath<T extends ReadonlyModel>(
		models: T[],
		relationPath: string
	) {
		if (models.length === 0) return;
		const parts = relationPath.split('.');
		const currentRel = parts[0];

		const needsLoad = models.some((m) => m.getRelation(currentRel) === undefined);
		if (needsLoad) {
			await this.loadRelation(models, currentRel);
		}

		if (parts.length > 1) {
			const rest = parts.slice(1).join('.');
			const nextModels: any[] = [];
			for (const model of models) {
				const val = model.getRelation(currentRel);
				if (Array.isArray(val)) {
					nextModels.push(...val);
				} else if (val) {
					nextModels.push(val);
				}
			}
			if (nextModels.length > 0) {
				await this.loadRelations(nextModels, [rest]);
			}
		}
	}

	private static async loadRelation<T extends ReadonlyModel>(models: T[], relationName: string) {
		if (models.length === 0) return;

		const modelClass = models[0].constructor as typeof ReadonlyModel;
		let relationship: Relationship = modelClass.relationships?.[relationName];

		if (!relationship) {
			const systemKey = (modelClass as any).systemKey || (modelClass as any).tableName;
			if (systemKey) {
				const vRels = getVirtualRelationRegistry().for(systemKey);
				const vr = vRels.find((r) => r.name === relationName);
				if (vr) {
					relationship = {
						type: vr.kind,
						model: vr.targetModel || vr.targetTable,
						foreignKey: vr.foreignKey.property || vr.foreignKey.column,
						localKey: vr.ownerKey || (modelClass as any).primaryKey || 'id',
						...(vr.pivotTable || vr.through ? { pivotTable: vr.pivotTable || vr.through } : {}),
						...(vr.foreignPivotKey ? { foreignPivotKey: vr.foreignPivotKey } : {}),
						...(vr.relatedPivotKey ? { relatedPivotKey: vr.relatedPivotKey } : {})
					};
					if (!Object.prototype.hasOwnProperty.call(modelClass, 'relationships')) {
						modelClass.relationships = { ...modelClass.relationships };
					}
					modelClass.relationships[relationName] = relationship;
				}
			}
		}

		if (!relationship) {
			throw new Error(`Relationship ${relationName} not found on ${modelClass.name}`);
		}

		if (!relationship.related && relationship.model) {
			relationship.related = getModel(relationship.model);
			if (!relationship.related) {
				throw new Error(`Related model ${relationship.model} not found in registry`);
			}
		}

		switch (relationship.type) {
			case 'hasMany':
				return this.loadHasMany(models, relationship, relationName);
			case 'belongsTo':
				return this.loadBelongsTo(models, relationship, relationName);
			case 'hasOne':
				return this.loadHasOne(models, relationship, relationName);
			case 'manyToMany':
				return this.loadManyToMany(models, relationship, relationName);
			case 'morphTo':
			case 'morphMany':
				// TODO: implement polymorphic eager loading
				throw new Error(`Polymorphic eager loading (${relationship.type}) is not yet supported.`);
			default:
				throw new Error(`Unsupported relationship type ${relationship.type}`);
		}
	}

	private static async loadHasMany<T extends ReadonlyModel>(
		models: T[],
		relationship: any,
		relationName: string
	) {
		const db = getDatabase();
		const localKeys = models.map((model) => model.getAttribute(relationship.localKey));

		// Use Drizzle's inArray for efficient querying
		const relatedModels = await db
			.select()
			.from(relationship.related.table)
			.where(inArray(relationship.related.table[relationship.foreignKey], localKeys));

		// Group related models by foreign key
		const grouped = relatedModels.reduce((acc, model) => {
			const key = model[relationship.foreignKey];
			if (!acc[key]) acc[key] = [];
			acc[key].push(new relationship.related(model));
			return acc;
		}, {});

		// Assign to parent models
		models.forEach((model) => {
			const key = model.getAttribute(relationship.localKey);
			model.setRelation(relationName, grouped[key] || []);
		});
	}

	private static async loadBelongsTo<T extends ReadonlyModel>(
		models: T[],
		relationship: any,
		relationName: string
	) {
		const db = getDatabase();
		const foreignKeys = [
			...new Set(models.map((model) => model.getAttribute(relationship.foreignKey)).filter(Boolean))
		];

		if (foreignKeys.length === 0) return;

		const ownerKey = relationship.ownerKey || relationship.localKey || 'id';

		const relatedModels = await db
			.select()
			.from(relationship.related.table)
			.where(inArray(relationship.related.table[ownerKey], foreignKeys));

		const relatedMap = relatedModels.reduce((acc, model) => {
			acc[model[ownerKey]] = new relationship.related(model);
			return acc;
		}, {});

		models.forEach((model) => {
			const foreignKey = model.getAttribute(relationship.foreignKey);
			model.setRelation(relationName, relatedMap[foreignKey] || null);
		});
	}

	private static async loadHasOne<T extends ReadonlyModel>(
		models: T[],
		relationship: any,
		relationName: string
	) {
		const db = getDatabase();
		const localKeys = models.map((model) => model.getAttribute(relationship.localKey));

		const relatedModels = await db
			.select()
			.from(relationship.related.table)
			.where(inArray(relationship.related.table[relationship.foreignKey], localKeys));

		const relatedMap = relatedModels.reduce(
			(acc, model) => {
				acc[model[relationship.foreignKey]] = new relationship.related(model);
				return acc;
			},
			{} as Record<string, any>
		);

		models.forEach((model) => {
			const key = model.getAttribute(relationship.localKey);
			model.setRelation(relationName, relatedMap[key] || null);
		});
	}

	private static async loadManyToMany<T extends ReadonlyModel>(
		models: T[],
		relationship: any,
		relationName: string
	) {
		const db = getDatabase();
		const localKeys = models.map((model) => model.getAttribute(relationship.localKey || 'id'));

		// Resolve serialized table name into a table object
		let pivotTable = relationship.pivotTable;
		if (typeof pivotTable === 'string') {
			// Try to find a registered model for the pivot table first
			const pivotModel = getModel(pivotTable);
			if (pivotModel) {
				pivotTable = pivotModel.table;
			} else {
				// Create a dynamic table object for Drizzle
				const { pgTable, customType } = await import('drizzle-orm/pg-core');
				const dynamicType = customType<{ data: any }>({
					dataType() {
						return 'text';
					}
				});
				pivotTable = pgTable(pivotTable, {
					[relationship.foreignPivotKey]: dynamicType(relationship.foreignPivotKey),
					[relationship.relatedPivotKey]: dynamicType(relationship.relatedPivotKey)
				});
			}
			// Cache it back on the relationship for future calls
			relationship.pivotTable = pivotTable;
		}

		// First, get the pivot relationships
		const pivotResults = await db
			.select()
			.from(pivotTable)
			.where(inArray(pivotTable[relationship.foreignPivotKey], localKeys));

		if (pivotResults.length === 0) {
			models.forEach((model) => model.setRelation(relationName, []));
			return;
		}

		const relatedKeys = pivotResults.map((pivot) => pivot[relationship.relatedPivotKey]);

		// Then get the related models
		const relatedModels = await db
			.select()
			.from(relationship.related.table)
			.where(
				inArray(relationship.related.table[relationship.related.primaryKey || 'id'], relatedKeys)
			);

		// Create mapping from pivot data
		const pivotMap = pivotResults.reduce(
			(acc, pivot) => {
				const key = pivot[relationship.foreignPivotKey];
				if (!acc[key]) acc[key] = [];
				acc[key].push(pivot[relationship.relatedPivotKey]);
				return acc;
			},
			{} as Record<string, any[]>
		);

		const relatedMap = relatedModels.reduce(
			(acc, model) => {
				acc[model[relationship.related.primaryKey || 'id']] = new relationship.related(model);
				return acc;
			},
			{} as Record<string, any>
		);

		// Assign to parent models
		models.forEach((model) => {
			const key = model.getAttribute(relationship.localKey || 'id');
			const relatedKeys = pivotMap[key] || [];
			const relatedInstances: Model[] = relatedKeys
				.map((relatedKey: string | number) => relatedMap[relatedKey])
				.filter(Boolean);
			model.setRelation(relationName, relatedInstances);
		});
	}
}
