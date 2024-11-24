import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: 'src/db/schemas.sql.ts',
  out: 'drizzle/migrations',
});
