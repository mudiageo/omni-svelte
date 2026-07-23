export interface NavItem {
	title: string;
	href?: string;
	slug?: string;
	label?: string; // 'new' | 'beta' | 'soon' | 'wip'
	items?: NavItem[];
}

export interface NavSection {
	title: string;
	items: NavItem[];
}

export const docsNav: NavSection[] = [
	{
		title: 'Getting Started',
		items: [
			{ title: 'Introduction', href: '/docs/getting-started/introduction' },
			{ title: 'Installation', href: '/docs/getting-started/installation' },
			{ title: 'Quick Start', href: '/docs/getting-started/quick-start' },
			{ title: 'Tutorial: Zero to Hero', href: '/docs/getting-started/tutorial', label: 'new' },
			{ title: 'Project Structure', href: '/docs/getting-started/project-structure' },
			{ title: 'Comparison', href: '/docs/getting-started/comparison' }
		]
	},
	{
		title: 'Configuration',
		items: [
			{ title: 'svelte.config.js', href: '/docs/configuration/svelte-config' },
			{ title: 'Environment Variables', href: '/docs/configuration/env-variables' },
			{ title: 'TypeScript', href: '/docs/configuration/typescript' }
		]
	},
	{
		title: 'Schema',
		items: [
			{ title: 'Introduction', href: '/docs/schema/introduction' },
			{ title: 'defineSchema & field.*', href: '/docs/schema/define-schema' },
			{ title: 'Field Types', href: '/docs/schema/field-types' },
			{ title: 'Schema Options', href: '/docs/schema/schema-options' },
			{ title: 'Code Generation', href: '/docs/schema/code-generation' }
		]
	},
	{
		title: 'Database',
		items: [
			{ title: 'Introduction', href: '/docs/database/introduction' },
			{ title: 'Model API', href: '/docs/database/model-api' },
			{ title: 'Querying', href: '/docs/database/querying' },
			{ title: 'Relationships', href: '/docs/database/relationships' },
			{ title: 'Lifecycle Hooks', href: '/docs/database/lifecycle-hooks' },
			{ title: 'Migrations', href: '/docs/database/migrations' },
			{ title: 'Raw Drizzle', href: '/docs/database/raw-drizzle' }
		]
	},
	{
		title: 'Authentication',
		items: [
			{ title: 'Introduction', href: '/docs/authentication/introduction' },
			{ title: 'Email & Password', href: '/docs/authentication/email-password' },
			{ title: 'OAuth Providers', href: '/docs/authentication/oauth' },
			{ title: 'Magic Link', href: '/docs/authentication/magic-link' },
			{ title: '2FA & Passkeys', href: '/docs/authentication/2fa-passkeys' },
			{ title: 'Sessions', href: '/docs/authentication/sessions' },
			{ title: 'Route Protection', href: '/docs/authentication/route-protection' }
		]
	},
	{
		title: 'Virtual Modules',
		items: [
			{ title: 'Overview', href: '/docs/virtual-modules/overview' },
			{ title: '$db', href: '/docs/virtual-modules/db' },
			{ title: '$auth/server & client', href: '/docs/virtual-modules/auth' },
			{ title: '$models', href: '/docs/virtual-modules/models' },
			{ title: '$schema', href: '/docs/virtual-modules/schema' },
			{ title: '$validation', href: '/docs/virtual-modules/validation' }
		]
	},
	{
		title: 'Plugin System',
		items: [
			{ title: 'Overview', href: '/docs/plugins/overview' },
			{ title: 'OmniPlugin Interface', href: '/docs/plugins/interface' },
			{ title: 'Creating Plugins', href: '/docs/plugins/creating-plugins' },
			{ title: 'Plugin Lifecycle', href: '/docs/plugins/lifecycle' },
			{ title: 'Testing Plugins', href: '/docs/plugins/testing' }
		]
	},
	{
		title: 'CLI',
		items: [{ title: 'CLI Reference', href: '/docs/cli/overview', label: 'soon' }]
	},
	{
		title: 'Advanced',
		items: [
			{ title: 'Remote Functions', href: '/docs/remote-functions/introduction', label: 'soon' },
			{ title: 'Background Jobs', href: '/docs/jobs/introduction', label: 'soon' },
			{ title: 'Caching', href: '/docs/caching/introduction', label: 'soon' },
			{ title: 'Realtime', href: '/docs/realtime/introduction', label: 'soon' }
		]
	},
	{
		title: 'Integrations',
		items: [
			{ title: 'Email', href: '/docs/email/introduction', label: 'soon' },
			{ title: 'File Storage', href: '/docs/storage/introduction', label: 'soon' },
			{ title: 'Payments', href: '/docs/payments/introduction', label: 'soon' }
		]
	},
	{
		title: 'Ecosystem & Future',
		items: [
			{ title: 'AI & Intelligence', href: '/docs/ai/introduction', label: 'soon' },
			{ title: 'Local-First', href: '/docs/local-first/introduction', label: 'soon' },
			{ title: 'Business Primitives', href: '/docs/business-logic/introduction', label: 'soon' },
			{ title: 'DX & Testing', href: '/docs/dx-testing/introduction', label: 'soon' },
			{ title: 'Platform Polish', href: '/docs/platform-polish/introduction', label: 'soon' }
		]
	},
	{
		title: 'Reference',
		items: [
			{ title: 'Configuration API', href: '/docs/reference/configuration-api' },
			{ title: 'Field Builder API', href: '/docs/reference/field-api' },
			{ title: 'Model API', href: '/docs/reference/model-api' },
			{ title: 'Plugin API', href: '/docs/reference/plugin-api' },
			{ title: 'Virtual Modules', href: '/docs/reference/virtual-modules' },
			{ title: 'Changelog', href: '/docs/reference/changelog' }
		]
	},
	{
		title: 'Roadmap',
		items: [{ title: 'Public Roadmap', href: '/docs/roadmap' }]
	}
];

/** Flatten nav tree into a list for prev/next navigation. */
export function flattenNav(items: NavItem[]): NavItem[] {
	return items.flatMap((item) => (item.items ? flattenNav(item.items) : [item]));
}
