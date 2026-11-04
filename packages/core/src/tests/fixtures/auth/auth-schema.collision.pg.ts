import { pgTable, text } from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
  id: text('id').primaryKey(),
});

export const users = pgTable('users', {
  id: text('id').primaryKey(),
});
