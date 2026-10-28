import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { toSnakeCase } from '../../cli/commands/generate.js';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { addAllowBuildsIfPnpm } from '$pkg/cli/utils/package-manager.js';

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

const tempRoot = join(tmpdir(), `omni-package-manager-${Date.now()}`)

describe('package manager utilites', () => {
	beforeEach(() => {
		mkdirSync(tempRoot, { recursive: true })
	})

	afterEach(() => {
		rmSync(tempRoot, { recursive: true, force: true })
	})

	describe('addAllowBuildsIfPnpm', () => {
		it('does nothing for npm', () => {
			addAllowBuildsIfPnpm({
				cwd: tempRoot,
				packageManager: 'npm',
				packages: ['better-sqlite3']
			})

			expect(existsSync(join(tempRoot, 'pnpm-workspace.yaml'))).toBe(false)

		})

		it('should update already existing pnpm-workspace.yaml', () => {

			const pnpmWorkspaceYaml = `packages:
  - 'apps/*'
  - 'packages/*'
allowBuilds:
  '@prisma/client': true
  better-sqlite3: true
minimumReleaseAgeExclude:
  - '@sveltejs/kit@3.0.0'
`
			const pnpmWorkspaceYamlPath =  join(tempRoot, 'pnpm-workspace.yaml')
			writeFileSync(pnpmWorkspaceYamlPath, pnpmWorkspaceYaml, 'utf-8');

			expect(existsSync(join(tempRoot, 'pnpm-workspace.yaml'))).toBe(true)
			expect(readFileSync(pnpmWorkspaceYamlPath, 'utf-8')).toBe(pnpmWorkspaceYaml)

			addAllowBuildsIfPnpm({
				cwd: tempRoot,
				packageManager: 'pnpm',
				packages: ['esbuild']
			})

			const updatedPnpmWorkspaceYaml = `packages:
  - 'apps/*'
  - 'packages/*'
allowBuilds:
  '@prisma/client': true
  better-sqlite3: true
  esbuild: true
minimumReleaseAgeExclude:
  - '@sveltejs/kit@3.0.0'
`

			expect(readFileSync(pnpmWorkspaceYamlPath, 'utf-8')).toBe(updatedPnpmWorkspaceYaml)
		})
	})
})
