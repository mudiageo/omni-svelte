// Auto-generated Drizzle schemas

import { integer, serial, text, boolean, timestamp, pgTable, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  active: boolean('active').default(true),
  fullName: text('fullName'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const users_email_idx = index('users_email_idx').on(users.email);
export const users_[name_idx = index('users_[name_idx').on(users.[name);
export const users_active_idx = index('users_active_idx').on(users.active);

export type Users = typeof users.$inferSelect;
export type NewUsers = typeof users.$inferInsert;

import { integer, serial, text, boolean, timestamp, pgTable, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  active: boolean('active').default(true),
  fullName: text('fullName'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const users_email_idx = index('users_email_idx').on(users.email);
export const users_[name_idx = index('users_[name_idx').on(users.[name);
export const users_active_idx = index('users_active_idx').on(users.active);

export type Users = typeof users.$inferSelect;
export type NewUsers = typeof users.$inferInsert;

import { integer, serial, text, boolean, timestamp, pgTable, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: text('slug').notNull().unique(),
  content: .notNull(),
  published: boolean('published').default(false),
  userId: integer('userId').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const posts_slug_idx = index('posts_slug_idx').on(posts.slug);
export const posts_published_idx = index('posts_published_idx').on(posts.published);
export const posts_[userId_idx = index('posts_[userId_idx').on(posts.[userId);
export const posts_published_idx = index('posts_published_idx').on(posts.published);

export type Posts = typeof posts.$inferSelect;
export type NewPosts = typeof posts.$inferInsert;