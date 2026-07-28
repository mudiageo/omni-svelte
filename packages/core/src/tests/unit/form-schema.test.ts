import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { formSchema } from '../../remote/form-schema.js';

describe('formSchema', () => {
	const base = z.object({
		title: z.string(),
		content: z.string(),
		isPublished: z.boolean().optional(),
		status: z.enum(['draft', 'published', 'archived'])
	});

	it('should return a zod schema identically if no options are passed', () => {
		const form = formSchema(base);
		expect(form.parse({ title: 'Hello', content: 'World', status: 'draft' })).toEqual({
			title: 'Hello',
			content: 'World',
			status: 'draft'
		});
	});

	it('should allow picking fields', () => {
		const form = formSchema(base, { pick: ['title'] });
		expect(Object.keys(form.shape)).toEqual(['title']);
	});

	it('should allow omitting fields', () => {
		const form = formSchema(base, { omit: ['content', 'isPublished'] });
		expect(Object.keys(form.shape)).toEqual(['title', 'status']);
	});

	it('should allow partial fields', () => {
		const form = formSchema(base, { partial: true });
		expect(form.parse({})).toEqual({}); // everything is optional
	});

	it('should allow overriding zod schema fields', () => {
		const form = formSchema(base, {
			overrides: {
				title: z.string().min(5)
			}
		});

		// Validation should fail for short titles now
		expect(() => form.parse({ title: 'Hi', content: 'World', status: 'draft' })).toThrow();
		
		// Validation passes for valid overrides
		expect(form.parse({ title: 'Hello', content: 'World', status: 'draft' })).toEqual({
			title: 'Hello',
			content: 'World',
			status: 'draft'
		});
	});
});
