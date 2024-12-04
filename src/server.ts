import { vValidator } from '@hono/valibot-validator';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import * as v from 'valibot';
import { createFdaClient } from './api/fda';
import { useDatabase } from './db/client';
import { type NewPost, postsTable, recallsTable, sourcesTable } from './db/schemas.sql';
import { type PostRecord, createBskyBot } from './integrations/bsky/bot';

// Successful Response Interface
interface SuccessResponse<T> {
  status: 'success';
  data: T;
  message?: string;
}

const recallRouter = new Hono<{ Bindings: Env }>()
  .get(
    '/',
    vValidator(
      'query',
      v.object({
        page: v.optional(v.number(), 0),
        offset: v.optional(v.number(), 0),
        limit: v.optional(v.number(), 10),
        search: v.optional(v.string()),
        published: v.optional(v.boolean(), true),
        sort: v.optional(v.union([v.literal('asc'), v.literal('desc')]), 'desc'),
      }),
    ),
    async (c) => {
      const db = useDatabase(c.env.DB);

      const { page, offset, limit, search, published, sort } = c.req.valid('query');

      const data = await db.query.recalls.findMany({
        limit,
        offset: page * limit + offset,
        orderBy: (t, { asc, desc }) => (sort === 'asc' ? asc(t.createdAt) : desc(t.createdAt)),
        where: (t, { like }) => like(t.product, `%${search}%`),
        ...(published && {
          with: {
            posts: {
              where: (t, { isNotNull }) => isNotNull(t.recallId),
            },
          },
        }),
      });
      if (data.length === 0) {
        return c.json({ error: 'No recalls found' }, 404);
      }

      return c.json({ data }, 200);
    },
  )
  .delete(async (c) => {
    const db = useDatabase(c.env.DB);

    const res = await db.delete(recallsTable);
    if (!res.success) {
      return c.json({ error: 'No recalls found' }, 404);
    }

    return c.json(
      {
        status: 'success',
        message: `Deleted ${res.meta.changes} recalls`,
      },
      200,
    );
  })
  .get(
    '/:id',
    vValidator(
      'param',
      v.pipe(
        v.string(),
        v.transform((input) => Number.parseInt(input)),
      ),
    ),
    async (c) => {
      const db = useDatabase(c.env.DB);

      const id = c.req.valid('param');

      const data = await db.query.recalls.findFirst({
        where: (t, { eq }) => eq(t.id, id),
      });
      if (!data) {
        return c.json({ error: 'Recall not found' }, 404);
      }

      return c.json({ data }, 200);
    },
  )
  .post(
    '/',
    vValidator(
      'json',
      v.object({
        source: v.string(),
      }),
    ),
    async (c) => {
      const db = useDatabase(c.env.DB);

      const json = c.req.valid('json');

      const source = await db.query.sources.findFirst({
        columns: { id: true },
        where: (t, { eq }) => eq(t.key, json.source),
      });
      if (!source) {
        return c.json({ error: 'Invalid source' }, 400);
      }

      const { data: recallData } = await createFdaClient()
        .list()
        .then((res) => res.unwrap('Failed to fetch recall data'));

      console.debug(`Found ${recallData.length} recalls`);

      const data = await db
        .insert(recallsTable)
        .values(recallData.map((recall) => ({ ...recall, sourceId: source.id })))
        .onConflictDoNothing({ target: recallsTable.url })
        .returning();
      if (data.length === 0) {
        return c.json({ data: 'No new recalls found' }, 200);
      }

      return c.json({ data }, 201);
    },
  );

