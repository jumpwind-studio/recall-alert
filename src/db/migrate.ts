import { migrate as drizzleMigrate } from 'drizzle-orm/d1/migrator';
import { useDatabase } from './client';

export const migrate = async () => {
  const db = useDatabase();

  try {
    await drizzleMigrate(db, {
      migrationsFolder: './migrations',
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

migrate();
