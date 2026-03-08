import type { OmniPlugin } from '@omni-svelte/shared';

export interface AnalyticsOptions {
	/** Analytics provider endpoint */
	endpoint?: string;
	/** Whether to track page views automatically. Default: true */
	pageViews?: boolean;
}

/**
 * Analytics plugin — tracks page views and custom events.
 * @stub — implementation coming soon.
 */
export function analyticsPlugin(options: AnalyticsOptions = {}): OmniPlugin {
	return {
		name: '@omni-svelte/plugin-analytics',
		async handle(_ctx) {
			// TODO: implement analytics event tracking
		}
	};
}

/** SvelteKit-compatible handle hook — use in hooks.server.ts */
export const analyticsHook = null; // stub
