import { defineSchema, field, relation, auth } from 'omni-svelte/schema';

export const noteSchema = defineSchema(
	'notes',
	{
		id: field.serial().primaryKey(),
		body: field.string().required(),

		// Thunk reference to the Better Auth `user` table (text PK -> text FK)
		ownerId: field.reference(() => auth.user).required(),
				
		owner: relation.belongsTo(() => auth.user, { via: 'ownerId' }),
		session: relation.belongsTo(() => auth.session, { via: 'sessionId' }),



		// String-key reference to the Better Auth `session` table
		sessionId: field.reference('session')

	},
	{
		timestamps: true
	}
);

export const Note = noteSchema.model;
