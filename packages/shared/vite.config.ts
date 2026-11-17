// vp migrate: merged packages%2Fshared%2F.oxlintrc.json (6cfc929d5c53c9d7196a352865198aab).
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
