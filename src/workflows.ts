import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers';
import { createFdaClient } from '@/api/fda';
import { useDatabase } from '@/db/client';
import { recallsTable } from '@/db/schemas.sql';
import { createBskyBot } from '@/integrations/bsky/bot';

export class FdaWorkflow extends WorkflowEntrypoint<Env> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    const fdaResult = await step.do(
      'fetch recall data',
      {
        retries: {
          limit: 5,
          delay: 1000 * 60, // 1 minute
          backoff: 'exponential',
        },
        timeout: '30 seconds',
      },
      async () => {
        const fdaClient = createFdaClient();

        const res = await fdaClient.list();
        return res.unwrap('Failed to fetch recall data');
      },
    );

    const newRecallData = await step.do('persist recall data', async () => {
      const db = useDatabase(this.env.DB);

      return db
        .insert(recallsTable)
        .values(fdaResult.data)
        .onConflictDoNothing({
          target: recallsTable.linkHref,
        })
        .returning();
    });

    await step.do('broadcast recall data', async () => {
      const bot = createBskyBot({
        identifier: this.env.BSKY_USERNAME,
        password: this.env.BSKY_PASSWORD,
      });

      for (const recall of newRecallData) {
        await step.do(`post recall: ${recall.linkHref}`, async () => {
          const postInfo = await bot.post(
            {
              text: `Recall: ${recall.product} @ ${recall.company}`,
              langs: ['en-US'],
              embed: {
                $type: 'app.bsky.embed.external',
                external: {
                  uri: recall.linkHref,
                  title: recall.linkText,
                  description: `Category: ${recall.category}\nReason: ${recall.reason}`,
                },
              },
            },
            { publish: false },
          );

          console.log('Posted recall:', postInfo);
        });
      }
    });
  }
}
