import { pgTable, text, primaryKey } from 'drizzle-orm/pg-core';

export const userRole = pgTable(
  'user_role',
  {
    userId: text('user_id').notNull(),
    roleId: text('role_id').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.roleId] }),
  ]
);
