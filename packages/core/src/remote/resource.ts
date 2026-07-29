import { query, form, command } from '$app/server';
import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { formSchema } from './form-schema.js';

export type OperationName = 'list' | 'get' | 'create' | 'update' | 'remove';

export interface AuthorizeContext<M> {
	user: unknown | null;
	operation: OperationName;
	model: M;
	input?: unknown;
}

export type MutationMode = 'form' | 'command';

export interface ResourceOptions<M> {
	only?: OperationName[];
	exclude?: OperationName[];
	fillable?: { create?: string[]; update?: string[] };
	with?: string[];
	pagination?: { perPage?: number; strategy?: 'offset' | 'cursor' };
	authorize?: (ctx: AuthorizeContext<M>) => boolean | Promise<boolean>;
	live?: OperationName[];
	/**
	 * Controls how `create` and `update` mutations are generated.
	 * - `'form'` (default): generates a SvelteKit `form()` remote function, for use with `<form>` elements.
	 * - `'command'`: generates a SvelteKit `command()` remote function, for programmatic calls (e.g. `onsubmit`, buttons).
	 * Can be a single value to apply to both, or per-operation: `{ create: 'form', update: 'command' }`.
	 */
	mutationMode?: MutationMode | { create?: MutationMode; update?: MutationMode };
	/**
	 * Optional hook to apply extra query constraints on the `list` operation.
	 * Receives the QueryBuilder and the validated list input (page, perPage, search, filters).
	 * Use this for custom filtering, ordering, or joins beyond what resource provides.
	 */
	listQuery?: (q: any, input: ListInput) => any;
}

export interface ListInput {
	/** Current page number (1-based). Default: 1 */
	page?: number;
	/** Number of records per page. Default: uses `pagination.perPage` option or 20 */
	perPage?: number;
	/** Free-text search string, passed to the model's `search()` method if searchColumns is configured */
	search?: string;
	/** Arbitrary key-value filters applied as `where` clauses */
	filters?: Record<string, string | number | boolean | null>;
}

export type ResourceExports<M> = {
	list?: ReturnType<typeof query>;
	get?: ReturnType<typeof query>;
	create?: ReturnType<typeof form> | ReturnType<typeof command>;
	update?: ReturnType<typeof form> | ReturnType<typeof command>;
	remove?: ReturnType<typeof command>;
};

// SvelteKit query exports have .set, .refresh, etc.
type QueryType = ReturnType<typeof query>;

function shouldInclude(op: OperationName, options?: ResourceOptions<any>) {
	if (options?.only && !options.only.includes(op)) return false;
	if (options?.exclude && options.exclude.includes(op)) return false;
	return true;
}

function getMutationMode(op: 'create' | 'update', options?: ResourceOptions<any>): MutationMode {
	const mode = options?.mutationMode;
	if (!mode) return 'form';
	if (typeof mode === 'string') return mode;
	return mode[op] ?? 'form';
}

/**
 * Generates a standard set of SvelteKit remote functions (query, form, command) for a Model.
 * This provides CRUD endpoints (list, get, create, update, remove) with pagination,
 * eager-loading, authorization, and single-flight cache invalidation built-in.
 * @param model The OmniSvelte model class
 * @param options Configuration options for the generated resource
 * @returns An object containing the generated remote functions
 */
export function resource<
	M extends any,
	O extends ResourceOptions<M> = {}
