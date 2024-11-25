import { migrate as drizzleMigrate } from 'drizzle-orm/d1/migrator';
import { useDatabase } from './client';

export const migrate = async (env: Env) => {
  const db = useDatabase(env.DB);

  try {
    await drizzleMigrate(db, { migrationsFolder: 'drizzle/migrations' });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
