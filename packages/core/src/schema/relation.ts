export type RelationKind = 'belongsTo' | 'hasMany' | 'hasOne' | 'manyToMany' | 'morphTo' | 'morphMany';

export interface RelationDefinition {
	kind: RelationKind;
	target?: () => any;
	options?: any;
}

/**
 * Fluent relation builder for defining virtual relationships in `defineSchema`.
 * These declarations drive the runtime ORM graph (`defineRelations`).
 */
export const relation = {
	/**
	 * Defines a many-to-one relationship (this schema has a foreign key to the target).
	 * @param target Thunk returning the target schema, e.g. `() => userSchema`
	 * @param options Optional configuration, e.g. `{ via: 'customId' }`
	 */
	belongsTo: (target: () => any, options?: { via?: string }): RelationDefinition => {
		return { kind: 'belongsTo', target, options };
	},

	/**
	 * Defines a one-to-many relationship (the target schema has a foreign key to this one).
	 * @param target Thunk returning the target schema, e.g. `() => commentSchema`
	 */
	hasMany: (target: () => any): RelationDefinition => {
		return { kind: 'hasMany', target };
	},

	/**
	 * Defines a one-to-one relationship.
	 * @param target Thunk returning the target schema
	 */
	hasOne: (target: () => any): RelationDefinition => {
		return { kind: 'hasOne', target };
	},

	/**
	 * Defines a many-to-many relationship using a pivot schema.
	 * @param target Thunk returning the target schema
	 * @param options Must provide `{ through: () => pivotSchema }`
	 */
	manyToMany: (target: () => any, options: { through: () => any; pivotFields?: string[] }): RelationDefinition => {
		return { kind: 'manyToMany', target, options };
	},

	/**
	 * Defines a polymorphic belongsTo relationship.
	 * @param options Must map types to schema thunks, e.g. `{ types: { post: () => postSchema } }`
	 */
	morphTo: (options: { types: Record<string, () => any> }): RelationDefinition => {
		return { kind: 'morphTo', options };
	},

	/**
	 * Defines a polymorphic hasMany relationship.
	 * @param target Thunk returning the target schema
	 * @param options Provide the polymorphic alias, e.g. `{ as: 'commentable' }`
	 */
	morphMany: (target: () => any, options: { as: string }): RelationDefinition => {
		return { kind: 'morphMany', target, options };
	}
};
