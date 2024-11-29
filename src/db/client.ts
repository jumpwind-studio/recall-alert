import { postsTable, recallsTable, sourcesTable } from '@/db/schemas.sql';
import { ConsoleLogWriter, DefaultLogger, type DrizzleConfig } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';

export function useDatabase(db: D1Database, config?: DrizzleConfig) {
  return drizzle(db, {
    ...config,
    ...(process.env.NODE_ENV !== 'production'
      ? { logger: new DefaultLogger({ writer: new ConsoleLogWriter() }) }
      : undefined),
    schema: {
      recalls: recallsTable,
      sources: sourcesTable,
      posts: postsTable,
    },
  });
}

export type Database = ReturnType<typeof useDatabase>;
