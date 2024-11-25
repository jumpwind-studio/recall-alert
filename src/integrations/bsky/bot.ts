import type { AppBskyFeedPost, AtpAgentLoginOpts } from '@atproto/api';
import { Agent, CredentialSession, RichText } from '@atproto/api';
import { isRecord } from '@atproto/api/dist/client/types/app/bsky/feed/post';

type BskyBotOptions = {
  service?: URL;
};

type PostRecord = Omit<AppBskyFeedPost.Record, 'entities' | 'createdAt'>;

function isPostRecord(value: unknown): value is PostRecord {
  return isRecord(value);
}

export default class BskyBot {
  #session: CredentialSession;
  #agent: Agent;

  constructor(auth: AtpAgentLoginOpts, opts?: BskyBotOptions) {
    const service = opts?.service ?? new URL('https://bsky.social');
    this.#session = new CredentialSession(service);
    this.#agent = new Agent(this.#session);

    this.login(auth);
  }

  login: CredentialSession['login'] = async (opts) => this.#session.login(opts);

  async post(content: PostRecord | string, opts?: { publish: false }): Promise<PostRecord>;
  async post(content: PostRecord | string, opts?: { publish: true }): Promise<{ uri: string; cid: string }>;
  async post(
    content: PostRecord | string,
    opts?: { publish?: boolean },
  ): Promise<PostRecord | { uri: string; cid: string }> {
    const record = this.#resolvePostContent(content);

    const { publish = true } = opts ?? {};
    if (!publish) {
      return record;
    }

    return this.#agent.post(record);
  }

  #resolvePostContent = (content: PostRecord | string): PostRecord => {
    if (isPostRecord(content)) {
      return content;
    }

    const rt = new RichText({ text: content });
    rt.detectFacets(this.#agent);

    return {
      text: rt.text,
      facets: rt.facets,
    };
  };
}

export function createBskyBot(auth: AtpAgentLoginOpts, opts?: BskyBotOptions) {
  return new BskyBot(auth, opts);
}
