// vp migrate: merged packages%2Fplugins%2F.oxlintrc.json (be97c0182e0d16bb7edc5fef30afc93f).
import { defineConfig } from 'vite-plus';

export default defineConfig({
	lint: {
		plugins: ['unicorn'],
		categories: {
			correctness: 'off'
		},
		env: {
			builtin: true
		},
		ignorePatterns: ['.svelte-kit/**', 'dist/**', 'node_modules/**'],
		rules: {
			'vite-plus/prefer-vite-plus-imports': 'error'
		},
		overrides: [
			{
				files: ['*.svelte', '**/*.svelte'],
				rules: {
					'no-inner-declarations': 'off',
					'no-self-assign': 'off'
				},
				jsPlugins: [],
				globals: {
					$state: 'readonly',
					$derived: 'readonly',
					$effect: 'readonly',
					$props: 'readonly',
					$bindable: 'readonly',
					$inspect: 'readonly',
					$host: 'readonly'
				}
			}
		],
		options: {
			typeAware: false,
			typeCheck: false
		},
		jsPlugins: [
			{
				name: 'vite-plus',
				specifier: 'vite-plus/oxlint-plugin'
			}
		]
	}
});
