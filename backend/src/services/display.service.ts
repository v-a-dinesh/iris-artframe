import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/db.js';
import { assertUserOwnsDevice } from './device.service.js';
import { getImageById, getPublicUrl } from './image.service.js';
import { asString, createError } from '../types/index.js';

export async function queueDisplayJob(userId: string, deviceUuid: string, imageId: string) {
  await assertUserOwnsDevice(userId, deviceUuid);

  const image = await getImageById(userId, imageId);
  if (!image) {
    throw createError('Image not found', 404);
  }

  const imageUrl = getPublicUrl(image.public_id);
  const jobId = uuidv4();

  await db.execute({
    sql: `UPDATE display_jobs SET status = 'superseded'
          WHERE device_id = ? AND status = 'pending'`,
    args: [deviceUuid],
  });

  await db.execute({
    sql: `INSERT INTO display_jobs (id, user_id, device_id, image_id, image_url, status)
          VALUES (?, ?, ?, ?, ?, 'pending')`,
    args: [jobId, userId, deviceUuid, imageId, imageUrl],
  });

  return {
    job_id: jobId,
    status: 'pending' as const,
    message: 'Display job queued.',
    image_url: imageUrl,
  };
}

export async function getPendingJobForDevice(deviceUuid: string) {
  const result = await db.execute({
    sql: `SELECT id, image_url, image_id, created_at FROM display_jobs
          WHERE device_id = ? AND status = 'pending'
          ORDER BY created_at ASC LIMIT 1`,
    args: [deviceUuid],
  });

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    job_id: asString(row.id),
    image_url: asString(row.image_url),
    image_id: asString(row.image_id),
    created_at: asString(row.created_at),
  };
}

export async function acknowledgeJob(
  deviceUuid: string,
  jobId: string,
  { status, message }: { status: 'success' | 'error'; message?: string }
) {
  const result = await db.execute({
    sql: 'SELECT id, user_id, image_id FROM display_jobs WHERE id = ? AND device_id = ?',
    args: [jobId, deviceUuid],
  });

  if (result.rows.length === 0) {
    throw createError('Job not found', 404);
  }

  const job = result.rows[0];
  const finalStatus = status === 'success' ? 'completed' : 'failed';

  await db.execute({
    sql: `UPDATE display_jobs SET status = ?, message = ?, completed_at = datetime('now') WHERE id = ?`,
    args: [finalStatus, message || null, jobId],
  });

  await db.execute({
    sql: `UPDATE devices SET status = 'active', last_seen_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
    args: [deviceUuid],
  });

  const logId = uuidv4();
  await db.execute({
    sql: `INSERT INTO display_logs (id, user_id, device_id, image_id, status, message)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [logId, asString(job.user_id), deviceUuid, asString(job.image_id), status, message || null],
  });

  return { log_id: logId, status: finalStatus };
}

export async function getDisplayLogs(userId: string, deviceUuid: string, role?: string) {
  await assertUserOwnsDevice(userId, deviceUuid, role);

  const result =
    role === 'admin'
      ? await db.execute({
          sql: `SELECT dl.id, dl.status, dl.message, dl.created_at,
                  i.original_filename, i.public_id
                FROM display_logs dl
                JOIN images i ON i.id = dl.image_id
                WHERE dl.device_id = ?
                ORDER BY dl.created_at DESC LIMIT 50`,
          args: [deviceUuid],
        })
      : await db.execute({
          sql: `SELECT dl.id, dl.status, dl.message, dl.created_at,
                  i.original_filename, i.public_id
                FROM display_logs dl
                JOIN images i ON i.id = dl.image_id
                WHERE dl.device_id = ? AND dl.user_id = ?
                ORDER BY dl.created_at DESC LIMIT 50`,
          args: [deviceUuid, userId],
        });

  return result.rows.map((row) => ({
    id: asString(row.id),
    status: asString(row.status),
    message: row.message ? asString(row.message) : null,
    created_at: asString(row.created_at),
    image: {
      original_filename: asString(row.original_filename),
      public_id: asString(row.public_id),
      public_url: getPublicUrl(asString(row.public_id)),
    },
  }));
}
