import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers';
import { hc } from 'hono/client';
import type { API } from './server';

export class FdaWorkflow extends WorkflowEntrypoint<Env> {
  async run(_: WorkflowEvent<Params>, step: WorkflowStep) {
    const { recalls } = await step.do('fetch live recall data', async () => {
      const api = createClient();

      const res = await api.recalls.$post({
        json: {
          source: 'US-FDA',
        },
      });
      if (!res.ok) {
        return JSON.stringify({
          status: `Failed to fetch recalls: ${res.statusText}`,
          body: await res.text(),
        });
      }

      return res.json();
    });

    await step.do('create posts', async () => {
      if (recalls.length === 0) {
        return 'No recalls found';
      }

      const api = createClient();

      const res = await api.posts.$post({
        json: {
          ids: recalls.map(({ id }) => id),
        },
      });
      if (!res.ok) {
        return JSON.stringify({
          status: `Failed to create posts: ${res.statusText}`,
          body: await res.text(),
        });
      }

      return res.json();
    });
  }
}
