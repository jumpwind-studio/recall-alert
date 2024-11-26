import { postsTable, recallsTable, sourcesTable } from '@/db/schemas.sql';
import type { DrizzleConfig } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';

export function useDatabase(db: D1Database, config?: DrizzleConfig) {
  return drizzle(db, {
    ...config,
    schema: {
      recalls: recallsTable,
      sources: sourcesTable,
      posts: postsTable,
    },
  });
}

export type Database = ReturnType<typeof useDatabase>;
