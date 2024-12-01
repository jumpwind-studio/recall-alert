import { desc, eq } from 'drizzle-orm';
import { useDatabase } from './db/client';
import { postsTable, recallsTable } from './db/schemas.sql';

export { FdaWorkflow } from '@/workflows';

export default {
  fetch: async (req, env) => {
    const url = new URL(req.url);

    if (url.pathname.startsWith('/favicon')) {
      return Response.json({}, { status: 404 });
    }

    const id = url.searchParams.get('instanceId') || url.searchParams.get('id');
    if (id) {
      const instance = await env.WORKFLOW_FDA.get(id);

      return Response.json({
        id,
        status: await instance.status(),
      });
    }

    const lastPosts = await useDatabase(env.DB)
      .select({
        id: postsTable.id,
        uri: postsTable.uri,
        content: postsTable.content,
        recall: {
          id: recallsTable.id,
          brand: recallsTable.brand,
          category: recallsTable.category,
          company: recallsTable.company,
          date: recallsTable.date,
          product: recallsTable.product,
          reason: recallsTable.reason,
          url: recallsTable.url,
        },
      })
      .from(recallsTable)
      .leftJoin(postsTable, eq(recallsTable.id, postsTable.recallId))
      .orderBy(desc(postsTable.createdAt))
      .limit(10);

    return Response.json(lastPosts);
  },
  scheduled: async (_event, env, ctx) => {
    ctx.waitUntil(env.WORKFLOW_FDA.create());
  },
} satisfies ExportedHandler<Env>;
