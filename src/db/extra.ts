import { sql } from 'drizzle-orm';
import { integer } from 'drizzle-orm/sqlite-core';

export const createdAt = {
  get createdAt() {
    return integer({ mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`).notNull().$type<Date>();
  },
} as const;

export const updatedAt = {
  get updatedAt() {
    return integer({ mode: 'timestamp' })
      .default(sql`(strftime('%s', 'now'))`)
      .$onUpdateFn(() => new Date())
      .notNull()
      .$type<Date>();
  },
} as const;

export const deletedAt = {
  get deletedAt() {
    return integer('deleted_at', {
      mode: 'timestamp',
    }).$type<Date>();
  },
} as const;
