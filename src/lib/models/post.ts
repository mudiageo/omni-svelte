import { createModel } from '$pkg/database'
import { posts } from '$lib/server/db/schema'
import { User } from './user.js'
import { z } from 'zod'

export const Post = createModel('post', {
  table: posts,
  fillable: ['title', 'content', 'user_id', 'published'],
  validation: {
    create: z.object({
      title: z.string().min(1, 'Title is required'),
      content: z.string().min(1, 'Content is required'),
      user_id: z.number().int('User ID must be an integer').positive('User ID must be positive'),
      published: z.boolean().optional()
    }),
    update: z.object({
      title: z.string().min(1, 'Title is required').optional(),
      content: z.string().min(1, 'Content is required').optional(),
      user_id: z.number().int('User ID must be an integer').positive('User ID must be positive').optional(),
      published: z.boolean().optional()
    })
  },
  casts: {
    published: 'boolean' as const,
    created_at: 'date' as const,
    updated_at: 'date' as const
  }
})

Post.relationships = {
  author: Post.belongsTo(User, 'user_id', 'id')
}
