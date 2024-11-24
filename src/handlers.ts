import { createFdaClient } from '@/api/fda';
import type { Database } from '@/db/client';
import { recallsTable } from '@/db/schemas.sql';

export async function fdaHandler(db: Database) {
  const fdaClient = createFdaClient();

  const res = await fdaClient.list();
  if (!res.ok) {
    throw new Error(res.error);
  }

  // const latest = await db.select().from(recallsTable).orderBy(desc(recallsTable.date)).limit(1).get();

  await db
    .insert(recallsTable)
    .values(
      res.data.map((entry) => {
        const { link, ...rest } = entry;
        return {
          linkHref: link.href,
          linkText: link.text,
          ...rest,
        };
      }),
    )
    .then((res) => {
      console.log(`Inserted ${res.results.length} rows`);
    });
}
