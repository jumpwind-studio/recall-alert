// Export workflows
export { FdaWorkflow } from '@/workflows';

// Export worker handlers
export default {
  fetch: async (event, env) => {
    return new Response('OK', { status: 200 });
  },
  scheduled: async (_event, env, ctx) => {
    ctx.waitUntil(env.WORKFLOW_FDA.create());
  },
} satisfies ExportedHandler<Env>;
