import { createdAt, deletedAt, id, updatedAt } from '@/db/extra';
import { createInsertSchema, createSelectSchema } from '@/lib/drizzle-valibot';
import { relations } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import * as v from 'valibot';

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

export const NewRecallSchema = createInsertSchema(recallsTable, {
  date: v.optional(v.date()),
  id: v.never(),
  createdAt: v.never(),
  updatedAt: v.never(),
  deletedAt: v.never(),
});
export const RecallSchema = createSelectSchema(recallsTable);

export type NewRecall = v.InferInput<typeof NewRecallSchema>;
export type Recall = v.InferInput<typeof RecallSchema>;

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

export const NewSourceSchema = createInsertSchema(sourcesTable, {
  id: v.never(),
  createdAt: v.never(),
  updatedAt: v.never(),
  deletedAt: v.never(),
});
export const SourceSchema = createSelectSchema(sourcesTable);

export type NewSource = v.InferInput<typeof NewSourceSchema>;
export type Source = v.InferInput<typeof SourceSchema>;

export const postsTable = sqliteTable('posts', {
  ...id,
  recallId: integer()
    .references(() => recallsTable.id)
    .notNull(),
  title: text().notNull(),
  content: text().notNull(),
  uri: text().notNull().unique(),
  cid: text().notNull(),
  metadata: text({ mode: 'json' }),
  embeds: text({ mode: 'json' }),
  raw: text({ mode: 'json' }).notNull(),
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

export const NewPostSchema = createInsertSchema(postsTable, {
  id: v.never(),
  createdAt: v.never(),
  updatedAt: v.never(),
  deletedAt: v.never(),
});
export const PostSchema = createSelectSchema(postsTable);

export type NewPost = v.InferInput<typeof NewPostSchema>;
export type Post = v.InferInput<typeof PostSchema>;
