import { createModel } from '$pkg/database'
import { users } from '$lib/server/db/schema'
import { z } from 'zod'

export const User = createModel('user', {
  table: users,
  fillable: ['name', 'email', 'password', 'active'],
  hidden: ['password'],
  validation: {
    create: z.object({
      name: z.string().min(1, 'Name is required'),
      email: z.email('Invalid email address'),
      password: z.string().min(6, 'Password must be at least 6 characters'),
      active: z.boolean().optional()
    }),
    update: z.object({
      name: z.string().min(1, 'Name is required').optional(),
      email: z.email('Invalid email address').optional(),
      password: z.string().min(6, 'Password must be at least 6 characters').optional(),
      active: z.boolean().optional()
    })
  },
  casts: {
    active: 'boolean' as const,
    created_at: 'date' as const,
    updated_at: 'date' as const
  }
})
