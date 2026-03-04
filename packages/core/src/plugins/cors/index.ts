import type { OmniPlugin } from '../types.js';

export interface CorsOptions {
    origin?: string | string[];
    methods?: string[];
    allowedHeaders?: string[];
}

/** @stub — implementation coming soon */
export function corsPlugin(_options: CorsOptions = {}): OmniPlugin {
    return { name: 'omni-svelte:cors' };
}

/** SvelteKit handle hook stub */
export const corsHook = null;
