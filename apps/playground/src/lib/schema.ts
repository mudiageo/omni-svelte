import { defineSchema, field, relation } from 'omni-svelte/schema';

export const userSchema = defineSchema(
	'users',
	{
		id: field.serial().primaryKey(),
		
		name: field.string(255).required().minLength(2).maxLength(100, 'Name must be between 2-100 characters'),
		
		email: field.email().unique().required(),
		
		password: field.password().required().minLength(8).requireUppercase().requireNumbers().hash('bcrypt'),
		
		avatar: field.url().optional(), // Note: storage configuration might need custom extensions, omitted for basic demo

		settings: field.json().default('{}').validate({
			theme: 'string?',
			notifications: 'boolean?',
			language: { enum: ['en', 'es', 'fr'] }
		}),
		
		status: field.enum('active', 'inactive', 'suspended').default('active'),
		
		active: field.boolean().default(true),

		// Note: computed fields are still fully supported using standard object definition syntax alongside fluent fields!
		fullName: {
			type: 'string',
			computed: true,
			get: (record: { firstName: string; lastName: string }) =>
				`${record.firstName} ${record.lastName}`.trim()
		},

		// New relations API
		posts: relation.hasMany(() => postSchema),
		profile: relation.hasOne(() => profileSchema),
		comments: relation.hasMany(() => commentSchema),
		roles: relation.manyToMany(() => roleSchema, { through: () => userRoleSchema })
	},
	{
		timestamps: true,
		indexes: ['email', ['name', 'active']],
		fillable: 'auto',
		hidden: 'auto',
		validation: {
			onCreate: ['name', 'email', 'password']
		},
		realtime: {
			enabled: true,
			events: ['created', 'updated'],
			channels: (user: { id: number | string }) => [`users`, `user:${user.id}`]
		}
	}
);

export const User = userSchema.model;

export const postSchema = defineSchema(
	'posts',
	{
		id: field.serial().primaryKey(),

		title: field.string().required().minLength(1, 'Title is required'),
		
		content: field.string().required().minLength(1, 'Content is required'),
		
		// Replaced integer with the new reference field type!
		userId: field.reference(() => userSchema),
		
		// New relations API
		author: relation.belongsTo(() => userSchema, { via: 'userId' }),

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
		authorId: field.reference(() => userSchema),
		
		post: relation.belongsTo(() => postSchema, { via: 'postId' }),
		author: relation.belongsTo(() => userSchema, { via: 'authorId' })
	},
	{
		timestamps: true
	}
);

export const Comment = commentSchema.model;

export const profileSchema = defineSchema(
	'profiles',
	{
		id: field.serial().primaryKey(),
		bio: field.string(),
		userId: field.reference(() => userSchema),
		
		user: relation.belongsTo(() => userSchema, { via: 'userId' })
	},
	{
		timestamps: true
	}
);

export const Profile = profileSchema.model;

export const roleSchema = defineSchema(
	'roles',
	{
		id: field.serial().primaryKey(),
		name: field.string().unique(),
		users: relation.manyToMany(() => userSchema, { through: () => userRoleSchema })
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
		userId: field.reference(() => userSchema),
		roleId: field.reference(() => roleSchema),
		
		user: relation.belongsTo(() => userSchema, { via: 'userId' }),
		role: relation.belongsTo(() => roleSchema, { via: 'roleId' })
	}
);

export const UserRole = userRoleSchema.model;
