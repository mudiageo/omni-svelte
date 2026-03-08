import { describe, it, expect } from 'vitest';
import { field } from '$pkg/schema/field.js';

describe('field.* builder API', () => {
	// ─── Factory methods produce correct types ────────────────────

	describe('field type factories', () => {
		it('field.serial() produces type serial', () => {
			const f = field.serial().build();
			expect(f.type).toBe('serial');
		});

		it('field.string() produces type string without length', () => {
			const f = field.string().build();
			expect(f.type).toBe('string');
			expect(f.length).toBeUndefined();
		});

		it('field.string(255) attaches a length', () => {
			const f = field.string(255).build();
			expect(f.type).toBe('string');
			expect(f.length).toBe(255);
		});

		it('field.integer() produces type integer', () => {
			expect(field.integer().build().type).toBe('integer');
		});

		it('field.boolean() produces type boolean', () => {
			expect(field.boolean().build().type).toBe('boolean');
		});

		it('field.email() produces type email', () => {
			expect(field.email().build().type).toBe('email');
		});

		it('field.password() produces type password', () => {
			expect(field.password().build().type).toBe('password');
		});

		it('field.url() produces type url', () => {
			expect(field.url().build().type).toBe('url');
		});

		it('field.slug() produces type slug', () => {
			expect(field.slug().build().type).toBe('slug');
		});

		it('field.timestamp() produces type timestamp', () => {
			expect(field.timestamp().build().type).toBe('timestamp');
		});

		it('field.json() produces type json', () => {
			expect(field.json().build().type).toBe('json');
		});

		it('field.money() produces type money', () => {
			expect(field.money().build().type).toBe('money');
		});

		it('field.richtext() produces type richtext', () => {
			expect(field.richtext().build().type).toBe('richtext');
		});

		it('field.enum() attaches values array', () => {
			const f = field.enum('draft', 'published', 'archived').build();
			expect(f.type).toBe('enum');
			expect(f.values).toEqual(['draft', 'published', 'archived']);
		});
	});

	// ─── Constraint modifiers ─────────────────────────────────────

	describe('constraint modifiers', () => {
		it('.primaryKey() sets primary: true', () => {
			const f = field.serial().primaryKey().build();
			expect(f.primary).toBe(true);
		});

		it('.required() sets required: true', () => {
			const f = field.string().required().build();
			expect(f.required).toBe(true);
		});

		it('.optional() sets optional: true', () => {
			const f = field.string().optional().build();
			expect(f.optional).toBe(true);
		});

		it('.unique() sets unique: true', () => {
			const f = field.string().unique().build();
			expect(f.unique).toBe(true);
		});

		it('.default() sets a default value', () => {
			const f = field.boolean().default(false).build();
			expect(f.default).toBe(false);
		});

		it('.hidden() sets hidden: true', () => {
			const f = field.password().hidden().build();
			expect(f.hidden).toBe(true);
		});

		it('.unsigned() sets unsigned: true', () => {
			const f = field.integer().unsigned().build();
			expect(f.unsigned).toBe(true);
		});
	});

	// ─── Validation modifiers ─────────────────────────────────────

	describe('validation modifiers', () => {
		it('.minLength() sets validation.min', () => {
			const f = field.string().minLength(3).build();
			expect(f.validation?.min).toBe(3);
		});

		it('.maxLength() sets validation.max', () => {
			const f = field.string(255).maxLength(100).build();
			expect(f.validation?.max).toBe(100);
		});

		it('.minLength() accepts a custom message', () => {
			const f = field.string().minLength(2, 'Too short').build();
			expect(f.validation?.message).toBe('Too short');
		});

		it('.requireUppercase() sets validation.requireUppercase', () => {
			const f = field.password().requireUppercase().build();
			expect(f.validation?.requireUppercase).toBe(true);
		});

		it('.requireNumbers() sets validation.requireNumbers', () => {
			const f = field.password().requireNumbers().build();
			expect(f.validation?.requireNumbers).toBe(true);
		});

		it('.hash() defaults to bcrypt', () => {
			const f = field.password().hash().build();
			expect(f.hash).toBe('bcrypt');
		});

		it('.hash("argon2") stores argon2', () => {
			const f = field.password().hash('argon2').build();
			expect(f.hash).toBe('argon2');
		});

		it('.validate() merges arbitrary rules', () => {
			const f = field.string().validate({ min: 1, max: 50 }).build();
			expect(f.validation?.min).toBe(1);
			expect(f.validation?.max).toBe(50);
		});
	});

	// ─── Chaining ────────────────────────────────────────────────

	describe('chaining multiple modifiers', () => {
		it('chains work in any order and accumulate correctly', () => {
			const f = field
				.string(255)
				.required()
				.unique()
				.default('untitled')
				.minLength(3)
				.maxLength(200)
				.build();

			expect(f.type).toBe('string');
			expect(f.length).toBe(255);
			expect(f.required).toBe(true);
			expect(f.unique).toBe(true);
			expect(f.default).toBe('untitled');
			expect(f.validation?.min).toBe(3);
			expect(f.validation?.max).toBe(200);
		});

		it('password chain: required + hash + requireUppercase + requireNumbers', () => {
			const f = field
				.password()
				.required()
				.minLength(8)
				.requireUppercase()
				.requireNumbers()
				.hash()
				.build();

			expect(f.type).toBe('password');
			expect(f.required).toBe(true);
			expect(f.validation?.min).toBe(8);
			expect(f.validation?.requireUppercase).toBe(true);
			expect(f.validation?.requireNumbers).toBe(true);
			expect(f.hash).toBe('bcrypt');
		});
	});

	// ─── Immutability ─────────────────────────────────────────────

	describe('build() immutability', () => {
		it('calling build() twice returns independent objects', () => {
			const b = field.string(100).required();
			const a = b.build();
			const c = b.build();
			a.required = false;
			expect(c.required).toBe(true);
		});
	});

	// ─── toJSON / interoperability ────────────────────────────────

	describe('JSON serialisation', () => {
		it('toJSON() returns the same shape as build()', () => {
			const b = field.email().required().unique();
			expect(b.toJSON()).toEqual(b.build());
		});

		it('JSON.stringify produces valid JSON with correct fields', () => {
			const f = field.string(255).required().default('hello');
			const json = JSON.parse(JSON.stringify(f));
			expect(json.type).toBe('string');
			expect(json.length).toBe(255);
			expect(json.required).toBe(true);
			expect(json.default).toBe('hello');
		});
	});
});
