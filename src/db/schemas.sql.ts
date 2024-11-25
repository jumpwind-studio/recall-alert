import { createdAt, deletedAt, updatedAt } from '@/db/extra';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const recallsTable = sqliteTable('recalls', {
  id: integer().notNull().primaryKey({ autoIncrement: true }),
  date: integer({ mode: 'timestamp' }).$type<Date>(),
  linkHref: text().notNull().unique(),
  linkText: text().notNull(),
  product: text().notNull(),
  category: text().notNull(),
  reason: text().notNull(),
  company: text().notNull(),
  ...createdAt,
  ...updatedAt,
  ...deletedAt,
});

export type NewRecall = (typeof recallsTable)['$inferInsert'];
export type Recall = (typeof recallsTable)['$inferSelect'];
