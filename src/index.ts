// Export workflows
export { FdaWorkflow } from '@/workflows';

// Export worker handlers
export default {
  fetch: async (req, env) => {
    const url = new URL(req.url);

    if (url.pathname.startsWith('/favicon')) {
      return Response.json({}, { status: 404 });
    }

    // Get the status of an existing instance, if provided
    const id = url.searchParams.get('instanceId') || url.searchParams.get('id');
    if (id) {
      const instance = await env.WORKFLOW_FDA.get(id);

      return Response.json({
        status: await instance.status(),
      });
    }

    // Spawn a new instance and return the ID and status
    const instance = await env.WORKFLOW_FDA.create();

    return Response.json({
      id: instance.id,
      details: await instance.status(),
    });
  },
  scheduled: async (_event, env, ctx) => {
    ctx.waitUntil(env.WORKFLOW_FDA.create());
  },
} satisfies ExportedHandler<Env>;
