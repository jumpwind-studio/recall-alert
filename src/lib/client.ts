import * as v from 'valibot';

type MaybeFunction<T, TArgs extends object | undefined = undefined> = TArgs extends undefined
  ? T | (() => T)
  : T | ((args: TArgs) => T);

// biome-ignore lint/suspicious/noExplicitAny: Required
type AnyObjectSchema = v.ObjectSchema<any, any>;

export class Client<TSchema extends AnyObjectSchema> {
  name: string;
  schema: TSchema;

  #url: string;
  #searchParams: MaybeFunction<Record<string, string>>;
  #headers?: HeadersInit;
  #requestInit: Omit<RequestInit, 'headers' | 'body'>;
  #abortController = new AbortController();

  private defaultSchema = v.object({
    page: v.optional(v.number(), 0),
    offset: v.optional(v.number(), 0),
    limit: v.optional(v.number(), 10),
    search: v.optional(v.string(), ''),
    status: v.optional(v.boolean()),
  });

  constructor(
    name: string,
    config: {
      method?: 'GET';
      url: string;
      searchParams: MaybeFunction<Record<string, string>>;
      schema: MaybeFunction<TSchema, InstanceType<typeof Client>['defaultSchema']>;
      headers?: HeadersInit;
      requestOptions?: RequestInit;
    },
  ) {
    this.name = name;
    this.schema = this.#resolveSchema(config.schema, this.defaultSchema);
    this.#url = config.url;
    this.#headers = config.headers;
    this.#requestInit = config.requestOptions ?? {};
    this.#requestInit.signal = this.#abortController.signal;
    this.#searchParams = resolve(config.searchParams);
  }

  get url() {
    return this.#url;
  }

  async get(params?: v.InferInput<TSchema>) {
    const res = v.parse(this.schema, params ?? {});
    // if (!res.success) {
    //   const errs = JSON.stringify(v.flatten(res.issues), null, 2);
    //   return new Response(errs, { status: 400 });
    // }

    const searchParams = new URLSearchParams({
      ...this.#searchParams,
      ...(res ?? {}),
    });

    return fetch(`${this.#url}?${searchParams}`, {
      method: 'GET',
      cf: {
        cacheEverything: true,
        cacheTtl: 60,
      },
      headers: {
        accept: 'application/json, text/javascript, */*; q=0.01',
        'accept-language': 'en-US,en;q=0.9',
        'x-requested-with': 'XMLHttpRequest',
        ...this.#headers,
      },
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
