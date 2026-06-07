import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { db } from './config/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const migrationsDir = join(__dirname, '../migrations');
  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), 'utf8');
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);

    for (const statement of statements) {
      try {
        await db.execute(statement);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.toLowerCase().includes('duplicate column')) {
          console.log(`Skipping already-applied change in ${file}`);
          continue;
        }
        throw err;
      }
    }

    console.log(`Applied ${file}`);
  }

  console.log('Migration completed successfully');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
