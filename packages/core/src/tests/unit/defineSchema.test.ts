import { describe, it, expect } from 'vitest';
import { defineSchema } from '../../schema/index.js';
import { field } from '../../schema/field.js';
import { relation } from '../../schema/relation.js';

describe('defineSchema API', () => {
	it('should correctly unwrap FieldBuilder instances', () => {
		const schema = defineSchema('users', {
			id: field.serial().primaryKey(),
			email: field.email().unique().required(),
			posts: relation.hasMany(() => ({} as any))
		});

		expect(schema.name).toBe('users');
		
		// ID field unwrapped
		expect(schema.fields.id).toBeDefined();
		expect(schema.fields.id.type).toBe('serial');
		expect(schema.fields.id.primary).toBe(true);

		// Email field unwrapped
		expect(schema.fields.email).toBeDefined();
		expect(schema.fields.email.type).toBe('email');
		expect(schema.fields.email.unique).toBe(true);

		// Relation separated
		expect(schema.fields.posts).toBeUndefined();
		expect(schema.relations?.posts).toBeDefined();
		expect(schema.relations?.posts.kind).toBe('hasMany');
	});
});
