import { AppBskyFeedPost, type AtpAgentLoginOpts } from '@atproto/api';
import { Agent, CredentialSession, RichText } from '@atproto/api';

type BskyBotOptions = {
  service?: URL;
};

export type PostRecord = Omit<AppBskyFeedPost.Record, 'entities' | 'createdAt'>;

function isPostRecord(value: unknown): value is PostRecord {
  return AppBskyFeedPost.isRecord(value);
}

export default class BskyBot {
  #session: CredentialSession;
  #agent: Agent;

  constructor(auth: AtpAgentLoginOpts, opts?: BskyBotOptions) {
    const service = opts?.service ?? new URL('https://bsky.social');
    this.#session = new CredentialSession(service);
    this.#agent = new Agent(this.#session);

    console.debug('Logging in with', JSON.stringify(auth));

    try {
      this.login(auth);
    } catch (err) {
      console.error('Failed to login:', err);
      throw err;
    }
    console.debug('Logged in');
  }

  login: CredentialSession['login'] = async (opts) => this.#session.login(opts);

  async post(
    content: PostRecord | string,
    options?: { publish?: boolean },
  ): Promise<{ uri: string; cid: string }> {
    const record = this.#resolvePostContent(content);

    if (!options?.publish) {
      return { uri: '', cid: '' };
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
