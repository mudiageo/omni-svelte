import { defineSchema, field } from '../../schema';

export default defineSchema('test_users', {
	id: field.uuid().primaryKey().defaultRandom(),
	// Add your fields here
});
