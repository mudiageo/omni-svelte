import { Model } from '../../database/model';
import { hashPassword, generateSlug } from '../../utils'
import type { Schema } from '../types';
import type { generateDrizzleSchema } from './drizzle';
import type { generateZodSchemas } from './zod';

export function generateModel(schema: Schema, drizzleSchema: ReturnType<typeof generateDrizzleSchema>, zodSchemas: ReturnType<typeof generateZodSchemas>) {
  class GeneratedModel extends Model {
    static tableName = schema.name;
    static table = drizzleSchema.table;
    static validation = zodSchemas;
    static fillable = determineFillable(schema);
    static hidden = determineHidden(schema);
    static casts = determineCasts(schema);
    static hooks = generateHooks(schema);
    static realtime = schema.config.realtime;
    static timestamps = schema.config.timestamps !== false; // Default to true unless explicitly set to false

    constructor(attributes: any = {}) {
      super(attributes);
      this.addComputedProperties(schema);
    }

    private addComputedProperties(schema: Schema) {
      Object.entries(schema.fields).forEach(([fieldName, field]) => {
        if (field.computed && field.get) {
          Object.defineProperty(this, fieldName, {
            get: () => field.get!(this),
            enumerable: true,
            configurable: true
          });
        }
      });
    }

    // Auto-generated relationships would go here
    static relationships = generateRelationships(schema);
  }

  //Auto reister the model
  GeneratedModel.register(schema.name);
  return GeneratedModel;
}

function generateRelationships(schema: Schema): Record<string, any> {
  const relationships: Record<string, any> = {};

  Object.entries(schema.fields).forEach(([fieldName, field]) => {
    if (field.relationship) {
      const relation = field.relationship;
      relationships[fieldName] = {
        type: relation.type,
        model: relation.model,
        foreignKey: relation.foreignKey,
        localKey: relation.localKey
      };
    }
  });

  return relationships;
}


function determineFillable(schema: Schema): string[] {
  if (Array.isArray(schema.config.fillable)) {
    return schema.config.fillable;
  }

  // Auto-determine fillable fields
  const fillable: string[] = [];
  Object.entries(schema.fields).forEach(([fieldName, field]) => {
    if (!field.primary && !field.computed && fieldName !== 'created_at' && fieldName !== 'updated_at') {
      fillable.push(fieldName);
    }
  });

  return fillable;
}

function determineHidden(schema: Schema): string[] {
  if (Array.isArray(schema.config.hidden)) {
    return schema.config.hidden;
  }

  // Auto-determine hidden fields
  const hidden: string[] = [];
  Object.entries(schema.fields).forEach(([fieldName, field]) => {
    if (field.hidden || field.type === 'password') {
      hidden.push(fieldName);
    }
  });

  return hidden;
}

function determineCasts(schema: Schema): Record<string, "string" | "number" | "boolean" | "date" | "json"> {
  const casts: Record<string, "string" | "number" | "boolean" | "date" | "json"> = {};

  Object.entries(schema.fields).forEach(([fieldName, field]) => {
    switch (field.type) {
      case 'json':
      case 'array':
        casts[fieldName] = 'json';
        break;
      case 'date':
      case 'timestamp':
      case 'datetime':
        casts[fieldName] = 'date';
        break;
      case 'boolean':
        casts[fieldName] = 'boolean';
        break;
      case 'integer':
      case 'money':
        casts[fieldName] = 'number';
        break;
    }
  });

  return casts;
}

function generateHooks(schema: Schema): Record<string, Function[]> {
  const hooks: Record<string, Function[]> = {
    creating: [],
    updating: [],
    created: [],
    updated: []
  };

  Object.entries(schema.fields).forEach(([fieldName, field]) => {
    if (field.type === 'password' && field.hash) {
      const hashMethod = typeof field.hash === 'string' ? field.hash : 'bcrypt';
      hooks.creating.push(async (model: any) => {
        if (model[fieldName]) {
          model[fieldName] = await hashPassword(model[fieldName], hashMethod);
        }
      });
      hooks.updating.push(async (model: any) => {
        if (model[fieldName] && model.isDirty(fieldName)) {
          model[fieldName] = await hashPassword(model[fieldName], hashMethod);
        }
      });
    }

    if (field.type === 'slug') {
      hooks.creating.push((model: any) => {
        if (!model[fieldName] && model.name) {
          model[fieldName] = generateSlug(model.name);
        }
      });
    }
  });

  return hooks;
}