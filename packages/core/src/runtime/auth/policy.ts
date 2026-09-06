import { ForbiddenError } from '../../errors.js';
import type { Model } from '../../database/model.js';
import type { User } from 'better-auth';

/**
 * A rule function that determines if a user can perform an action on a record.
 * 
 * @param user The authenticated user from Better Auth, or null if unauthenticated
 * @param record The model instance being authorized (optional for global actions)
 * @returns boolean (allow/deny), undefined (fallthrough to next rule), or a Promise of those
 */
export type PolicyRule<M extends typeof Model> = (
	user: User | null,
	record?: InstanceType<M>
) => boolean | undefined | Promise<boolean | undefined>;

/**
 * A policy definition containing the model and its rules.
 * Type parameter R captures the exact string literal keys of the rules for type-safe action checks.
 */
export interface Policy<M extends typeof Model, R extends Record<string, PolicyRule<M>>> {
	model: M;
	rules: R & { before?: PolicyRule<M> };
}

/**
 * Defines a new authorization policy for a model.
 * Policies compose cleanly by allowing a `before` hook to short-circuit authorization.
 * 
 * @example
 * ```ts
 * const postPolicy = definePolicy(Post, {
 *   before: (user) => user?.role === 'admin' ? true : undefined,
 *   update: (user, post) => user?.id === post?.authorId
 * });
 * ```
 * 
 * @param model The OmniSvelte model class this policy applies to
 * @param rules An object mapping action names to policy rules
 * @returns A strictly typed Policy object
 */
export function definePolicy<M extends typeof Model, R extends Record<string, PolicyRule<M>>>(
	model: M,
	rules: R & { before?: PolicyRule<M> }
): Policy<M, R> {
	return { model, rules };
}

/**
 * Checks if a user is authorized to perform an action according to a policy.
 * Does not throw an error if denied; simply returns false.
 * 
 * @example
 * ```ts
 * const allowed = await can(session?.user ?? null, 'update', post, postPolicy);
 * ```
 * 
 * @param user The authenticated user attempting the action (from Better Auth session)
 * @param action The specific action name (must match a key in the policy, strongly typed)
 * @param record The specific model instance being acted upon (optional)
 * @param policy The policy defining the rules
 * @returns True if authorized, false otherwise
 */
export async function can<M extends typeof Model, R extends Record<string, PolicyRule<M>>>(
	user: User | null,
	action: keyof R | 'before',
	record: InstanceType<M> | undefined,
	policy: Policy<M, R>
): Promise<boolean> {
	// 1. Check "before" hook if it exists
	if (policy.rules.before) {
		const beforeResult = await policy.rules.before(user, record);
		if (beforeResult !== undefined) {
			return beforeResult;
		}
	}

	// 2. Check the specific action rule
	if (action === 'before') {
		return false; // Can't explicitly check 'before' as an action if it fell through
	}

	const rule = policy.rules[action];
	if (!rule) {
		return false; // deny by default if no rule matches
	}

	const result = await rule(user, record);
	return result === true;
}

/**
 * Asserts that a user is authorized to perform an action.
 * Throws a typed `ForbiddenError` if the action is denied, which OmniSvelte
 * automatically maps to a 403 HTTP response in remote functions.
 * 
 * @example
 * ```ts
 * await authorize(session?.user ?? null, 'update', post, postPolicy); // throws ForbiddenError if denied
 * ```
 * 
 * @param user The authenticated user attempting the action (from Better Auth session)
 * @param action The specific action name (must match a key in the policy)
 * @param record The specific model instance being acted upon (optional)
 * @param policy The policy defining the rules
 * @throws {ForbiddenError} If the policy denies the action
 */
export async function authorize<M extends typeof Model, R extends Record<string, PolicyRule<M>>>(
	user: User | null,
	action: keyof R,
	record: InstanceType<M> | undefined,
	policy: Policy<M, R>
): Promise<void> {
	const isAllowed = await can(user, action, record, policy);
	
	if (!isAllowed) {
		// Use tableName or fallback to generic name
		const resourceName = ('tableName' in policy.model ? policy.model.tableName : policy.model.name) || 'Resource';
		throw new ForbiddenError(String(action), String(resourceName), 'no matching rule; check policy');
	}
}
