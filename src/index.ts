import { hc } from 'hono/client';
import api, { type API } from './server';

export { FdaWorkflow } from '@/workflows';

function createClient() {
  return hc<API>('http://localhost:8787').api;
}

export type Client = ReturnType<typeof createClient>;

export default {
  fetch: api.fetch,
  scheduled: async () => {
    const api = createClient();

    const recallsResponse = await api.recalls.$post({
      json: { source: 'US-FDA' },
    });
    if (!recallsResponse.ok) {
      console.log(`Failed to fetch recalls: ${await recallsResponse.text()}`);
      return undefined;
    }
    if (recallsResponse.status === 200) {
      console.log('No new recalls found');
      return undefined;
    }

    const { data: recalls } = await recallsResponse.json();
    const recallIds = recalls.map(({ id }) => id);
    console.log(`Fetched ${recallIds.length} recalls: ${recallIds.join(', ')}`);

    const postsResponse = await api.posts.$post({
      json: { ids: recallIds },
    });
    if (!postsResponse.ok) {
      console.log(`Failed to create posts: ${await postsResponse.text()}`);
      return undefined;
    }
    if (postsResponse.status === 200) {
      console.log('No new posts created');
      return undefined;
    }

    const { data: posts } = await postsResponse.json();

    console.log(JSON.stringify({ recalls, posts }, null, 2));
  },
} satisfies ExportedHandler<Env>;
