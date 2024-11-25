import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { type Config, defineConfig } from 'drizzle-kit';

/**
 * Retrieves path to local D1 SQLite database file used by Wrangler.
 * Example path: `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/<sqlite_filename>.sqlite`
 *
 * @returns Absolute path to local D1 sqlite database file.
 * @throws If no sqlite file is found in .wrangler directory.
 */
function getLocalD1() {
  const wranglerPath = resolve('.wrangler');

  const sqliteFile = readdirSync(wranglerPath, {
    encoding: 'utf-8',
    recursive: true,
  }).find((f: string) => f.endsWith('.sqlite'));
  if (!sqliteFile) {
    throw new Error(`.sqlite file not found in ${wranglerPath}`);
  }

  return resolve(wranglerPath, sqliteFile);
}

type SqliteConfig<T extends Config = Config> = T extends { dialect: 'sqlite' } ? Omit<T, 'dialect'> : never;

function getCreds(): SqliteConfig {
  const prodCreds = {
    driver: 'd1-http',
    dbCredentials: {
      // biome-ignore lint/style/noNonNullAssertion: never null
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
      databaseId: 'ec939b77-b797-4182-b176-af169ad8ed62',
      // biome-ignore lint/style/noNonNullAssertion: never null
      token: process.env.CLOUDFLARE_API_TOKEN!,
    },
  } satisfies SqliteConfig;
  const devCreds = {
    dbCredentials: {
      url: getLocalD1(),
    },
  } satisfies SqliteConfig;

  return process.env.NODE_ENV === 'production' ? prodCreds : devCreds;
}

export default defineConfig({
  dialect: 'sqlite',
  schema: 'src/db/schemas.sql.ts',
  out: 'drizzle/migrations',
  ...getCreds(),
});
