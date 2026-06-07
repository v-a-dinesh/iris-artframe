import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export function generateApiKey(): string {
  return `iris_${crypto.randomBytes(24).toString('hex')}`;
}

export async function hashApiKey(apiKey: string): Promise<string> {
  return bcrypt.hash(apiKey, 10);
}

export async function verifyApiKey(apiKey: string, hash: string): Promise<boolean> {
  return bcrypt.compare(apiKey, hash);
}