>(
	model: M,
	options?: O
) {
	// Stub out the authorize checker
	const checkAuth = async (operation: OperationName, input?: any) => {
		if (options?.authorize) {
			const ctx: AuthorizeContext<M> = { user: null, operation, model, input };
			const allowed = await options.authorize(ctx);
			if (!allowed) throw error(403, 'Forbidden');
		}
	};

	const createMode = getMutationMode('create', options);
	const updateMode = getMutationMode('update', options);

	const listFn = shouldInclude('list', options) ? (() => {
		const isLive = options?.live?.includes('list');
		const fn = isLive ? (query as any).live : query;

		const listInputSchema = z.object({
			page: z.number().int().positive().optional(),
			perPage: z.number().int().positive().optional(),
			search: z.string().optional(),
			filters: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional()
		});

		return fn(listInputSchema, async (input: ListInput) => {
			await checkAuth('list', input);
			let q = model.query();
			if (options?.with) {
				for (const relation of options.with) {
					q = q.with(relation);
				}
			}

			if (input?.search && typeof q.search === 'function') {
				q = q.search(input.search);
			}

			if (input?.filters) {
				for (const [key, value] of Object.entries(input.filters)) {
					if (value !== null && value !== undefined) {
						q = q.where(key, value);
					}
				}
			}

			if (options?.listQuery) {
				q = options.listQuery(q, input ?? {});
			}

			const perPage = input?.perPage ?? options?.pagination?.perPage ?? 20;
			const page = input?.page ?? 1;
			return await q.paginate(perPage, page);
		});
	})() : undefined;

	const getFn = shouldInclude('get', options) ? (() => {
		const isLive = options?.live?.includes('get');
		const fn = isLive ? (query as any).live : query;

		return fn(z.union([z.string(), z.number()]), async (id: string | number) => {
			await checkAuth('get', id);
			let q = model.query().where('id', id);
			if (options?.with) {
				for (const relation of options.with) {
					q = q.with(relation);
				}
			}
			const record = await q.first();
			if (!record) throw error(404, 'Not found');
			return record;
		});
	})() : undefined;

	const createFn = shouldInclude('create', options) ? (() => {
		const fillable = options?.fillable?.create || (model as any).fillable;
		const fSchema = formSchema((model as any).validation.create, fillable === 'auto' ? undefined : { pick: fillable });
		const createHandler = async (data: any) => {
			await checkAuth('create', data);
			const record = await model.create(data);
			
			if (listFn && typeof (listFn as any).refresh === 'function') {
				(listFn as any).refresh();
			}

			return { success: true, record };
		};
		return createMode === 'command' ? command(fSchema, createHandler) : form(fSchema, createHandler);
	})() : undefined;

	const updateFn = shouldInclude('update', options) ? (() => {
		const fillable = options?.fillable?.update || (model as any).fillable;
		const baseFSchema = formSchema((model as any).validation.update || (model as any).validation.create, fillable === 'auto' ? { partial: true } : { pick: fillable, partial: true });
		
		const updateSchema = z.object({
			...baseFSchema.shape,
			id: z.union([z.string(), z.number()])
		});
		const updateHandler = async (data: any) => {
			await checkAuth('update', data);
			const { id, ...updateData } = data;
			const record = await model.update(id, updateData);
			
			if (listFn && typeof (listFn as any).refresh === 'function') {
				(listFn as any).refresh();
			}
			if (getFn && typeof (getFn as any).refresh === 'function') {
				(getFn as any).refresh(id);
			}

			return { success: true, record };
		};
		return updateMode === 'command' ? command(updateSchema, updateHandler) : form(updateSchema, updateHandler);
	})() : undefined;

	const removeFn = shouldInclude('remove', options) ? (() => {
		return command(z.union([z.string(), z.number()]), async (id: string | number) => {
			await checkAuth('remove', id);
			await model.delete(id);
			
			if (listFn && typeof (listFn as any).refresh === 'function') {
				(listFn as any).refresh();
			}
			
			return { success: true };
		});
	})() : undefined;

	const defaultExports = {
		...(listFn && { list: listFn }),
		...(getFn && { get: getFn }),
		...(createFn && { create: createFn }),
		...(updateFn && { update: updateFn }),
		...(removeFn && { remove: removeFn })
	};

	type CreateFn = typeof createFn;
	type CreateForm = Extract<CreateFn, { for: any }>;
	type CreateCommand = Exclude<CreateFn, { for: any } | undefined>;

	type UpdateFn = typeof updateFn;
	type UpdateForm = Extract<UpdateFn, { for: any }>;
	type UpdateCommand = Exclude<UpdateFn, { for: any } | undefined>;

	type NarrowedCreate = O['mutationMode'] extends 'command'
		? CreateCommand
		: O['mutationMode'] extends { create: 'command' }
		? CreateCommand
		: CreateForm;

	type NarrowedUpdate = O['mutationMode'] extends 'command'
		? UpdateCommand
		: O['mutationMode'] extends { update: 'command' }
		? UpdateCommand
		: UpdateForm;

	return defaultExports as Omit<typeof defaultExports, 'create' | 'update'> & {
		create: typeof createFn extends undefined ? undefined : NarrowedCreate;
		update: typeof updateFn extends undefined ? undefined : NarrowedUpdate;
	};
}
