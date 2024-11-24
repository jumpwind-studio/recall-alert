import type { AtpAgentLoginOpts } from '@atproto/api';
import * as v from 'valibot';

const envSchema = v.object({
  BSKY_HANDLE: v.pipe(v.string(), v.nonEmpty()),
  BSKY_PASSWORD: v.pipe(v.string(), v.nonEmpty()),
  BSKY_SERVICE: v.fallback(v.string(), 'https://bsky.social'),
});

const parsed = v.parse(envSchema, process.env);

export const bskyAccount: AtpAgentLoginOpts = {
  identifier: parsed.BSKY_HANDLE,
  password: parsed.BSKY_PASSWORD,
};

export const bskyService = parsed.BSKY_SERVICE;
