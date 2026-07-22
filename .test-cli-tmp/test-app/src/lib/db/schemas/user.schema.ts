import { defineSchema, field } from 'omni-svelte/schema';

export default defineSchema('user', {
	id: field.uuid().primaryKey().defaultRandom(),
	// Add your fields here
});
