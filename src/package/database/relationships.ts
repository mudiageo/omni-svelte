import { eq, inArray } from 'drizzle-orm'
import { getDatabase } from './database.js'
import type { Model } from './model.js'

export interface Relationship {
  type: 'belongsTo' | 'hasMany' | 'hasOne' | 'manyToMany';
  model: string;
  foreignKey?: string; // for belongsTo and hasMany
  localKey?: string; // for hasMany and hasOne
}

export class RelationshipLoader {
  static async loadRelations<T extends Model>(
    models: T[], 
    relations: string[]
  ): Promise<T[]> {
    for (const relation of relations) {
      await this.loadRelation(models, relation)
    }
    return models
  }

  private static async loadRelation<T extends Model>(
    models: T[], 
    relationName: string
  ) {
    if (models.length === 0) return

    const modelClass = models[0].constructor as typeof Model
    const relationship: Relationship = modelClass.relationships[relationName]
    
    if (!relationship) {
      throw new Error(`Relationship ${relationName} not found on ${modelClass.name}`)
    }

    switch (relationship.type) {
      case 'hasMany':
        return this.loadHasMany(models, relationship, relationName)
      case 'belongsTo':
        return this.loadBelongsTo(models, relationship, relationName)
      case 'hasOne':
        return this.loadHasOne(models, relationship, relationName)
      case 'manyToMany':
        return this.loadmanyToMany(models, relationship, relationName)
    }
  }

  private static async loadHasMany<T extends Model>(
    models: T[], 
    relationship: any, 
    relationName: string
  ) {
    const db = getDatabase()
    const localKeys = models.map(model => model.getAttribute(relationship.localKey))
    
    // Use Drizzle's inArray for efficient querying
    const relatedModels = await db
      .select()
      .from(relationship.related.table)
      .where(inArray(
        relationship.related.table[relationship.foreignKey], 
        localKeys
      ))

    // Group related models by foreign key
    const grouped = relatedModels.reduce((acc, model) => {
      const key = model[relationship.foreignKey]
      if (!acc[key]) acc[key] = []
      acc[key].push(new relationship.related(model))
      return acc
    }, {})

    // Assign to parent models
    models.forEach(model => {
      const key = model.getAttribute(relationship.localKey)
      model.setRelation(relationName, grouped[key] || [])
    })
  }

  private static async loadBelongsTo<T extends Model>(
    models: T[], 
    relationship: any, 
    relationName: string
  ) {
    const db = getDatabase()
    const foreignKeys = [...new Set(
      models
        .map(model => model.getAttribute(relationship.foreignKey))
        .filter(Boolean)
    )]

    if (foreignKeys.length === 0) return

    const relatedModels = await db
      .select()
      .from(relationship.related.table)
      .where(inArray(
        relationship.related.table[relationship.ownerKey], 
        foreignKeys
      ))

    const relatedMap = relatedModels.reduce((acc, model) => {
      acc[model[relationship.ownerKey]] = new relationship.related(model)
      return acc
    }, {})

    models.forEach(model => {
      const foreignKey = model.getAttribute(relationship.foreignKey)
      model.setRelation(relationName, relatedMap[foreignKey] || null)
    })
  }

  private static async loadHasOne<T extends Model>(
    models: T[], 
    relationship: any, 
    relationName: string
  ) {
    const db = getDatabase()
    const localKeys = models.map(model => model.getAttribute(relationship.localKey))
    
    const relatedModels = await db
      .select()
      .from(relationship.related.table)
      .where(inArray(
        relationship.related.table[relationship.foreignKey], 
        localKeys
      ))

    const relatedMap = relatedModels.reduce((acc, model) => {
      acc[model[relationship.foreignKey]] = new relationship.related(model)
      return acc
    }, {} as Record<string, any>)

    models.forEach(model => {
      const key = model.getAttribute(relationship.localKey)
      model.setRelation(relationName, relatedMap[key] || null)
    })
  }

  private static async loadmanyToMany<T extends Model>(
    models: T[], 
    relationship: any, 
    relationName: string
  ) {
    const db = getDatabase()
    const localKeys = models.map(model => model.getAttribute(relationship.localKey || 'id'))
    
    // First, get the pivot relationships
    const pivotResults = await db
      .select()
      .from(relationship.pivotTable)
      .where(inArray(
        relationship.pivotTable[relationship.foreignPivotKey], 
        localKeys
      ))

    if (pivotResults.length === 0) {
      models.forEach(model => model.setRelation(relationName, []))
      return
    }

    const relatedKeys = pivotResults.map(pivot => pivot[relationship.relatedPivotKey])
    
    // Then get the related models
    const relatedModels = await db
      .select()
      .from(relationship.related.table)
      .where(inArray(
        relationship.related.table[relationship.related.primaryKey || 'id'], 
        relatedKeys
      ))

    // Create mapping from pivot data
    const pivotMap = pivotResults.reduce((acc, pivot) => {
      const key = pivot[relationship.foreignPivotKey]
      if (!acc[key]) acc[key] = []
      acc[key].push(pivot[relationship.relatedPivotKey])
      return acc
    }, {} as Record<string, any[]>)

    const relatedMap = relatedModels.reduce((acc, model) => {
      acc[model[relationship.related.primaryKey || 'id']] = new relationship.related(model)
      return acc
    }, {} as Record<string, any>)

    // Assign to parent models
    models.forEach(model => {
      const key = model.getAttribute(relationship.localKey || 'id')
      const relatedKeys = pivotMap[key] || []
      const relatedInstances: Model[] = relatedKeys.map((relatedKey: string | number) => relatedMap[relatedKey]).filter(Boolean)
      model.setRelation(relationName, relatedInstances)
    })
  }
}