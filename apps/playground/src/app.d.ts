import type { OmniSvelteLocals } from './package/database/hooks.js'

declare global {
	namespace App {
		interface Locals extends OmniSvelteLocals {}
		interface PageData {}
		interface Error {}
		interface Platform {}
	}
}

export {}
