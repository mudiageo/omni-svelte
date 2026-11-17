/**
 * Parses pagination parameters from a URL's search parameters.
 */
export function parsePagination(url: URL): { page: number; limit: number } {
	const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
	const limit = Math.min(100, parseInt(url.searchParams.get('limit') || '20'));
	return { page, limit };
}

/**
 * Deep-merges two objects. Source values override target values.
 */
export function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
	const result = { ...target };
	for (const key of Object.keys(source) as (keyof T)[]) {
		const sv = source[key];
		const tv = target[key];
		if (sv && typeof sv === 'object' && !Array.isArray(sv) && tv && typeof tv === 'object') {
			result[key] = deepMerge(
				tv as Record<string, unknown>,
				sv as Record<string, unknown>
			) as T[typeof key];
		} else if (sv !== undefined) {
			result[key] = sv as T[typeof key];
		}
	}
	return result;
}
