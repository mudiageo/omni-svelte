/**
 * Docs navigation tree — defines the sidebar structure.
 * Add new pages here and they'll appear in the sidebar automatically.
 */
export interface NavItem {
	title: string;
	href?: string;
	slug?: string;
	children?: NavItem[];
	badge?: string;
}

export const nav: NavItem[] = [
	{
		title: 'Getting Started',
		children: [
			{ title: 'Introduction', slug: 'introduction' },
			{ title: 'Installation', slug: 'installation' },
			{ title: 'Quick Start', slug: 'quick-start' }
		]
	},
	{
		title: 'Core',
		children: [
			{ title: 'Configuration', slug: 'configuration' },
			{ title: 'CLI Reference', slug: 'cli' },
			{ title: 'Database', slug: 'database' },
			{ title: 'Authentication', slug: 'authentication' },
			{ title: 'Schema', slug: 'schema' }
		]
	},
	{
		title: 'Plugins',
		badge: 'Soon',
		children: [
			{ title: 'Overview', slug: 'plugins/overview' },
			{ title: 'Logging', slug: 'plugins/logging' },
			{ title: 'CORS', slug: 'plugins/cors' },
			{ title: 'Analytics', slug: 'plugins/analytics' },
			{ title: 'Error Reporting', slug: 'plugins/error-reporting' }
		]
	}
];

/** Flatten nav tree into a list for prev/next navigation. */
export function flattenNav(items: NavItem[]): NavItem[] {
	return items.flatMap((item) => (item.children ? flattenNav(item.children) : [item]));
}
