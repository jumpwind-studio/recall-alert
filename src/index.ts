/**
 * Welcome to Cloudflare Workers!
 *
 * This is a template for a Scheduled Worker: a Worker that can run on a
 * configurable interval:
 * https://developers.cloudflare.com/workers/platform/triggers/cron-triggers/
 *
 * - Run `pnpm run dev` in your terminal to start a development server
 * - Run `curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"` to see your worker in action
 * - Run `pnpm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `pnpm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { fdaHandler } from './handlers';

export default {
  async fetch() {
    return new Response('OK', { status: 200 });
  },
  async scheduled(event, env, ctx): Promise<void> {
    return fdaHandler(event, env, ctx);
  },
} satisfies ExportedHandler<Env>;
