// Auto-generated Drizzle schemas

import { serial, text, varchar, json, boolean, timestamp, pgTable } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  // avatar: text('// avatar'),
  // settings: text('// settings').default('{'),
  // status: text('// status').default('active'),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});



export type Users = typeof users.$inferSelect;
export type NewUsers = typeof users.$inferInsert;