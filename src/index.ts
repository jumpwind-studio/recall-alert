import { useDatabase } from './db/client';
import { fdaHandler } from './handlers';

export default {
  async fetch() {
    return new Response('OK', { status: 200 });
  },
  async scheduled(event, env, ctx) {
    const db = useDatabase(env.DB);
    fdaHandler(db);
  },
} satisfies ExportedHandler<Env>;
