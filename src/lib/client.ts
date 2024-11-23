import * as v from 'valibot';

type MaybeFunction<T, TArgs extends object | undefined = undefined> = TArgs extends undefined
  ? T | (() => T)
  : T | ((args: TArgs) => T);

// biome-ignore lint/suspicious/noExplicitAny: Required
type AnyObjectSchema = v.ObjectSchema<any, any>;

export class Client<TSchema extends AnyObjectSchema> {
  name: string;
  #url: string;
  #searchParams: MaybeFunction<Record<string, string>>;
  schema: TSchema;
  #headers?: HeadersInit;
  #body?: MaybeFunction<Record<string, string>>;
  #requestInit: Omit<RequestInit, 'headers' | 'body'>;
  #abortController = new AbortController();

  private defaultSchema = v.object({
    page: v.optional(v.number(), 0),
    offset: v.optional(v.number(), 0),
    limit: v.optional(v.number()),
    search: v.optional(v.string()),
    status: v.optional(v.boolean()),
  });

  constructor(
    name: string,
    config: {
      url: string;
      searchParams: MaybeFunction<Record<string, string>>;
      schema: MaybeFunction<TSchema, InstanceType<typeof Client>['defaultSchema']>;
      headers?: HeadersInit;
      requestOptions?: RequestInit;
    } & (
      | {
          method: 'GET';
        }
      | { method: 'POST'; body: MaybeFunction<Record<string, string>> }
    ),
  ) {
    this.name = name;
    this.schema = this.#resolveSchema(config.schema, this.defaultSchema);
    this.#url = config.url;
    this.#headers = config.headers;
    this.#requestInit = config.requestOptions ?? {};
    this.#requestInit.signal = this.#abortController.signal;
    // GET
    this.#searchParams = resolve(config.searchParams);
    // POST
    this.#body = config.method === 'POST' ? resolve(config.body) : undefined;
  }

  query(method: 'GET' | 'POST', params?: v.InferInput<TSchema>) {
    if (method === 'GET') {
      return this.get(params);
    }

    return this.post(params);
  }

  async get(params?: v.InferInput<TSchema>) {
    const res = v.safeParse(this.schema, params);
    if (!res.success) {
      const errs = JSON.stringify(v.flatten(res.issues), null, 2);
      console.warn(errs);
      throw new Error(errs);
    }

    const searchParams = new URLSearchParams({
      ...this.#searchParams,
      ...(res.output ?? {}),
    });

    const url = new URL(`${this.#url}?${searchParams}`);
    console.debug(`Fetching data from ${url.hostname}`);

    const start = Date.now();
    const timeElapsed = () => Date.now() - start;
    const timeoutId = setTimeout(() => {
      console.log('Timeout reached; aborting fetch');
      this.#abortController.abort();
    }, 10 * 1000);

    const resp = fetch(url, {
      method: 'GET',
      cf: { cacheEverything: false, cacheTtl: 0 },
      headers: {
        accept: 'application/json, text/javascript, */*; q=0.01',
        'accept-language': 'en-US,en;q=0.9',
        'x-requested-with': 'XMLHttpRequest',
        'x-request-start': start.toString(),
        ...this.#headers,
      },
      ...this.#requestInit,
    })
      .catch((error) => {
        throw new Error(`[${timeElapsed()}ms]: ${error}`);
      })
      .finally(() => {
        clearTimeout(timeoutId);
      });

    return resp;
  }

  post(body?: v.InferInput<TSchema>) {
    const res = v.safeParse(this.schema, body);
    if (!res.success) {
      const errs = JSON.stringify(v.flatten(res.issues), null, 2);
      console.warn(errs);
      throw new Error(errs);
    }

    const { output: payload } = res;

    return fetch(this.#url, {
      method: 'GET',
      headers: {
        accept: 'application/json, text/javascript, */*; q=0.01',
        'accept-language': 'en-US,en;q=0.9',
        'x-requested-with': 'XMLHttpRequest',
        ...this.#headers,
      },
      body: JSON.stringify({
        ...(this.#body ? JSON.parse(this.#body.toString()) : {}),
        ...(payload ? payload : {}),
      }),
      ...this.#requestInit,
    });
  }

  #resolveSchema(
    schema: MaybeFunction<TSchema, InstanceType<typeof Client>['defaultSchema']>,
    defaultSchema = this.defaultSchema,
  ) {
    if (typeof schema === 'function') {
      return schema(defaultSchema);
    }
    return schema;
  }
}

function resolve<T extends object>(o: MaybeFunction<T>) {
  return typeof o === 'function' ? o() : o;
}
