import { createFdaClient } from '@/api/fda';
import { useDatabase } from '@/db/client';
import { type NewRecall, recallsTable } from '@/db/schemas.sql';
import { desc } from 'drizzle-orm';

export const fdaHandler: ExportedHandlerScheduledHandler<Env> = async (_event, env, _ctx) => {
  const fdaClient = createFdaClient();

  const res = await fdaClient
    .list({
      page: 1,
      limit: 10,
      // category: 'Drugs',
      // status: true,
    })
    .catch((error) => {
      throw error;
    });
  if (!res.ok) {
    throw new Error(res.error);
  }

  console.debug(res.data);
  console.debug('🎊🎊🎊');

  const db = useDatabase(env.DB);
  const latest = await db.select().from(recallsTable).orderBy(desc(recallsTable.date)).limit(1).get();

  const records: NewRecall[] = [];
  for (const entry of res.data) {
    if (!entry.date || !latest?.date) {
      continue;
    }
    if (latest && entry.date > latest.date) {
      continue;
    }

    records.push({
      date: entry.date,
      linkHref: entry.link.href,
      linkText: entry.link.text,
      product: entry.product,
      category: entry.category,
      reason: entry.reason,
      company: entry.company,
    });
  }

  console.debug(`Found ${records.length} new records`);

  const result = await db.insert(recallsTable).values(records);
  if (!result.success) {
    throw new Error(result.error);
  }

  const { meta, results } = result;
  console.debug(`Inserted ${results.length} new records`);
  console.debug(`Total records: ${meta.totalRecords}`);
};
