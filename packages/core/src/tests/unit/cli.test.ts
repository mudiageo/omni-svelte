import { describe, expect, it } from 'vitest';
import { toSnakeCase } from '../../cli/commands/generate.js';

describe('CLI utilities', () => {
	describe('toSnakeCase', () => {
		it('should convert camelCase to snake_case', () => {
			expect(toSnakeCase('camelCase')).toBe('camel_case');
		});

		it('should convert PascalCase to snake_case', () => {
			expect(toSnakeCase('PascalCase')).toBe('pascal_case');
		});

		it('should convert spaced strings to snake_case', () => {
			expect(toSnakeCase('spaced string')).toBe('spaced_string');
			expect(toSnakeCase('spaced  string with   multiple')).toBe('spaced_string_with_multiple');
		});

		it('should convert kebab-case to snake_case', () => {
			expect(toSnakeCase('kebab-case')).toBe('kebab_case');
			expect(toSnakeCase('kebab-case-with-multiple')).toBe('kebab_case_with_multiple');
		});

		it('should retain single underscores and remove trailing/leading', () => {
			expect(toSnakeCase('_leading')).toBe('leading');
			expect(toSnakeCase('trailing_')).toBe('trailing');
			expect(toSnakeCase('multiple__underscores')).toBe('multiple_underscores');
		});

		it('should handle complex mixed cases', () => {
			expect(toSnakeCase('complex-MixedCase String_withUnderscores')).toBe(
				'complex_mixed_case_string_with_underscores'
			);
		});
	});
});
