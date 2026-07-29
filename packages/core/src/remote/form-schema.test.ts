import { describe, it, expect } from 'vitest';
import { formSchema } from './form-schema.js';
import { z } from 'zod';

describe('formSchema', () => {
	const userSchema = z.object({
		id: z.number(),
		name: z.string(),
		email: z.string().email(),
		age: z.number().optional(),
		isAdmin: z.boolean().default(false),
		status: z.enum(['active', 'inactive', 'pending']),
		role: z.enum(['admin', 'user']).default('user')
	});

	it('infers standard standard fields properly', () => {
		const fs = formSchema(userSchema);
		expect(fs.shape.name).toBeDefined();
		expect(fs.shape.email).toBeDefined();
		expect(fs.shape.age).toBeDefined();
	});

	it('handles pick correctly', () => {
		const fs = formSchema(userSchema, { pick: ['name', 'email'] });
		expect(Object.keys(fs.shape)).toEqual(['name', 'email']);
	});

	it('handles omit correctly', () => {
		const fs = formSchema(userSchema, { omit: ['id', 'status', 'role'] });
		expect(fs.shape.id).toBeUndefined();
		expect(fs.shape.status).toBeUndefined();
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

	it('accepts overrides', () => {
		const fs = formSchema(userSchema, { 
			pick: ['name', 'posts'], 
			overrides: { posts: z.array(z.string()) }
		});
		expect(fs.shape.posts).toBeDefined();
	});
});
