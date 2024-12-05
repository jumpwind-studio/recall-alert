import { hc } from 'hono/client';
import api, { type API } from './server';

export default {
  fetch: api.fetch,
  async scheduled(_batch, env, ctx) {
    async function run(): Promise<void> {
      const { api } = hc<API>('https://unusedurltobypassproxy', {
        fetch: env.API.fetch.bind(env.API),
      });

      const recallsResponse = await api.recalls.$post({ json: { source: 'US-FDA' } });
      if (!recallsResponse.ok) {
        console.debug(`Failed to fetch recalls:\n${await recallsResponse.text()}`);
        return undefined;
      }
      if (recallsResponse.status === 200) {
        console.debug('No new recalls found');
        return undefined;
      }

      const { data: recalls } = await recallsResponse.json();
      const recallIds = recalls.map(({ id }) => id);
      console.debug(`Fetched ${recallIds.length} recalls`);

      const postsResponse = await api.posts.$post({ json: { ids: recallIds } });
      if (!postsResponse.ok) {
        console.debug(`Failed to create posts:\n${await postsResponse.text()}`);
        return undefined;
      }
      if (postsResponse.status === 200) {
        console.debug('No new posts created');
        return undefined;
      }

      const { data: posts } = await postsResponse.json();

      console.debug(JSON.stringify({ recalls, posts }, null, 2));
    }

    ctx.waitUntil(run());
  },
} satisfies ExportedHandler<Env>;
