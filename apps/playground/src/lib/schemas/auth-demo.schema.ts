import { defineSchema, field, relation, auth } from 'omni-svelte/schema';

export const noteSchema = defineSchema(
	'notes',
	{
		id: field.serial().primaryKey(),
		body: field.string().required(),

		// Thunk reference to the Better Auth `user` table (text PK -> text FK)
		ownerId: field.reference(() => auth.user).required(),
		owner: relation.belongsTo(() => auth.user, {
			via: 'ownerId',
			inverse: { name: 'notes', kind: 'hasMany' }
		}),

		// String-key reference to the Better Auth `session` table
		sessionId: field.reference('session'),
		session: relation.belongsTo(() => auth.session, { via: 'sessionId' })
	},
	{
		timestamps: true
	}
);

export const Note = noteSchema.model;
