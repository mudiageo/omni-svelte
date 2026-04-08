import type { OmniSvelteLocals } from 'omni-svelte/database';

declare global {
	namespace App {
		interface Locals extends OmniSvelteLocals {}
		interface PageData {}
		interface Error {}
		interface Platform {}
	}
}

export {};
