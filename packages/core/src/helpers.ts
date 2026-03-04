/**
 * Parses pagination parameters from a URL's search parameters.
 * 
 * @param url - The URL object containing search parameters to parse
 * @returns An object containing the parsed pagination parameters
 * @returns page - The page number, minimum value of 1 (defaults to 1 if not provided or invalid)
 * @returns limit - The items per page limit, maximum value of 100 (defaults to 20 if not provided or invalid)
 * 
 * @example
 * ```typescript
 * const url = new URL('https://example.com?page=2&limit=50');
 * const { page, limit } = parsePagination(url);
 * // Returns: { page: 2, limit: 50 }
 * ```
 */
export function parsePagination(url: URL) {
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(100, parseInt(url.searchParams.get('limit') || '20'));
    return { page, limit }
}