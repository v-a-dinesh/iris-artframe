import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from './config/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../../.env') });
dotenv.config({ path: join(__dirname, '../../../.env') });

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@iris-artframe.com';
  const password = process.env.ADMIN_PASSWORD || 'admin123456';
  const name = process.env.ADMIN_NAME || 'Admin';

  const existing = await db.execute({
    sql: 'SELECT id FROM users WHERE email = ?',
    args: [email.toLowerCase()],
  });

  if (existing.rows.length > 0) {
    await db.execute({
      sql: "UPDATE users SET role = 'admin' WHERE email = ?",
      args: [email.toLowerCase()],
    });
    console.log(`Admin role ensured for existing user: ${email}`);
    return;
  }

  const id = uuidv4();
  const passwordHash = await bcrypt.hash(password, 12);

  await db.execute({
    sql: `INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, 'admin')`,
    args: [id, email.toLowerCase(), passwordHash, name],
  });

  console.log(`Admin user created: ${email}`);
  console.log(`Password: ${password}`);
}

seedAdmin().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
