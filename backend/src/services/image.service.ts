import { v4 as uuidv4 } from 'uuid';
import { nanoid } from 'nanoid';
import { db } from '../config/db.js';
import type { ImageRecord } from '../types/index.js';
import { asString, asNumber, createError } from '../types/index.js';

const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || 'http://localhost:3001';

const ALLOWED_MIME = ['image/jpeg', 'image/png'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

function isAllowedImage(file: UploadedFile): boolean {
  const ext = file.originalname.toLowerCase().match(/\.[^.]+$/)?.[0] ?? '';
  return ALLOWED_MIME.includes(file.mimetype) && ALLOWED_EXTENSIONS.includes(ext);
}

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export function getPublicUrl(publicId: string): string {
  return `${PUBLIC_BASE_URL}/public/images/${publicId}`;
}

export async function uploadImage(userId: string, file: UploadedFile): Promise<ImageRecord> {
  if (!isAllowedImage(file)) {
    throw createError('Invalid file type. Allowed: JPG, JPEG, PNG', 400);
  }

  const maxBytes = (parseInt(process.env.MAX_UPLOAD_SIZE_MB ?? '10', 10) || 10) * 1024 * 1024;
  if (file.size > maxBytes) {
    throw createError(`File too large. Max ${process.env.MAX_UPLOAD_SIZE_MB || 10}MB`, 400);
  }

  const id = uuidv4();
  const publicId = nanoid(12);

  await db.execute({
    sql: `INSERT INTO images (id, user_id, public_id, original_filename, mime_type, file_data, file_size)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [id, userId, publicId, file.originalname, file.mimetype, file.buffer, file.size],
  });

  return formatImage({
    id,
    public_id: publicId,
    original_filename: file.originalname,
    mime_type: file.mimetype,
    file_size: file.size,
    created_at: new Date().toISOString(),
  });
}

export async function listUserImages(userId: string): Promise<ImageRecord[]> {
  const result = await db.execute({
    sql: `SELECT id, public_id, original_filename, mime_type, file_size, created_at
          FROM images WHERE user_id = ? ORDER BY created_at DESC`,
    args: [userId],
  });

  return result.rows.map((row) =>
    formatImage({
      id: asString(row.id),
      public_id: asString(row.public_id),
      original_filename: asString(row.original_filename),
      mime_type: asString(row.mime_type),
      file_size: asNumber(row.file_size),
      created_at: asString(row.created_at),
    })
  );
}

export async function getImageById(userId: string, imageId: string): Promise<ImageRecord | null> {
  const result = await db.execute({
    sql: `SELECT id, public_id, original_filename, mime_type, file_size, created_at
          FROM images WHERE id = ? AND user_id = ?`,
    args: [imageId, userId],
  });

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return formatImage({
    id: asString(row.id),
    public_id: asString(row.public_id),
    original_filename: asString(row.original_filename),
    mime_type: asString(row.mime_type),
    file_size: asNumber(row.file_size),
    created_at: asString(row.created_at),
  });
}

export async function getImageByPublicId(publicId: string) {
  const result = await db.execute({
    sql: 'SELECT mime_type, file_data, original_filename FROM images WHERE public_id = ?',
    args: [publicId],
  });

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    mime_type: asString(row.mime_type),
    file_data: row.file_data as ArrayBuffer | Uint8Array,
    original_filename: asString(row.original_filename),
  };
}

export async function deleteImage(userId: string, imageId: string) {
  const result = await db.execute({
    sql: 'DELETE FROM images WHERE id = ? AND user_id = ?',
    args: [imageId, userId],
  });

  if (result.rowsAffected === 0) {
    throw createError('Image not found', 404);
  }
}

function formatImage(row: {
  id: string;
  public_id: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  created_at: string;
}): ImageRecord {
  return {
    id: row.id,
    public_id: row.public_id,
    original_filename: row.original_filename,
    mime_type: row.mime_type,
    file_size: row.file_size,
    public_url: getPublicUrl(row.public_id),
    created_at: row.created_at,
  };
}
