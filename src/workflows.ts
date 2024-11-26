import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers';
import { createFdaClient } from '@/api/fda';
import { useDatabase } from '@/db/client';
import { type NewPost, NewPostSchema, postsTable, recallsTable } from '@/db/schemas.sql';
import { createBskyBot } from '@/integrations/bsky/bot';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import * as v from 'valibot';

export class FdaWorkflow extends WorkflowEntrypoint<Env> {
  async run(_: WorkflowEvent<Params>, step: WorkflowStep) {
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

    const sourceId = await step.do('fetch source id', async () => {
      const db = useDatabase(this.env.DB);

      return db.query.sources
        .findFirst({
          where: (sources, { eq }) => eq(sources.key, 'US-FDA'),
          columns: { id: true },
        })
        .then((source) => source?.id);
    });
    if (!sourceId) {
      throw new Error('Source not found');
    }

    const newRecalls = await step.do('persist new recalls', async () => {
      const db = useDatabase(this.env.DB);

      return db
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
    });

    const unpostedNewRecalls = await step.do('get unposted new recalls', async () => {
      const db = useDatabase(this.env.DB);

      return db
        .select({ recalls: recallsTable })
        .from(recallsTable)
        .leftJoin(postsTable, eq(recallsTable.id, postsTable.recallId))
        .where(
          and(
            isNull(postsTable.recallId),
            inArray(
              recallsTable.id,
              newRecalls.map((r) => r.id),
            ),
          ),
        )
        .then((results) => results.map((r) => r.recalls));
    });

    const postedPosts = await step.do('broadcast unposted new recalls', async (): Promise<NewPost[]> => {
      if (!unpostedNewRecalls || unpostedNewRecalls.length === 0) {
        return [] as NewPost[];
      }

      const bot = createBskyBot({
        identifier: this.env.BSKY_USERNAME,
        password: this.env.BSKY_PASSWORD,
      });

      const posts: NewPost[] = [];
      for (const recall of unpostedNewRecalls) {
        const post = await step.do(`post recall: ${recall.linkHref}`, async () => {
          const postData = {
            text: `🚨 RECALL ALERT (${recall.category}) 🚨
PRODUCT: ${recall.product}
COMPANY: ${recall.company}
REASON: ${recall.reason}

Stay safe and informed! 🛡
For more details, see below! 👇`,
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

          const postInfo = await bot.post(postData, { publish: process.env.NODE_ENV === 'production' });

          return v.parse(NewPostSchema, {
            recallId: recall.id,
            title: `FDA Recall: ${recall.product} @ ${recall.company}`,
            content: postData.text,
            uri: (postInfo.uri as string) ?? '',
            cid: (postInfo.cid as string) ?? '',
            raw: JSON.stringify({ postData }),
            embeds: JSON.stringify(postData.embed),
          });
        });

        posts.push(post);
      }
      return posts;
    });

    await step.do('persist posts', async () => {
      const db = useDatabase(this.env.DB);

      await db.insert(postsTable).values(postedPosts).returning();
    });
  }
}
