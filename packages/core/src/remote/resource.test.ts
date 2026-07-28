import { describe, it, expect, vi } from 'vitest';
import { resource } from './resource.js';
import { Model } from '../database/model.js';
import { defineSchema, field } from '../schema/index.js';

describe('resource', () => {
	const userSchema = defineSchema('user', {
		id: field.uuid().primaryKey(),
		name: field.string()
	});

	class User extends Model {
		static schema = userSchema;
		// Mock query builder methods
		static query() {
			return {
				with: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				paginate: vi.fn().mockResolvedValue({ data: [], meta: {} }),
				first: vi.fn().mockResolvedValue({ id: '1', name: 'Test' })
			};
		}
		static async create(data: any) { return { id: '1', ...data }; }
		static async update(id: string, data: any) { return { id, ...data }; }
		static async delete(id: string) { return true; }
	}

	it('generates all five standard exports by default', () => {
		const res = resource(User);
		expect(res.list).toBeDefined();
		expect(res.get).toBeDefined();
		expect(res.create).toBeDefined();
		expect(res.update).toBeDefined();
		expect(res.remove).toBeDefined();
	});

	it('respects only option', () => {
		const res = resource(User, { only: ['list', 'get'] });
		expect(res.list).toBeDefined();
		expect(res.get).toBeDefined();
		expect(res.create).toBeUndefined();
		expect(res.update).toBeUndefined();
		expect(res.remove).toBeUndefined();
	});

	it('respects exclude option', () => {
		const res = resource(User, { exclude: ['list'] });
		expect(res.list).toBeUndefined();
		expect(res.get).toBeDefined();
	});

	it('respects names option', () => {
		const res = resource(User, { names: { list: 'users' } });
		expect(res.users).toBeDefined();
		expect(res.list).toBeUndefined();
	});
});
