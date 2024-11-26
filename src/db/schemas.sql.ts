import { createdAt, deletedAt, id, updatedAt } from '@/db/extra';
import { createInsertSchema, createSelectSchema } from '@/lib/drizzle-valibot';
import { relations } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type * as v from 'valibot';

export const recallsTable = sqliteTable('recalls', {
  ...id,
  sourceId: integer()
    .references(() => sourcesTable.id)
    .notNull(),
  linkHref: text().notNull().unique(),
  linkText: text().notNull(),
  product: text().notNull(),
  category: text().notNull(),
  reason: text().notNull(),
  company: text().notNull(),
  date: integer({ mode: 'timestamp' }).$type<Date>(),
  ...createdAt,
  ...updatedAt,
  ...deletedAt,
});

export const recallsTableRelations = relations(recallsTable, ({ one, many }) => ({
  source: one(sourcesTable, {
    fields: [recallsTable.sourceId],
    references: [sourcesTable.id],
  }),
  posts: many(postsTable),
}));

export type NewRecall = (typeof recallsTable)['$inferInsert'];
export type Recall = (typeof recallsTable)['$inferSelect'];

export const sourcesTable = sqliteTable('sources', {
  ...id,
  /**
   * ISO 3166-1 alpha-2 country code and organizational abbreviation.
   * Example: US-FDA
   * */
  key: text().notNull().unique(), // US-FDA
  /**
   * Full name of source.
   * Example: U.S. Food and Drug Administration
   * */
  name: text().notNull(),
  ...createdAt,
  ...updatedAt,
  ...deletedAt,
});

export const sourcesTableRelations = relations(sourcesTable, ({ many }) => ({
  recalls: many(recallsTable),
}));

export type NewSource = (typeof sourcesTable)['$inferInsert'];
export type Source = (typeof sourcesTable)['$inferSelect'];

export const postsTable = sqliteTable('posts', {
  ...id,
  title: text().notNull(),
  content: text().notNull(),
  uri: text().notNull(),
  cid: text().notNull(),
  metadata: text({ mode: 'json' }),
  embeds: text({ mode: 'json' }),
  raw: text({ mode: 'json' }).notNull(),
  recallId: integer()
    .references(() => recallsTable.id)
    .notNull(),
  ...createdAt,
  ...updatedAt,
  ...deletedAt,
});

export const postsTableRelations = relations(postsTable, ({ one }) => ({
  recall: one(recallsTable, {
    fields: [postsTable.recallId],
    references: [recallsTable.id],
  }),
}));

export const NewPostSchema = createInsertSchema(postsTable);
export const PostSchema = createSelectSchema(postsTable);

export type NewPost = v.InferOutput<typeof NewPostSchema>;
export type Post = v.InferOutput<typeof PostSchema>;
