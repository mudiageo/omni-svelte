import type { OmniPlugin } from '../types.js';

export interface LoggingOptions {
	level?: 'debug' | 'info' | 'warn' | 'error';
	timing?: boolean;
}

/** @stub — implementation coming soon */
export function loggingPlugin(_options: LoggingOptions = {}): OmniPlugin {
	return { name: 'omni-svelte:logging' };
}

/** SvelteKit handle hook stub */
export const loggingHook = null;
