import type { ListInput } from './resource.js';

export interface URLParamsMapping {
	/** Maps a URL param to the `page` property. Default: 'page' */
	page?: string;
	/** Maps a URL param to the `perPage` property. Default: 'perPage' or 'per_page' */
	perPage?: string;
	/** Maps a URL param to the `search` property. Default: 'search' or 'q' */
	search?: string;
	/** Maps specific URL params to the `filters` object. E.g. { published: 'status' } maps ?status=... to filters.published */
	filters?: Record<string, string>;
}

/**
 * Extracts and maps URL query parameters into a `ListInput` object 
 * suitable for `resource().list` queries.
 *
 * @param url The URL object (e.g. from `$page.url` or `event.url`)
 * @param mapping Optional mapping to override default URL parameter names
 * @returns A strictly typed `ListInput` object
 */
export function fromURL(url: URL, mapping?: URLParamsMapping): ListInput {
	const params = url.searchParams;
	const input: ListInput = {};

	// Map 'page'
	const pageParamName = mapping?.page ?? 'page';
	const pageVal = params.get(pageParamName);
	if (pageVal) {
		const parsed = parseInt(pageVal, 10);
		if (!isNaN(parsed) && parsed > 0) input.page = parsed;
	}

	// Map 'perPage'
	const perPageParamName = mapping?.perPage ?? (params.has('perPage') ? 'perPage' : 'per_page');
	const perPageVal = params.get(perPageParamName);
	if (perPageVal) {
		const parsed = parseInt(perPageVal, 10);
		if (!isNaN(parsed) && parsed > 0) input.perPage = parsed;
	}

	// Map 'search'
	const searchParamName = mapping?.search ?? (params.has('search') ? 'search' : 'q');
	const searchVal = params.get(searchParamName);
	if (searchVal) input.search = searchVal;

	// Map 'filters'
	const filtersParamNames = mapping?.filters;
	if (filtersParamNames) {
		input.filters = {};
		for (const [filterKey, paramName] of Object.entries(filtersParamNames)) {
			if (params.has(paramName)) {
				const val = params.get(paramName)!;
				input.filters[filterKey] = parseFilterValue(val);
			}
		}
	} else {
		// Default: gather any URL param that is NOT page, per_page, perPage, search, or q
		// as a filter.
		const reserved = new Set([pageParamName, perPageParamName, searchParamName, 'per_page', 'perPage', 'q', 'search']);
		
		for (const [key, val] of params.entries()) {
			if (!reserved.has(key)) {
				if (!input.filters) input.filters = {};
				input.filters[key] = parseFilterValue(val);
			}
		}
	}

	return input;
}

/**
 * Auto-coerces string values from URL params to booleans or numbers if applicable.
 */
function parseFilterValue(val: string): string | number | boolean {
	if (val === 'true') return true;
	if (val === 'false') return false;
	
	const num = Number(val);
	if (!isNaN(num) && val.trim() !== '') {
		return num;
	}
	
	return val;
}
