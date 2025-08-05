import { z } from 'zod';

export const postsCreateSchema = z.object({
  title: z.string().max(255).min(5).describe('Title must be between 5-255 characters'),
  slug: z.string(),
  content: z.string(),
  published: z.boolean().optional(),
  userId: z.number().int()
});

export type PostsCreate = z.infer<typeof postsCreateSchema>;

export const postsUpdateSchema = z.object({
  title: z.string().max(255).min(5).describe('Title must be between 5-255 characters').optional(),
  slug: z.string().optional(),
  content: z.string().optional(),
  published: z.boolean().optional(),
  userId: z.number().int().optional()
});

export type PostsUpdate = z.infer<typeof postsUpdateSchema>;