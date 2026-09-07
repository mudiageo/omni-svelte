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
export type PolicyRule<M extends typeof Model, U extends User = User> = (
	user: U | null,
	record?: InstanceType<M>
) => boolean | undefined | Promise<boolean | undefined>;

/**
 * A policy definition containing the model and its rules.
 * Type parameter R captures the exact string literal keys of the rules for type-safe action checks.
 */
export interface Policy<M extends typeof Model, R extends Record<string, PolicyRule<M, U>>, U extends User = User> {
	model: M;
	rules: R & { before?: PolicyRule<M, U> };
}

/** Internal result type used to track why authorization was denied */
type AuthResult = { allowed: true } | { allowed: false; reason: string };

/**
 * Internal helper that evaluates a policy and returns a structured result with a denial reason.
 * Used by both `can()` and `authorize()` to avoid duplicating logic.
 */
async function _evaluate<M extends typeof Model, R extends Record<string, PolicyRule<M, U>>, U extends User = User>(
	user: U | null,
	action: keyof R,
	record: InstanceType<M> | undefined,
	policy: Policy<M, R, U>
): Promise<AuthResult> {
	// 1. Run the `before` hook if present
	if (policy.rules.before) {
		const beforeResult = await policy.rules.before(user, record);
		if (beforeResult !== undefined) {
			return beforeResult
				? { allowed: true }
				: { allowed: false, reason: 'denied by before hook' };
		}
	}

	// 2. Look up the specific action rule
	const rule = policy.rules[action];
	if (!rule) {
		return { allowed: false, reason: `no rule defined for '${String(action)}'` };
	}

	// 3. Evaluate the rule
	const result = await rule(user, record);
	return result === true
		? { allowed: true }
		: { allowed: false, reason: 'rule denied the action' };
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
export async function can<M extends typeof Model, R extends Record<string, PolicyRule<M, U>>, U extends User = User>(
	user: U | null,
	action: keyof R,
	record: InstanceType<M> | undefined,
	policy: Policy<M, R, U>
): Promise<boolean> {
	const result = await _evaluate(user, action, record, policy);
	return result.allowed;
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
 * @throws {ForbiddenError} If the policy denies the action, with a specific reason
 */
export async function authorize<M extends typeof Model, R extends Record<string, PolicyRule<M, U>>, U extends User = User>(
	user: U | null,
	action: keyof R,
	record: InstanceType<M> | undefined,
	policy: Policy<M, R, U>
): Promise<void> {
	const result = await _evaluate(user, action, record, policy);

	if (!result.allowed) {
		const resourceName =
			('table' in policy.model ? policy.model.table : policy.model.name) || 'Resource';
		throw new ForbiddenError(String(action), String(resourceName), result.reason);
	}
}

/**
 * Defines a new authorization policy for a model.
 * Policies compose cleanly by allowing a `before` hook to short-circuit authorization.
 *
 * There are no file conventions — policies can be defined anywhere and multiple policies
 * per file are perfectly fine.
 *
 * @example
 * ```ts
 * const postPolicy = definePolicy<typeof Post, typeof rules, CustomUser>(Post, {
 *   before: (user) => user?.role === 'admin' ? true : undefined,
 *   update: (user, post) => user?.id === post?.authorId,
 *   delete: (user, post) => user?.id === post?.authorId,
 * });
 * ```
 *
 * @param model The OmniSvelte model class this policy applies to
 * @param rules An object mapping action names to policy rules
 * @returns A strictly typed Policy object
 */
export function definePolicy<M extends typeof Model, R extends Record<string, PolicyRule<M, U>>, U extends User = User>(
	model: M,
	rules: R & { before?: PolicyRule<M, U> }
): Policy<M, R, U> {
	return { model, rules };
}
