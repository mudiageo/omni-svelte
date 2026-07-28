import { describe, it, expect } from 'vitest';
import { formSchema } from './form-schema.js';
import { defineSchema, field } from '../schema/index.js';
import { z } from 'zod';

describe('formSchema', () => {
	const userSchema = defineSchema('user', {
		id: field.uuid().primaryKey(),
		name: field.string(),
		email: field.email(),
		age: field.integer().optional(),
		isAdmin: field.boolean().default(false),
		status: field.enum('active', 'inactive', 'pending'),
		role: field.enum('admin', 'user').default('user'),
		posts: field.hasMany('post')
	});

	it('infers standard standard fields properly', () => {
		const fs = formSchema(userSchema);
		expect(fs.shape.name).toBeDefined();
		expect(fs.shape.email).toBeDefined();
		expect(fs.shape.age).toBeDefined();
		expect(fs.fieldMeta.name.type).toBe('text');
		expect(fs.fieldMeta.email.type).toBe('email');
		expect(fs.fieldMeta.age.type).toBe('number');
		expect(fs.fieldMeta.isAdmin.type).toBe('checkbox');
		expect(fs.fieldMeta.status.type).toBe('select');
		expect(fs.fieldMeta.status.options).toEqual(['active', 'inactive', 'pending']);
	});

	it('handles pick correctly', () => {
		const fs = formSchema(userSchema, { pick: ['name', 'email'] });
		expect(Object.keys(fs.shape)).toEqual(['name', 'email']);
	});

	it('handles omit correctly', () => {
		const fs = formSchema(userSchema, { omit: ['id', 'posts'] });
		expect(fs.shape.id).toBeUndefined();
		expect(fs.shape.posts).toBeUndefined();
		expect(fs.shape.name).toBeDefined();
	});

	it('throws error when pick and omit are both used', () => {
		expect(() => formSchema(userSchema, { pick: ['name'], omit: ['id'] })).toThrowError(/Cannot specify both/);
	});

	it('handles partial correctly', () => {
		const fs = formSchema(userSchema, { pick: ['name'], partial: true });
		const parsed = fs.safeParse({});
		expect(parsed.success).toBe(true); // Should pass because name is now optional
	});

	it('throws on relationship field missing override', () => {
		expect(() => formSchema(userSchema, { pick: ['name', 'posts'] })).toThrowError(/Relationship field/);
	});

	it('accepts relationship field if override is provided', () => {
		const fs = formSchema(userSchema, { 
			pick: ['name', 'posts'], 
			overrides: { posts: z.array(z.string()) }
		});
		expect(fs.shape.posts).toBeDefined();
	});
});
