import { z } from 'zod';

export const usersCreateSchema = z.object({
  name: z.string().max(255).min(2).max(100).describe('Name must be between 2-100 characters'),
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/, "Password must contain at least one uppercase letter").regex(/[0-9]/, "Password must contain at least one number"),
  active: z.boolean().optional()
});

export type UsersCreate = z.infer<typeof usersCreateSchema>;

export const usersUpdateSchema = z.object({
  name: z.string().max(255).min(2).max(100).describe('Name must be between 2-100 characters').optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).regex(/[A-Z]/, "Password must contain at least one uppercase letter").regex(/[0-9]/, "Password must contain at least one number").optional(),
  active: z.boolean().optional()
});

export type UsersUpdate = z.infer<typeof usersUpdateSchema>;