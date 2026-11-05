import { pgTable, uuid, text } from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
});
