import { AuthDiagnostic } from '../runtime/auth/diagnostics.js';

export type RelationKind =
	| 'belongsTo'
	| 'hasMany'
	| 'hasOne'
	| 'manyToMany'
	| 'morphTo'
	| 'morphMany';

export type InverseOption = string | { name: string; kind?: 'hasMany' | 'hasOne' };

export interface BelongsToOptions {
	via?: string;
	inverse?: InverseOption;
	localKey?: string;
	[key: string]: any;
}

export interface ManyToManyOptions {
	through: () => any;
	pivotFields?: string[];
	inverse?: string;
	[key: string]: any;
}

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
	 * @param target Thunk returning the target schema, e.g. `() => userSchema` or `() => auth.user`
	 * @param options Optional configuration, e.g. `{ via: 'customId', inverse: 'posts' }`
	 */
	belongsTo: (target: () => any, options?: BelongsToOptions): RelationDefinition => {
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
	 * @param options Must provide `{ through: () => pivotSchema }` and optional `{ inverse: 'teams' }`
	 */
	manyToMany: (target: () => any, options: ManyToManyOptions): RelationDefinition => {
		return { kind: 'manyToMany', target, options };
	},

	/**
	 * Defines a polymorphic belongsTo relationship.
	 * @param options Must map types to schema thunks, e.g. `{ types: { post: () => postSchema } }`
	 */
	morphTo: (options: {
		types: Record<string, () => any>;
		[key: string]: any;
	}): RelationDefinition => {
		if ((options as any)?.inverse !== undefined) {
			throw new AuthDiagnostic(
				'AUTH005',
				'Polymorphic inverse on auth tables is not supported in this version.',
				'Remove inverse option from morphTo.'
			);
		}
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