const postRouter = new Hono<{ Bindings: Env }>()
  .get('/', async (c) => {
    const db = useDatabase(c.env.DB);

    const data = await db.query.posts.findMany();
    if (data.length === 0) {
      return c.json({ error: 'No posts found' }, 404);
    }

    return c.json({ data }, 200);
  })
  .post(
    '/',
    vValidator(
      'json',
      v.object({
        ids: v.optional(v.array(v.number())),
      }),
    ),
    async (c) => {
      const db = useDatabase(c.env.DB);

      const { ids } = c.req.valid('json');

      const recalls = ids
        ? await db.query.recalls.findMany({
            where: (t, { inArray }) => inArray(t.id, ids),
          })
        : await db.query.recalls.findMany({
            with: {
              posts: {
                where: (t, { isNull }) => isNull(t.recallId),
              },
            },
          });
      if (recalls.length === 0) {
        return c.json({ error: 'No recalls found' }, 400);
      }

      const bot = createBskyBot({
        identifier: c.env.BSKY_USERNAME,
        password: c.env.BSKY_PASSWORD,
      });

      const posts: NewPost[] = [];
      for (const recall of recalls) {
        const postData = {
          text: `🚨 RECALL ALERT (${recall.category}) 🚨

Product: ${recall.product}
Company: ${recall.company}
Reason: ${recall.reason}

Stay safe and informed! 🛡
For more details, see below! 👇`,
          langs: ['en-US'],
          embed: {
            $type: 'app.bsky.embed.external',
            external: {
              uri: recall.url,
              title: `${recall.brand} announce(s) recall!`,
              description: recall.reason,
            },
          },
          createdAt: new Date().toISOString(),
        } satisfies PostRecord;

        try {
          const postResponse = await bot.post(postData);
          if (!postResponse) {
            return c.json({ error: 'Failed to post recall' }, 400);
          }

          posts.push({
            recallId: recall.id,
            title: `${recall.brand} announce(s) recall!`,
            content: postData.text,
            raw: postData,
            embeds: postData.embed,
            uri: postResponse.uri,
            cid: postResponse.cid,
          });
        } catch (err) {
          console.error('Failed to post recall:', err);
          return c.json({ error: 'Failed to post recall' }, 400);
        }
      }

      console.debug(`Created ${posts.length} posts`);
      console.debug(JSON.stringify(posts, null, 2));

      const data = await db
        .insert(postsTable)
        .values(posts)
        .onConflictDoNothing({ target: [postsTable.uri] })
        .returning({
          id: postsTable.id,
          recallId: postsTable.recallId,
          content: postsTable.content,
          uri: postsTable.uri,
        });
      if (data.length === 0) {
        return c.json({ data: 'No new posts created' }, 200);
      }

      return c.json({ data }, 201);
    },
  );

const sourcesRouter = new Hono<{ Bindings: Env }>().get(
  '/:id?',
  vValidator('param', v.optional(v.number())),
  vValidator(
    'query',
    v.object({
      page: v.optional(v.number(), 0),
      offset: v.optional(v.number(), 0),
      limit: v.optional(v.number(), 10),
      search: v.optional(v.string()),
      sort: v.optional(v.union([v.literal('asc'), v.literal('desc')]), 'desc'),
    }),
  ),
  async (c) => {
    const db = useDatabase(c.env.DB);

    const id = c.req.valid('param');
    const { page, offset, limit, search, sort } = c.req.valid('query');

    const data = await db.query.sources.findMany({
      ...(id && {
        where: (t, { eq }) => eq(t.id, id),
      }),
      limit,
      offset: page * limit + offset,
      orderBy: (t, { asc, desc }) => (sort === 'asc' ? asc(t.createdAt) : desc(t.createdAt)),
      ...(search && {
        where: (t, { like }) => like(t.name, `%${search}%`),
      }),
    });
    if (data.length === 0) {
      return c.json({ error: 'No sources found' }, 404);
    }

    return c.json({ data }, 200);
  },
);

const api = new Hono<{ Bindings: Env }>()
  .basePath('/api')
  // Index
  .get('/', async (c) => c.json({ status: 'success' }, 200))
  // Health Check
  .get('/health', async (c) => c.json({ status: 'success' }, 200))
  // Recall API
  .route('/recalls', recallRouter)
  // Post API
  .route('/posts', postRouter)
  // Sources API
  .route('/sources', sourcesRouter);

export type API = typeof api;
export default api;
