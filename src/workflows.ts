import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers';
import { createFdaClient } from '@/api/fda';
import { useDatabase } from '@/db/client';
import { NewPostSchema, type Recall, postsTable, recallsTable, sourcesTable } from '@/db/schemas.sql';
import { createBskyBot } from '@/integrations/bsky/bot';
import { eq } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import * as v from 'valibot';

const NOOP = undefined;

function formatPost(recall: Recall): string {
  return `🚨 RECALL ALERT (${recall.category}) 🚨

PRODUCT: ${recall.product}
COMPANY: ${recall.company}
REASON: ${recall.reason}

Stay safe and informed! 🛡
For more details, see below! 👇`;
}

function buildPosts(recall: Recall, formatCallback: (recall: Recall) => string = formatPost) {
  const postData = {
    text: formatCallback(recall),
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

  return v.parse(NewPostSchema, {
    recallId: recall.id,
    title: 'FDA Recall',
    content: postData.text,
    raw: JSON.stringify({ postData }),
    embeds: JSON.stringify(postData.embed),
    uri: '',
    cid: '',
  });
}

export class FdaWorkflow extends WorkflowEntrypoint<Env> {
  async run(_: WorkflowEvent<Params>, step: WorkflowStep) {
    const { data: recallData } = await step.do('fetch live recall data', async () => {
      return createFdaClient()
        .list()
        .then((res) => res.unwrap('Failed to fetch recall data'));
    });

    const sourceId = await step.do('fetch source id', async () => {
      const [row] = await useDatabase(this.env.DB)
        .select({ sourceId: sourcesTable.id })
        .from(sourcesTable)
        .where(eq(sourcesTable.key, 'US-FDA'))
        .limit(1);
      return row.sourceId;
    });

    const recalls = await step.do('persist recall data', async () => {
      return useDatabase(this.env.DB)
        .insert(recallsTable)
        .values(recallData.map((recall) => ({ ...recall, sourceId })))
        .onConflictDoNothing({ target: recallsTable.linkHref })
        .returning();
    });

    if (!recalls || recalls.length === 0) {
      console.log('No new recalls found');
      return NOOP;
    }

    const postData = await step.do('create posts', async () => {
      return recalls.map((recall) => buildPosts(recall));
    });

    const posts = await step.do('create posts', async () => {
      return useDatabase(this.env.DB)
        .insert(postsTable)
        .values(postData)
        .onConflictDoNothing({ target: [postsTable.uri] })
        .returning({
          id: postsTable.id,
          recallId: postsTable.recallId,
          content: postsTable.content,
        });
    });

    const publishedPosts = await step.do('post recalls', async () => {
      const bot = createBskyBot({
        identifier: this.env.BSKY_USERNAME,
        password: this.env.BSKY_PASSWORD,
      });

      return Promise.all(
        posts.map((post) => {
          return step.do(`post ${post.id}`, async () => {
            const bskyData = await bot.post(post.content, {
              publish: process.env.NODE_ENV === 'production',
            });

            return {
              ...bskyData,
              id: post.id,
            };
          });
        }),
      );
    });

    await step.do('update posts', async () => {
      const db = useDatabase(this.env.DB);

      await db.batch(
        await Promise.all(
          publishedPosts.map(({ id, ...publishedPost }) =>
            db.update(postsTable).set(publishedPost).where(eq(postsTable.id, id)),
          ) as unknown as [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]],
        ),
      );
    });
  }
}
