import type { AtpAgentLoginOpts } from '@atproto/api';
import { Agent, CredentialSession, RichText } from '@atproto/api';

type BotOptions = {
  auth: AtpAgentLoginOpts;
  service: URL;
  isDryRun: boolean;
};

export default class Bot {
  #session: CredentialSession;
  #agent: Agent;

  constructor(opts: BotOptions) {
    this.#session = new CredentialSession(opts.service);
    this.#agent = new Agent(this.#session);

    if (opts.isDryRun) {
      console.log('Dry run mode enabled');
    }
  }

  login: CredentialSession['login'] = async (opts) => this.#session.login(opts);

  post: Agent['post'] = async (text) => {
    if (typeof text !== 'string') {
      return this.#agent.post(text);
    }

    const rt = new RichText({ text });
    await rt.detectFacets(this.#agent);
    return this.#agent.post({
      text: rt.text,
      facets: rt.facets,
    });
  };

  static async run(opts: BotOptions, callback: () => Promise<string>) {
    const bot = new Bot(opts);
    await bot.login(opts.auth);

    await callback().then(async (text) => {
      if (opts.isDryRun) {
        return text;
      }
      return bot.post({ text });
    });
  }
}
