import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { db } from './config/db.js';
import { normalizeDeviceId } from './utils/deviceId.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function normalizeLegacyDeviceIds() {
  const result = await db.execute({
    sql: "SELECT id, device_id FROM devices WHERE device_id LIKE 'IRIS-%'",
    args: [],
  });

  for (const row of result.rows) {
    const id = String(row.id);
    const legacyId = String(row.device_id);
    const mac = normalizeDeviceId(legacyId);
    if (mac === legacyId) continue;

    await db.execute({
      sql: 'UPDATE devices SET device_id = ? WHERE id = ?',
      args: [mac, id],
    });
    console.log(`Converted ${legacyId} → ${mac}`);
  }
}

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

  await normalizeLegacyDeviceIds();

  console.log('Migration completed successfully');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
