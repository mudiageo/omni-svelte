import { defineSchema, field, relation, auth } from 'omni-svelte/schema';

export const profileSchema = defineSchema(
	'profiles',
	{
		id: field.serial().primaryKey(),

		// Identity (name, email, password) lives in the Better Auth `user` table.
		// The profile only holds app-specific data and points at the auth user (text FK).
		userId: field.reference(() => auth.user).required().unique(),
		user: relation.belongsTo(() => auth.user, { via: 'userId' }),

		bio: field.string().optional(),

		avatar: field.url().optional(), // Note: storage configuration might need custom extensions, omitted for basic demo

		settings: field.json().default('{}').validate({
			theme: 'string?',
			notifications: 'boolean?',
			language: { enum: ['en', 'es', 'fr'] }
		}),

		status: field.enum('active', 'inactive', 'suspended').default('active'),

		active: field.boolean().default(true),

		posts: relation.hasMany(() => postSchema),
		comments: relation.hasMany(() => commentSchema),
		roles: relation.manyToMany(() => roleSchema, { through: () => userRoleSchema })
	},
	{
		timestamps: true,
		indexes: [['userId'], ['status', 'active']],
		fillable: 'auto',
		hidden: 'auto',
		realtime: {
			enabled: true,
			events: ['created', 'updated'],
			channels: (profile: { id: number | string }) => [`profiles`, `profile:${profile.id}`]
		}
	}
);

export const Profile = profileSchema.model;
export const User = Profile;

export const postSchema = defineSchema(
	'posts',
	{
		id: field.serial().primaryKey(),

		title: field.string().required().minLength(1, 'Title is required'),
		
		content: field.string().required().minLength(1, 'Content is required'),
		
		// Replaced integer with the new reference field type!
		userId: field.reference(() => profileSchema),
		ownerId: field.reference(() => auth.user).required(),
		
		// New relations API
		author: relation.belongsTo(() => profileSchema, { via: 'userId' }),

		published: field.boolean(),
		
		comments: relation.hasMany(() => commentSchema)
	},
	{
		timestamps: true,
		indexes: ['title', ['title', 'published']],
		fillable: 'auto',
		hidden: 'auto',
		validation: {
			onCreate: ['title', 'content', 'published'],
			onUpdate: ['title', 'content', 'published']
		},
		realtime: {
			enabled: true,
			events: ['created', 'updated'],
			channels: (post: { id: number | string }) => [`posts`, `post:${post.id}`]
		}
	}
);

export const Post = postSchema.model;

export const commentSchema = defineSchema(
	'comments',
	{
		id: field.serial().primaryKey(),
		content: field.string().required(),
		postId: field.reference(() => postSchema),
		authorId: field.reference(() => profileSchema),
		
		post: relation.belongsTo(() => postSchema, { via: 'postId' }),
		author: relation.belongsTo(() => profileSchema, { via: 'authorId' })
	},
	{
		timestamps: true
	}
);

export const Comment = commentSchema.model;

export const roleSchema = defineSchema(
	'roles',
	{
		id: field.serial().primaryKey(),
		name: field.string().unique(),
		users: relation.manyToMany(() => profileSchema, { through: () => userRoleSchema })
	},
	{
		timestamps: true
	}
);

export const Role = roleSchema.model;

export const userRoleSchema = defineSchema(
	'userRoles',
	{
		id: field.serial().primaryKey(),
		userId: field.reference(() => profileSchema),
		roleId: field.reference(() => roleSchema),
		
		user: relation.belongsTo(() => profileSchema, { via: 'userId' }),
		role: relation.belongsTo(() => roleSchema, { via: 'roleId' })
	}
);

export const UserRole = userRoleSchema.model;