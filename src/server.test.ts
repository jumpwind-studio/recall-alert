import {
  createExecutionContext,
  createScheduledController,
  env,
  waitOnExecutionContext,
} from 'cloudflare:test';
import { testClient } from 'hono/testing';
import { describe, expect, it } from 'vitest';
import worker from './index';
import app from './server';

declare module 'cloudflare:test' {
  interface ProvidedEnv extends Env {}
}

describe('General', () => {
  const client = testClient(app);
  it('Should return 200 response', async () => {
    const res = await client.api.posts.$get();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      hello: 'world',
      var: 'my variable',
    });
  });
});

describe('Cron', () => {
  it('should return 200 response', async () => {
    const controller = createScheduledController({
      scheduledTime: new Date(1000),
      cron: '30 * * * *',
    });
    const ctx = createExecutionContext();
    await worker.scheduled(controller, env, ctx);
    await waitOnExecutionContext(ctx);
  });
});
