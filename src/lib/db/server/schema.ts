// Auto-generated Drizzle schemas

import { serial, text, varchar, boolean, timestamp, pgTable, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const users_email_idx = index('users_email_idx').on(users.email);
export const users_[name_idx = index('users_[name_idx').on(users.[name);
export const users_active_idx = index('users_active_idx').on(users.active);

export type Users = typeof users.$inferSelect;
export type NewUsers = typeof users.$inferInsert;