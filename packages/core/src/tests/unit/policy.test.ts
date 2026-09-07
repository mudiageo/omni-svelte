import { describe, it, expect } from 'vitest';
import { definePolicy, can, authorize } from '../../runtime/auth/policy.js';
import { ForbiddenError } from '../../errors.js';
import { Model } from '../../database/model.js';
import type { User } from 'better-auth';

// Define mock model for testing
class MockPostModel extends Model {
	static tableName = 'posts';
	id: number = 1;
	authorId: string = 'user-123';
	locked: boolean = false;

	constructor(attrs: Record<string, any> = {}) {
		super(attrs);
		Object.assign(this, attrs);
	}
}

const mockUser: User = {
	id: 'user-123',
	name: 'Test Author',
	email: 'author@example.com',
	emailVerified: true,
	createdAt: new Date(),
	updatedAt: new Date()
};

const otherUser: User = {
	id: 'user-456',
	name: 'Other User',
	email: 'other@example.com',
	emailVerified: true,
	createdAt: new Date(),
	updatedAt: new Date()
};

const adminUser: User & { role: string } = {
	id: 'admin-999',
	name: 'Admin User',
	email: 'admin@example.com',
	emailVerified: true,
	createdAt: new Date(),
	updatedAt: new Date(),
	role: 'admin'
};

describe('Policy Authorization Layer (§C.1)', () => {
	it('defines policy rules correctly', () => {
		const postPolicy = definePolicy(MockPostModel, {
			update: (user, post) => user?.id === post?.authorId,
			delete: (user, post) => user?.id === post?.authorId
		});

		expect(postPolicy).toBeDefined();
		expect(postPolicy.model).toBe(MockPostModel);
		expect(typeof postPolicy.rules.update).toBe('function');
	});

	it('authorizes actions using can()', async () => {
		const postPolicy = definePolicy(MockPostModel, {
			update: (user, post) => user?.id === post?.authorId,
			delete: (user) => (user as any)?.role === 'admin'
		});

		const post = new MockPostModel({ id: 1, authorId: 'user-123' });

		// Author can update
		expect(await can(mockUser, 'update', post, postPolicy)).toBe(true);

		// Non-author cannot update
		expect(await can(otherUser, 'update', post, postPolicy)).toBe(false);

		// Unauthenticated user cannot update
		expect(await can(null, 'update', post, postPolicy)).toBe(false);

		// Non-admin cannot delete
		expect(await can(mockUser, 'delete', post, postPolicy)).toBe(false);

		// Admin can delete
		expect(await can(adminUser, 'delete', post, postPolicy)).toBe(true);
	});

	it('supports before hook short-circuiting', async () => {
		const postPolicy = definePolicy(MockPostModel, {
			before: (user) => ((user as any)?.role === 'admin' ? true : undefined),
			update: (user, post) => user?.id === post?.authorId,
			delete: (user, post) => user?.id === post?.authorId
		});

		const post = new MockPostModel({ id: 1, authorId: 'user-123' });

		// Admin short-circuits to true even if not the author
		expect(await can(adminUser, 'update', post, postPolicy)).toBe(true);
		expect(await can(adminUser, 'delete', post, postPolicy)).toBe(true);

		// Non-admin falls through to author check
		expect(await can(mockUser, 'update', post, postPolicy)).toBe(true);
		expect(await can(otherUser, 'update', post, postPolicy)).toBe(false);
	});

	it('supports before hook denial short-circuiting', async () => {
		const postPolicy = definePolicy(MockPostModel, {
			before: (user) => ((user as any)?.banned ? false : undefined),
			update: (user, post) => user?.id === post?.authorId
		});

		const bannedAuthor = { ...mockUser, banned: true };
		const post = new MockPostModel({ id: 1, authorId: 'user-123' });

		// Banned author short-circuits to false even though they own the post
		expect(await can(bannedAuthor, 'update', post, postPolicy)).toBe(false);
	});

	it('supports async policy rules', async () => {
		const postPolicy = definePolicy(MockPostModel, {
			update: async (user, post) => {
				// simulate async check (e.g. database query / permission check)
				await new Promise((resolve) => setTimeout(resolve, 5));
				return user?.id === post?.authorId && !post?.locked;
			}
		});

		const unlockedPost = new MockPostModel({ id: 1, authorId: 'user-123', locked: false });
		const lockedPost = new MockPostModel({ id: 2, authorId: 'user-123', locked: true });

		expect(await can(mockUser, 'update', unlockedPost, postPolicy)).toBe(true);
		expect(await can(mockUser, 'update', lockedPost, postPolicy)).toBe(false);
	});

	it('throws ForbiddenError on authorize() when denied', async () => {
		const postPolicy = definePolicy(MockPostModel, {
			update: (user, post) => user?.id === post?.authorId
		});

		const post = new MockPostModel({ id: 1, authorId: 'user-123' });

		// Should resolve without error
		await expect(authorize(mockUser, 'update', post, postPolicy)).resolves.toBeUndefined();

		// Should throw ForbiddenError
		await expect(authorize(otherUser, 'update', post, postPolicy)).rejects.toThrow(ForbiddenError);

		try {
			await authorize(otherUser, 'update', post, postPolicy);
		} catch (error: any) {
			expect(error).toBeInstanceOf(ForbiddenError);
			expect(error.action).toBe('update');
			expect(error.resource).toBe('posts');
			// Rule exists but denied — meaningful reason
			expect(error.reason).toBe('rule denied the action');
		}
	});

	it('provides a meaningful reason when denied by the before hook', async () => {
		const postPolicy = definePolicy(MockPostModel, {
			before: (user) => ((user as any)?.banned ? false : undefined),
			update: (user, post) => user?.id === post?.authorId
		});

		const bannedAuthor = { ...mockUser, banned: true };
		const post = new MockPostModel({ id: 1, authorId: 'user-123' });

		try {
			await authorize(bannedAuthor, 'update', post, postPolicy);
		} catch (error: any) {
			expect(error).toBeInstanceOf(ForbiddenError);
			expect(error.reason).toBe('denied by before hook');
		}
	});

	it('denies and provides a reason when no rule is defined for the action', async () => {
		const postPolicy = definePolicy(MockPostModel, {
			update: (user, post) => user?.id === post?.authorId
		});

		const post = new MockPostModel({ id: 1, authorId: 'user-123' });

		// 'delete' is not defined in this policy — should default-deny
		expect(await can(mockUser, 'delete' as any, post, postPolicy)).toBe(false);

		try {
			await authorize(mockUser, 'delete' as any, post, postPolicy);
		} catch (error: any) {
			expect(error).toBeInstanceOf(ForbiddenError);
			expect(error.reason).toBe("no rule defined for 'delete'");
		}
	});
});
