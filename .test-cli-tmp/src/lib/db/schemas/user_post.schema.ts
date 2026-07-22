import { defineSchema, field } from '../../schema';

export default defineSchema('user_post', {
	id: field.uuid().primaryKey().defaultRandom(),
	// Add your fields here
});
