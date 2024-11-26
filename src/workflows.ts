import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers';
import { createFdaClient } from '@/api/fda';
import { useDatabase } from '@/db/client';
import { type NewPost, postsTable, recallsTable } from '@/db/schemas.sql';
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

    const recallData = await step.do('persist recall data', async () => {
      const db = useDatabase(this.env.DB);

      const sourceId = await db.query.sources
        .findFirst({
          where: (sources, { eq }) => eq(sources.key, 'US-FDA'),
          columns: { id: true },
        })
        .then((source) => source?.id);
      if (!sourceId) {
        throw new Error('Source not found');
      }

      const newRecalls = await db
        .insert(recallsTable)
        .values(
          fdaResult.data.map((recall) => ({
            ...recall,
            sourceId,
          })),
        )
        .onConflictDoNothing({
          target: recallsTable.linkHref,
        })
        .returning();

      return newRecalls;
    });

    await step.do('broadcast recall data', async () => {
      const bot = createBskyBot({
        identifier: this.env.BSKY_USERNAME,
        password: this.env.BSKY_PASSWORD,
      });

      const posts: NewPost[] = [];
      for (const recall of recallData) {
        await step.do(`post recall: ${recall.linkHref}`, async () => {
          const postData = {
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
          };
          const postInfo = await bot.post(postData, { publish: true });

          posts.push({
            recallId: recall.id,
            title: recall.product,
            content: recall.reason,
            uri: postInfo.uri,
            cid: postInfo.cid,
            raw: JSON.stringify({ postInfo }),
            metadata: JSON.stringify({}),
            embeds: JSON.stringify(postData.embed),
          });
        });
      }

      await step.do('persist posts', async () => {
        const db = useDatabase(this.env.DB);

        await db.insert(postsTable).values(posts).returning();
      });
    });
  }
}
