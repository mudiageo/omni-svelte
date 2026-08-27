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
		posts: relation.hasMany(() => postSchema)
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

		published: field.boolean()
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
