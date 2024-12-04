import {
  postsRelations,
  postsTable,
  recallsRelations,
  recallsTable,
  sourcesRelations,
  sourcesTable,
} from '@/db/schemas.sql';
import type { DrizzleConfig } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';

const schema = {
  recalls: recallsTable,
  recallsRelations,
  sources: sourcesTable,
  sourcesRelations,
  posts: postsTable,
  postsRelations,
} as const;

export function useDatabase(db: D1Database, config?: DrizzleConfig) {
  return drizzle(db, {
    ...config,
    schema,
  });
}

export type Database = ReturnType<typeof useDatabase>;
