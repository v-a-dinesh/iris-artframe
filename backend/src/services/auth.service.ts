import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/db.js';
import type { User, UserRole } from '../types/index.js';
import { asString, createError } from '../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  mobile?: string;
}

interface LoginInput {
  email: string;
  password: string;
}

export async function registerUser({ name, email, password, mobile }: RegisterInput) {
  const existing = await db.execute({
    sql: 'SELECT id FROM users WHERE email = ?',
    args: [email.toLowerCase()],
  });

  if (existing.rows.length > 0) {
    throw createError('Email already registered', 409, 'EMAIL_EXISTS');
  }

  const id = uuidv4();
  const passwordHash = await bcrypt.hash(password, 12);
  const role: UserRole =
    email.toLowerCase() === (process.env.ADMIN_EMAIL || '').toLowerCase() ? 'admin' : 'user';

  await db.execute({
    sql: `INSERT INTO users (id, email, password_hash, name, mobile, role) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, email.toLowerCase(), passwordHash, name, mobile || null, role],
  });

  const user: User = { id, name, email: email.toLowerCase(), mobile: mobile || null, role };
  const token = signToken(user);
  return { user, token };
}

export async function loginUser({ email, password }: LoginInput) {
  const normalizedEmail = email.trim().toLowerCase();
  const result = await db.execute({
    sql: 'SELECT id, email, password_hash, name, mobile, role FROM users WHERE email = ?',
    args: [normalizedEmail],
  });

  if (result.rows.length === 0) {
    throw createError('Invalid email or password', 401);
  }

  const row = result.rows[0];
  const valid = await bcrypt.compare(password, asString(row.password_hash));
  if (!valid) {
    throw createError('Invalid email or password', 401);
  }

  const user: User = {
    id: asString(row.id),
    email: asString(row.email),
    name: asString(row.name),
    mobile: row.mobile ? asString(row.mobile) : null,
    role: asString(row.role) as UserRole,
  };
  const token = signToken(user);
  return { user, token };
}

export async function getUserById(id: string): Promise<User | null> {
  const result = await db.execute({
    sql: 'SELECT id, email, name, mobile, role, created_at FROM users WHERE id = ?',
    args: [id],
  });
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: asString(row.id),
    email: asString(row.email),
    name: asString(row.name),
    mobile: row.mobile ? asString(row.mobile) : null,
    role: asString(row.role) as UserRole,
    created_at: asString(row.created_at),
  };
}

function signToken(user: User): string {
  const options: SignOptions = { expiresIn: JWT_EXPIRES_IN as SignOptions['expiresIn'] };
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, options);
}

export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as { sub: string; email: string; role: UserRole };
}

export async function resetPassword(email: string, newPassword: string) {
  if (newPassword.length < 6) {
    throw createError('Password must be at least 6 characters', 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const result = await db.execute({
    sql: 'SELECT id FROM users WHERE email = ?',
    args: [normalizedEmail],
  });

  if (result.rows.length === 0) {
    throw createError('No account found for that email', 404);
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.execute({
    sql: `UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE email = ?`,
    args: [passwordHash, normalizedEmail],
  });

  return { email: normalizedEmail };
}
