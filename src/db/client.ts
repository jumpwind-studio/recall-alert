import { recallsTable } from '@/db/schemas.sql';
import type { DrizzleConfig } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';

export function useDatabase(db: D1Database, config?: DrizzleConfig) {
  return drizzle(db, {
    schema: {
      recalls: recallsTable,
    },
    ...config,
  });
}

export type Database = ReturnType<typeof useDatabase>;
