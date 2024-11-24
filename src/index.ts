import { createFdaClient } from '@/api/fda';
import { useDatabase } from '@/db/client';
import { recallsTable } from '@/db/schemas.sql';

export default {
  fetch: async () => {
    return new Response('OK', { status: 200 });
  },
  scheduled: async (_event, env, _ctx) => {
    const db = useDatabase(env.DB);

    const fdaClient = createFdaClient();
    const result = await fdaClient.list();
    result.match({
      ok: ({ data }) => db.insert(recallsTable).values(data),
      err: () => null,
    });
  },
} satisfies ExportedHandler<Env>;
