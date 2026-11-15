/// <reference path="../../../../.omni/schema.d.ts" />
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as pgFixture from '../../fixtures/auth/auth-schema.pg';
import {
	introspectAuthModule,
	type AuthRegistry,
	renderSchemaDts,
	buildAuthRegistry,
	resetAuthRegistryCache
} from '../../../runtime/auth/registry.js';
import { AuthDiagnostic } from '../../../runtime/auth/diagnostics.js';
import {
	VirtualRelationRegistry,
	collectVirtualRelations,
	getVirtualRelationRegistry,
	resetVirtualRelationRegistry,
	setVirtualRelationRegistry
} from '../../../schema/virtual-relations.js';
import { relation } from '../../../schema/relation.js';
import { auth } from '../../../schema/auth-reference.js';
import { ModelGenerator } from '../../../schema/generators/model.js';
import { ReadonlyModel, Model } from '../../../database/model.js';
import { RelationshipLoader } from '../../../database/relationships.js';
import { registerModel, getModel } from '../../../database/hooks.js';
import { resource } from '../../../remote/resource.js';
import { mkdtemp, rm, mkdir, copyFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('PR 4: Virtual and inverse relations on auth tables', () => {
	let registry: AuthRegistry;

	beforeEach(() => {
		resetAuthRegistryCache();
		resetVirtualRelationRegistry();
		registry = {
			dialect: 'pg',
			schemas: introspectAuthModule(pgFixture, { dialect: 'pg', usePlural: false }),
			hash: 'test-hash'
		};
	});

	afterEach(() => {
		resetAuthRegistryCache();
		resetVirtualRelationRegistry();
	});

	describe('VirtualRelationRegistry unit tests', () => {
		it('registers a virtual relation and retrieves it with for()', () => {
			const vReg = new VirtualRelationRegistry();
			vReg.add(
				{
					onSystemKey: 'user',
					name: 'posts',
					kind: 'hasMany',
					targetTable: 'posts',
					foreignKey: { column: 'author_id', property: 'authorId' },
					declaredBy: 'posts.author'
				},
				{ columnProps: new Set(['id', 'email', 'name']) }
			);

			const rels = vReg.for('user');
			expect(rels).toHaveLength(1);
			expect(rels[0]).toEqual({
				onSystemKey: 'user',
				name: 'posts',
				kind: 'hasMany',
				targetTable: 'posts',
				foreignKey: { column: 'author_id', property: 'authorId' },
				declaredBy: 'posts.author'
			});
			expect(vReg.for('session')).toHaveLength(0);
		});

		it('throws AUTH005 when inverse name collides with a column on the target table', () => {
			const vReg = new VirtualRelationRegistry();
			expect(() => {
				vReg.add(
					{
						onSystemKey: 'user',
						name: 'email', // Collides with column "email"
						kind: 'hasOne',
						targetTable: 'emails',
						foreignKey: { column: 'user_id', property: 'userId' },
						declaredBy: 'emails.user'
					},
					{ columnProps: new Set(['id', 'email', 'name']) }
				);
			}).toThrowError(AuthDiagnostic);

			try {
				vReg.add(
					{
						onSystemKey: 'user',
						name: 'name',
						kind: 'hasOne',
						targetTable: 'names',
						foreignKey: { column: 'user_id', property: 'userId' },
						declaredBy: 'names.user'
					},
					{ columnProps: new Set(['id', 'email', 'name']) }
				);
			} catch (err: any) {
				expect(err.code).toBe('AUTH005');
				expect(err.message).toContain('collides with a column of the same name');
				expect(err.message).toContain('declared by names.user');
			}
		});

		it('throws AUTH005 when two schemas declare the same inverse name on the same system table', () => {
			const vReg = new VirtualRelationRegistry();
			vReg.add(
				{
					onSystemKey: 'user',
					name: 'posts',
					kind: 'hasMany',
					targetTable: 'posts',
					foreignKey: { column: 'author_id', property: 'authorId' },
					declaredBy: 'posts.author'
				},
				{ columnProps: new Set(['id']) }
			);

			expect(() => {
				vReg.add(
					{
						onSystemKey: 'user',
						name: 'posts',
						kind: 'hasMany',
						targetTable: 'articles',
						foreignKey: { column: 'author_id', property: 'authorId' },
						declaredBy: 'articles.author'
					},
					{ columnProps: new Set(['id']) }
				);
			}).toThrowError(AuthDiagnostic);

			try {
				vReg.add(
					{
						onSystemKey: 'user',
						name: 'posts',
						kind: 'hasMany',
						targetTable: 'articles',
						foreignKey: { column: 'author_id', property: 'authorId' },
						declaredBy: 'articles.author'
					},
					{ columnProps: new Set(['id']) }
				);
			} catch (err: any) {
				expect(err.code).toBe('AUTH005');
				expect(err.message).toContain(
					'is already defined by posts.author; second declaration: articles.author'
				);
				expect(err.hint).toContain('Rename one of the inverse names');
			}
		});

		it('allows idempotent re-declaration when declaredBy matches', () => {
			const vReg = new VirtualRelationRegistry();
			vReg.add(
				{
					onSystemKey: 'user',
					name: 'posts',
					kind: 'hasMany',
					targetTable: 'posts',
					foreignKey: { column: 'author_id', property: 'authorId' },
					declaredBy: 'posts.author'
				},
				{ columnProps: new Set() }
			);

			// Re-adding with same declaredBy should NOT throw AUTH005
			expect(() => {
				vReg.add(
					{
						onSystemKey: 'user',
						name: 'posts',
						kind: 'hasMany',
						targetTable: 'posts',
						foreignKey: { column: 'author_id', property: 'authorId' },
						declaredBy: 'posts.author'
					},
					{ columnProps: new Set() }
				);
			}).not.toThrow();

			expect(vReg.for('user')).toHaveLength(1);
		});

		it('removes schema relations with removeForSchema()', () => {
			const vReg = new VirtualRelationRegistry();
			vReg.add(
				{
					onSystemKey: 'user',
					name: 'posts',
					kind: 'hasMany',
					targetTable: 'posts',
					foreignKey: { column: 'author_id', property: 'authorId' },
					declaredBy: 'posts.author'
				},
				{ columnProps: new Set() }
			);
			vReg.add(
				{
					onSystemKey: 'user',
					name: 'comments',
					kind: 'hasMany',
					targetTable: 'comments',
					foreignKey: { column: 'author_id', property: 'authorId' },
					declaredBy: 'comments.author'
				},
				{ columnProps: new Set() }
			);

			expect(vReg.for('user')).toHaveLength(2);
			vReg.removeForSchema('posts');
			expect(vReg.for('user')).toHaveLength(1);
			expect(vReg.for('user')[0].name).toBe('comments');
		});

		it('supports setting default registry with setVirtualRelationRegistry()', () => {
			const customReg = new VirtualRelationRegistry();
			customReg.add(
				{
					onSystemKey: 'user',
					name: 'custom',
					kind: 'hasMany',
					targetTable: 'custom',
					foreignKey: { column: 'user_id', property: 'userId' },
					declaredBy: 'custom.user'
				},
				{ columnProps: new Set() }
			);

			setVirtualRelationRegistry(customReg);
			expect(getVirtualRelationRegistry()).toBe(customReg);
			expect(getVirtualRelationRegistry().for('user')).toHaveLength(1);
		});

		it('clears all registered relations on clear()', () => {
			const vReg = new VirtualRelationRegistry();
			vReg.add(
				{
					onSystemKey: 'user',
					name: 'posts',
					kind: 'hasMany',
					targetTable: 'posts',
					foreignKey: { column: 'author_id', property: 'authorId' },
					declaredBy: 'posts.author'
				},
				{ columnProps: new Set() }
			);
			expect(vReg.for('user')).toHaveLength(1);
			vReg.clear();
			expect(vReg.for('user')).toHaveLength(0);
		});
	});

	describe('relation builders and options', () => {
		it('allows inverse string option on relation.belongsTo', () => {
			const def = relation.belongsTo(() => auth.user, { via: 'authorId', inverse: 'posts' });
			expect(def.kind).toBe('belongsTo');
			expect(def.options?.inverse).toBe('posts');
			expect(def.options?.via).toBe('authorId');
		});

		it('allows inverse object option on relation.belongsTo', () => {
			const def = relation.belongsTo(() => auth.user, {
				via: 'userId',
				inverse: { name: 'profile', kind: 'hasOne' }
			});
			expect(def.kind).toBe('belongsTo');
			expect(def.options?.inverse).toEqual({ name: 'profile', kind: 'hasOne' });
		});

		it('allows inverse string option on relation.manyToMany', () => {
			const dummyPivot = { name: 'team_members' };
			const def = relation.manyToMany(() => auth.user, {
				through: () => dummyPivot,
				inverse: 'teams'
			});
			expect(def.kind).toBe('manyToMany');
			expect(def.options?.inverse).toBe('teams');
		});

		it('throws AUTH005 when inverse is passed to relation.morphTo', () => {
			expect(() => {
				relation.morphTo({
					types: { user: () => auth.user },
					inverse: 'comments' as any
				});
			}).toThrowError(AuthDiagnostic);

			try {
				relation.morphTo({
					types: { user: () => auth.user },
					inverse: 'comments' as any
				});
			} catch (err: any) {
				expect(err.code).toBe('AUTH005');
				expect(err.message).toContain(
					'Polymorphic inverse on auth tables is not supported in this version'
				);
			}
		});
	});

	describe('collectVirtualRelations', () => {
		it('collects belongsTo and manyToMany inverse relations from schemas targeting auth tables', () => {
			const postSchema = {
				name: 'posts',
				fields: {
					authorId: { type: 'text', name: 'author_id' }
				},
				relations: {
					author: relation.belongsTo(() => auth.user, { via: 'authorId', inverse: 'posts' })
				}
			};

			const profileSchema = {
				name: 'profiles',
				fields: {
					userId: { type: 'text', name: 'user_id' }
				},
				relations: {
					user: relation.belongsTo(() => auth.user, {
						via: 'userId',
						inverse: { name: 'profile', kind: 'hasOne' }
					})
				}
			};

			const teamSchema = {
				name: 'teams',
				fields: {},
				relations: {
					members: relation.manyToMany(() => auth.user, {
						through: () => ({ name: 'team_members' }),
						foreignPivotKey: 'team_id',
						relatedPivotKey: 'user_id',
						inverse: 'teams'
					})
				}
			};

			const vReg = new VirtualRelationRegistry();
			collectVirtualRelations([postSchema, profileSchema, teamSchema], {
				authRegistry: registry,
				virtualRegistry: vReg
			});

			const userRels = vReg.for('user');
			expect(userRels).toHaveLength(3);

			const postsRel = userRels.find((r) => r.name === 'posts');
			expect(postsRel).toBeDefined();
			expect(postsRel?.kind).toBe('hasMany');
			expect(postsRel?.targetTable).toBe('posts');
			expect(postsRel?.foreignKey).toEqual({ column: 'author_id', property: 'authorId' });

			const profileRel = userRels.find((r) => r.name === 'profile');
			expect(profileRel).toBeDefined();
			expect(profileRel?.kind).toBe('hasOne');
			expect(profileRel?.targetTable).toBe('profiles');

			const teamRel = userRels.find((r) => r.name === 'teams');
			expect(teamRel).toBeDefined();
			expect(teamRel?.kind).toBe('manyToMany');
			expect(teamRel?.targetTable).toBe('teams');
			expect(teamRel?.through).toBe('team_members');
			// Inversed pivot keys: forward relatedPivotKey becomes inverse foreignPivotKey
			expect(teamRel?.foreignPivotKey).toBe('user_id');
			expect(teamRel?.relatedPivotKey).toBe('team_id');
		});

		it('validates against target column collisions during collection', () => {
			const badSchema = {
				name: 'profiles',
				fields: {
					userId: { type: 'text', name: 'user_id' }
				},
				relations: {
					user: relation.belongsTo(() => auth.user, {
						via: 'userId',
						inverse: 'email' // Collides with user.email
					})
				}
			};

			expect(() => {
				collectVirtualRelations([badSchema], { authRegistry: registry });
			}).toThrowError(AuthDiagnostic);
		});
	});

	describe('Codegen and declaration rendering', () => {
		it('injects virtual relationships into generated ReadonlyModel', () => {
			const vReg = getVirtualRelationRegistry();
			vReg.add(
				{
					onSystemKey: 'user',
					name: 'posts',
					kind: 'hasMany',
					targetTable: 'posts',
					foreignKey: { column: 'author_id', property: 'authorId' },
					declaredBy: 'posts.author',
					targetModel: 'posts'
				},
				{ columnProps: new Set() }
			);
			vReg.add(
				{
					onSystemKey: 'user',
					name: 'profile',
					kind: 'hasOne',
					targetTable: 'profiles',
					foreignKey: { column: 'user_id', property: 'userId' },
					declaredBy: 'profiles.user',
					targetModel: 'profiles'
				},
				{ columnProps: new Set() }
			);

			const userSchema = registry.schemas.get('user')!;
			const generator = new ModelGenerator(userSchema, {
				readonly: true,
				drizzle: { path: './src/lib/db/server/schema.ts', format: 'single-file' },
				model: { path: './src/lib/models', format: 'per-schema' }
			});

			const code = generator.generate();
			expect(code).toContain("static override systemKey = 'user' as const;");
			expect(code).toContain('static override relationships: Record<string, any> = {');
			expect(code).toContain('"posts": {');
			expect(code).toContain('"type": "hasMany"');
			expect(code).toContain('"model": "posts"');
			expect(code).toContain('"profile": {');
			expect(code).toContain('"type": "hasOne"');
			expect(code).toContain('"model": "profiles"');
			expect(code).toContain('static override with(');
		});

		it('renders unified .omni/schema.d.ts with AuthTables and AuthRelations', () => {
			const vReg = new VirtualRelationRegistry();
			vReg.add(
				{
					onSystemKey: 'user',
					name: 'posts',
					kind: 'hasMany',
					targetTable: 'posts',
					foreignKey: { column: 'author_id', property: 'authorId' },
					declaredBy: 'posts.author'
				},
				{ columnProps: new Set() }
			);

			const dts = renderSchemaDts(registry, vReg);
			expect(dts).toContain("declare module 'omni-svelte/schema'");
			expect(dts).toContain('interface AuthTables {');
			expect(dts).toContain('"user": true;');
			expect(dts).toContain('interface AuthRelations {');
			expect(dts).toContain('"user": {');
			expect(dts).toContain(
				'"posts": { kind: "hasMany"; target: typeof import("../src/lib/db/server/schema").posts };'
			);
			// Tables without inverse relations have an empty object definition to avoid TypeScript indexing errors
			expect(dts).toContain('"session": {};');
			expect(dts).toContain('"account": {};');
		});

		it('buildAuthRegistry writes .omni/schema.d.ts and .omni/auth-registry.d.ts', async () => {
			const root = await mkdtemp(join(tmpdir(), 'omni-dts-'));
			await mkdir(join(root, '.omni'), { recursive: true });

			try {
				await copyFile(
					join(__dirname, '../../fixtures/auth/auth-schema.pg.ts'),
					join(root, '.omni', 'auth-schema.ts')
				);

				await buildAuthRegistry({ root, dialect: 'pg', usePlural: false });

				const schemaDts = await readFile(join(root, '.omni', 'schema.d.ts'), 'utf8');
				const registryDts = await readFile(join(root, '.omni', 'auth-registry.d.ts'), 'utf8');

				expect(schemaDts).toContain("declare module 'omni-svelte/schema'");
				expect(schemaDts).toContain('interface AuthTables');
				expect(schemaDts).toContain('interface AuthRelations');

				expect(registryDts).toBe(schemaDts);
			} finally {
				await rm(root, { recursive: true, force: true });
			}
		});
	});

	describe('RelationshipLoader and eager loading with virtual relations', () => {
		it('eager loads inverse hasMany relation on a ReadonlyModel', async () => {
			// Mock database and models
			class MockPost extends Model {
				static override tableName = 'posts';
				static override table = {
					name: 'posts',
					authorId: 'authorId'
				} as any;
			}
			registerModel('posts', MockPost as any);

			class MockUser extends ReadonlyModel {
				static override readonly = true as const;
				static override tableName = 'user';
				static override table = { name: 'user' };
				static override primaryKey = 'id';
				static override systemKey = 'user' as const;
			}
			registerModel('auth.user', MockUser as any);

			const vReg = getVirtualRelationRegistry();
			vReg.add(
				{
					onSystemKey: 'user',
					name: 'posts',
					kind: 'hasMany',
					targetTable: 'posts',
					foreignKey: { column: 'author_id', property: 'authorId' },
					declaredBy: 'posts.author',
					targetModel: 'posts'
				},
				{ columnProps: new Set() }
			);

			const user1 = MockUser.fromAttributes({ id: 'u1', name: 'Alice' });
			const user2 = MockUser.fromAttributes({ id: 'u2', name: 'Bob' });

			// Mock Drizzle query response in RelationshipLoader
			const selectMock = vi.fn().mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue([
						{ id: 1, title: 'Post 1', authorId: 'u1' },
						{ id: 2, title: 'Post 2', authorId: 'u1' },
						{ id: 3, title: 'Post 3', authorId: 'u2' }
					])
				})
			});

			const { setDatabase } = await import('../../../database/database.js');
			setDatabase({
				select: selectMock
			} as any);

			await RelationshipLoader.loadRelations([user1, user2], ['posts']);

			expect((user1 as any).posts).toHaveLength(2);
			expect((user1 as any).posts[0].title).toBe('Post 1');
			expect((user1 as any).posts[1].title).toBe('Post 2');

			expect((user2 as any).posts).toHaveLength(1);
			expect((user2 as any).posts[0].title).toBe('Post 3');

			// Also verify toJSON includes loaded relations
			const json = user1.toJSON();
			expect(json.posts).toBeDefined();
			expect(json.posts).toHaveLength(2);
		});

		it('eager loads inverse hasOne relation on a ReadonlyModel', async () => {
			class MockProfile extends Model {
				static override tableName = 'profiles';
				static override table = {
					name: 'profiles',
					userId: 'userId'
				} as any;
			}
			registerModel('profiles', MockProfile as any);

			class MockUser extends ReadonlyModel {
				static override readonly = true as const;
				static override tableName = 'user';
				static override table = { name: 'user' };
				static override primaryKey = 'id';
				static override systemKey = 'user' as const;
			}
			registerModel('auth.user', MockUser as any);

			const vReg = getVirtualRelationRegistry();
			vReg.add(
				{
					onSystemKey: 'user',
					name: 'profile',
					kind: 'hasOne',
					targetTable: 'profiles',
					foreignKey: { column: 'user_id', property: 'userId' },
					declaredBy: 'profiles.user',
					targetModel: 'profiles'
				},
				{ columnProps: new Set() }
			);

			const user = MockUser.fromAttributes({ id: 'u1', name: 'Alice' });

			const selectMock = vi.fn().mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockResolvedValue([{ id: 10, bio: 'Hello world', userId: 'u1' }])
				})
			});

			const { setDatabase } = await import('../../../database/database.js');
			setDatabase({
				select: selectMock
			} as any);

			await RelationshipLoader.loadRelations([user], ['profile']);

			expect((user as any).profile).toBeDefined();
			expect((user as any).profile.bio).toBe('Hello world');
		});

		it('supports nested relationship loading with dot notation', async () => {
			class MockComment extends Model {
				static override tableName = 'comments';
				static override table = { name: 'comments', postId: 'postId' } as any;
			}
			registerModel('comments', MockComment as any);

			class MockPost extends Model {
				static override tableName = 'posts';
				static override table = { name: 'posts', authorId: 'authorId' } as any;
				static override relationships: Record<string, any> = {
					comments: {
						type: 'hasMany',
						model: 'comments',
						foreignKey: 'postId',
						localKey: 'id'
					}
				};
			}
			registerModel('posts', MockPost as any);

			class MockUser extends ReadonlyModel {
				static override readonly = true as const;
				static override tableName = 'user';
				static override table = { name: 'user' };
				static override primaryKey = 'id';
				static override systemKey = 'user' as const;
				static override relationships: Record<string, any> = {
					posts: {
						type: 'hasMany',
						model: 'posts',
						foreignKey: 'authorId',
						localKey: 'id'
					}
				};
			}
			registerModel('auth.user', MockUser as any);

			const user = MockUser.fromAttributes({ id: 'u1', name: 'Alice' });

			let callCount = 0;
			const selectMock = vi.fn().mockReturnValue({
				from: vi.fn().mockImplementation((table) => ({
					where: vi.fn().mockImplementation(async () => {
						callCount++;
						if (table.name === 'posts') {
							return [{ id: 100, title: 'Deep Post', authorId: 'u1' }];
						}
						if (table.name === 'comments') {
							return [{ id: 500, text: 'Great post!', postId: 100 }];
						}
						return [];
					})
				}))
			});

			const { setDatabase } = await import('../../../database/database.js');
			setDatabase({
				select: selectMock
			} as any);

			await RelationshipLoader.loadRelations([user], ['posts.comments']);

			expect((user as any).posts).toHaveLength(1);
			expect((user as any).posts[0].comments).toHaveLength(1);
			expect((user as any).posts[0].comments[0].text).toBe('Great post!');
		});

		it('reuses already loaded relations without redundant DB queries when loading nested paths', async () => {
			class NestedComment extends ReadonlyModel {
				static override tableName = 'comments';
				static override table = { name: 'comments' };
				static override primaryKey = 'id';
			}
			registerModel('comments2', NestedComment as any);

			class NestedPost extends ReadonlyModel {
				static override tableName = 'posts';
				static override table = { name: 'posts' };
				static override primaryKey = 'id';
				static override relationships: Record<string, any> = {
					comments: {
						type: 'hasMany',
						model: 'comments2',
						foreignKey: 'postId',
						localKey: 'id'
					}
				};
			}
			registerModel('posts2', NestedPost as any);

			class NestedUser extends ReadonlyModel {
				static override readonly = true as const;
				static override tableName = 'user';
				static override table = { name: 'user' };
				static override primaryKey = 'id';
				static override systemKey = 'user' as const;
				static override relationships: Record<string, any> = {
					posts: {
						type: 'hasMany',
						model: 'posts2',
						foreignKey: 'authorId',
						localKey: 'id'
					}
				};
			}
			registerModel('auth.nestedUser', NestedUser as any);

			const user = NestedUser.fromAttributes({ id: 'u2', name: 'Bob' });

			let postQueries = 0;
			let commentQueries = 0;
			const selectMock = vi.fn().mockReturnValue({
				from: vi.fn().mockImplementation((table) => ({
					where: vi.fn().mockImplementation(async () => {
						if (table.name === 'posts') {
							postQueries++;
							return [{ id: 200, title: 'Reused Post', authorId: 'u2' }];
						}
						if (table.name === 'comments') {
							commentQueries++;
							return [{ id: 600, text: 'Reused comment', postId: 200 }];
						}
						return [];
					})
				}))
			});

			const { setDatabase } = await import('../../../database/database.js');
			setDatabase({
				select: selectMock
			} as any);

			// Loading 'posts' then 'posts.comments' in one call
			await RelationshipLoader.loadRelations([user], ['posts', 'posts.comments']);

			expect((user as any).posts).toHaveLength(1);
			expect((user as any).posts[0].comments).toHaveLength(1);
			// posts must only be queried once, not twice!
			expect(postQueries).toBe(1);
			expect(commentQueries).toBe(1);
		});

		it('setRelation does not overwrite inherited prototype methods', () => {
			class TestModel extends ReadonlyModel {
				static override tableName = 'test';
			}
			const instance = new TestModel({ id: 1 });
			const originalGetRelation = instance.getRelation;

			instance.setRelation('getRelation', 'malicious-value');
			// relations dictionary stores it
			expect(instance.relations['getRelation']).toBe('malicious-value');
			// but instance.getRelation is still a function, not overwritten by defineProperty
			expect(typeof instance.getRelation).toBe('function');
			expect(instance.getRelation).toBe(originalGetRelation);
		});
	});

	describe('resource() with inverse relations', () => {
		it('creates query endpoints accepting with: [...] option', async () => {
			class UserResourceModel extends ReadonlyModel {
				static override readonly = true as const;
				static override tableName = 'user';
				static override table = { name: 'user' };
				static override primaryKey = 'id';
				static override systemKey = 'user' as const;
				static override relationships: Record<string, any> = {
					posts: {
						type: 'hasMany',
						model: 'posts',
						foreignKey: 'authorId',
						localKey: 'id'
					}
				};
			}

			const endpoints = resource(UserResourceModel, {
				only: ['list', 'get'],
				with: ['posts']
			});

			expect(endpoints.list).toBeDefined();
			expect(endpoints.get).toBeDefined();
			expect(() => (endpoints as any).create()).toThrowError(AuthDiagnostic);
			expect(() => (endpoints as any).update()).toThrowError(AuthDiagnostic);
			expect(() => (endpoints as any).remove()).toThrowError(AuthDiagnostic);
		});
	});
});
