import { describe, it, expect } from 'vitest';
import { Factory, Faker } from '../../database/index.js';

describe('Factory and Faker exports', () => {
	it('should export Factory class', () => {
		expect(Factory).toBeDefined();
		expect(typeof Factory).toBe('function');
	});

	it('should export Faker class with utility methods', () => {
		expect(Faker).toBeDefined();
		expect(typeof Faker.name()).toBe('string');
		expect(typeof Faker.email()).toBe('string');
		expect(typeof Faker.boolean()).toBe('boolean');
	});
});
