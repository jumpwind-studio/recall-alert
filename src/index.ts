import { desc } from 'drizzle-orm';
import { useDatabase } from './db/client';
import { postsTable } from './db/schemas.sql';

// Export workflows
export { FdaWorkflow } from '@/workflows';

// Export worker handlers
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
      })
      .from(postsTable)
      .orderBy(desc(postsTable.createdAt))
      .limit(5);

    return Response.json(JSON.stringify(lastPosts));
  },
  scheduled: async (_event, env, ctx) => {
    ctx.waitUntil(env.WORKFLOW_FDA.create());
  },
} satisfies ExportedHandler<Env>;
