import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { db } from '../config/db.js';
import { macToDeviceId, buildQrPayload, isValidMac, formatMac, deviceIdToMac } from '../utils/deviceId.js';
import { generateApiKey, hashApiKey, verifyApiKey } from '../utils/apiKey.js';
import type { AppError, DeviceRecord } from '../types/index.js';
import { asString, asNumber, createError } from '../types/index.js';

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

function mapDeviceRow(row: Record<string, unknown>, extras?: Partial<DeviceRecord>): DeviceRecord {
  const lastSeenAt = row.last_seen_at ? asString(row.last_seen_at) : null;
  return {
    id: asString(row.id),
    device_id: asString(row.device_id),
    name: row.name ? asString(row.name) : null,
    status: getEffectiveDeviceStatus(lastSeenAt),
    ip_address: row.ip_address ? asString(row.ip_address) : null,
    static_ip: row.static_ip ? asString(row.static_ip) : null,
    dynamic_ip: row.dynamic_ip ? asString(row.dynamic_ip) : null,
    dynamic_ip_updated_at: row.dynamic_ip_updated_at ? asString(row.dynamic_ip_updated_at) : null,
    created_at: row.created_at ? asString(row.created_at) : undefined,
    last_seen_at: lastSeenAt,
    ...extras,
  };
}

export function getEffectiveDeviceStatus(lastSeenAt: string | null | undefined): 'active' | 'inactive' {
  if (!lastSeenAt) return 'inactive';
  const lastSeen = new Date(lastSeenAt).getTime();
  if (Number.isNaN(lastSeen)) return 'inactive';
  return Date.now() - lastSeen <= ONLINE_THRESHOLD_MS ? 'active' : 'inactive';
}

export async function touchDevicePresence(deviceUuid: string) {
  await db.execute({
    sql: `UPDATE devices
          SET status = 'active', last_seen_at = datetime('now'), updated_at = datetime('now')
          WHERE id = ?`,
    args: [deviceUuid],
  });
}

export async function provisionDevice({
  mac,
  name,
  staticIp,
}: {
  mac: string;
  name?: string;
  staticIp: string;
}) {
  const deviceIdStr = macToDeviceId(mac);

  const existing = await db.execute({
    sql: 'SELECT id, device_id FROM devices WHERE device_id = ?',
    args: [deviceIdStr],
  });

  if (existing.rows.length > 0) {
    const err = createError('Device already provisioned', 409, 'DEVICE_EXISTS') as AppError;
    err.device = {
      id: asString(existing.rows[0].id),
      device_id: asString(existing.rows[0].device_id),
    };
    throw err;
  }

  const ipExists = await db.execute({
    sql: 'SELECT id FROM devices WHERE static_ip = ?',
    args: [staticIp],
  });
  if (ipExists.rows.length > 0) {
    throw createError('Static IP already assigned to another device', 409, 'STATIC_IP_EXISTS');
  }

  const id = uuidv4();
  const apiKey = generateApiKey();
  const apiKeyHash = await hashApiKey(apiKey);

  await db.execute({
    sql: `INSERT INTO devices (id, device_id, api_key_hash, name, static_ip) VALUES (?, ?, ?, ?, ?)`,
    args: [id, deviceIdStr, apiKeyHash, name || null, staticIp],
  });

  const qrPayload = buildQrPayload(deviceIdStr, { mac, static_ip: staticIp });
  const qrDataUrl = await QRCode.toDataURL(qrPayload, {
    width: 400,
    margin: 2,
    color: { dark: '#1a1a2e', light: '#ffffff' },
  });

  return {
    device: {
      id,
      device_id: deviceIdStr,
      name: name || null,
      status: 'inactive',
      static_ip: staticIp,
      mac: formatMac(mac),
    },
    api_key: apiKey,
    qr_payload: qrPayload,
    qr_data_url: qrDataUrl,
  };
}

export async function listAllDevices(): Promise<DeviceRecord[]> {
  const result = await db.execute({
    sql: `SELECT d.id, d.device_id, d.name, d.status, d.ip_address, d.static_ip, d.dynamic_ip,
            d.dynamic_ip_updated_at, d.last_seen_at, d.created_at,
            (SELECT COUNT(*) FROM user_devices ud WHERE ud.device_id = d.id) as owner_count
          FROM devices d ORDER BY d.created_at DESC`,
    args: [],
  });

  return result.rows.map((row) =>
    mapDeviceRow(row as Record<string, unknown>, { owner_count: asNumber(row.owner_count) })
  );
}

export async function registerDeviceForUser(
  userId: string,
  { device_id, name }: { device_id: string; name?: string }
) {
  const deviceResult = await db.execute({
    sql: `SELECT id, device_id, name, status, ip_address, static_ip, dynamic_ip, dynamic_ip_updated_at, last_seen_at
          FROM devices WHERE device_id = ?`,
    args: [device_id.toUpperCase()],
  });

  if (deviceResult.rows.length === 0) {
    throw createError('Device not found. Ask admin to provision this device first.', 404, 'DEVICE_NOT_FOUND');
  }

  const device = deviceResult.rows[0];
  const deviceUuid = asString(device.id);

  const linkCheck = await db.execute({
    sql: 'SELECT id FROM user_devices WHERE user_id = ? AND device_id = ?',
    args: [userId, deviceUuid],
  });

  if (linkCheck.rows.length > 0) {
    throw createError('Device already registered to your account', 409);
  }

  const linkId = uuidv4();
  await db.execute({
    sql: 'INSERT INTO user_devices (id, user_id, device_id) VALUES (?, ?, ?)',
    args: [linkId, userId, deviceUuid],
  });

  let deviceName = device.name ? asString(device.name) : null;
  if (name) {
    await db.execute({
      sql: `UPDATE devices SET name = ?, updated_at = datetime('now') WHERE id = ?`,
      args: [name, deviceUuid],
    });
    deviceName = name;
  }

  return mapDeviceRow(device as Record<string, unknown>, {
    name: deviceName,
    registered_at: undefined,
  });
}

export async function listUserDevices(userId: string): Promise<DeviceRecord[]> {
  const result = await db.execute({
    sql: `SELECT d.id, d.device_id, d.name, d.status, d.ip_address, d.static_ip, d.dynamic_ip,
            d.dynamic_ip_updated_at, d.last_seen_at, ud.registered_at
          FROM user_devices ud
          JOIN devices d ON d.id = ud.device_id
          WHERE ud.user_id = ?
          ORDER BY ud.registered_at DESC`,
    args: [userId],
  });

  return result.rows.map((row) =>
    mapDeviceRow(row as Record<string, unknown>, { registered_at: asString(row.registered_at) })
  );
}

export async function updateDevice(
  userId: string,
  deviceUuid: string,
  { name, ip_address, dynamic_ip }: { name?: string; ip_address?: string; dynamic_ip?: string }
) {
  await assertUserOwnsDevice(userId, deviceUuid);

  const updates: string[] = [];
  const args: (string | null)[] = [];

  if (name !== undefined) {
    updates.push('name = ?');
    args.push(name);
  }
  if (ip_address !== undefined) {
    updates.push('ip_address = ?');
    args.push(ip_address);
  }
  if (dynamic_ip !== undefined) {
    updates.push('dynamic_ip = ?');
    updates.push("dynamic_ip_updated_at = datetime('now')");
    args.push(dynamic_ip.trim());
  }

  if (updates.length === 0) {
    throw createError('No fields to update', 400);
  }

  updates.push("updated_at = datetime('now')");
  args.push(deviceUuid);

  await db.execute({
    sql: `UPDATE devices SET ${updates.join(', ')} WHERE id = ?`,
    args,
  });

  return getDeviceByUuid(deviceUuid);
}

export async function adminUpdateDevice(
  deviceUuid: string,
  { name, static_ip, dynamic_ip }: { name?: string; static_ip?: string; dynamic_ip?: string }
) {
  const updates: string[] = [];
  const args: (string | null)[] = [];

  if (name !== undefined) {
    updates.push('name = ?');
    args.push(name);
  }
  if (static_ip !== undefined) {
    if (static_ip) {
      const ipExists = await db.execute({
        sql: 'SELECT id FROM devices WHERE static_ip = ? AND id != ?',
        args: [static_ip, deviceUuid],
      });
      if (ipExists.rows.length > 0) {
        throw createError('Static IP already assigned to another device', 409, 'STATIC_IP_EXISTS');
      }
    }
    updates.push('static_ip = ?');
    args.push(static_ip || null);
  }
  if (dynamic_ip !== undefined) {
    updates.push('dynamic_ip = ?');
    updates.push("dynamic_ip_updated_at = datetime('now')");
    args.push(dynamic_ip.trim() || null);
  }

  if (updates.length === 0) {
    throw createError('No fields to update', 400);
  }

  updates.push("updated_at = datetime('now')");
  args.push(deviceUuid);

  await db.execute({
    sql: `UPDATE devices SET ${updates.join(', ')} WHERE id = ?`,
    args,
  });

  return getDeviceByUuid(deviceUuid);
}

export async function unregisterDevice(userId: string, deviceUuid: string) {
  await assertUserOwnsDevice(userId, deviceUuid);

  await db.execute({
    sql: 'DELETE FROM user_devices WHERE user_id = ? AND device_id = ?',
    args: [userId, deviceUuid],
  });
}

export async function getDeviceByUuid(id: string): Promise<DeviceRecord | null> {
  const result = await db.execute({
    sql: `SELECT id, device_id, name, status, ip_address, static_ip, dynamic_ip, dynamic_ip_updated_at,
            last_seen_at, created_at FROM devices WHERE id = ?`,
    args: [id],
  });
  if (result.rows.length === 0) return null;
  return mapDeviceRow(result.rows[0] as Record<string, unknown>);
}

export async function assertUserOwnsDevice(userId: string, deviceUuid: string) {
  const result = await db.execute({
    sql: 'SELECT id FROM user_devices WHERE user_id = ? AND device_id = ?',
    args: [userId, deviceUuid],
  });
  if (result.rows.length === 0) {
    throw createError('Device not found or access denied', 403);
  }
}

export async function getDeviceByApiKey(apiKey: string) {
  const result = await db.execute({
    sql: 'SELECT id, device_id, api_key_hash, name, status FROM devices',
    args: [],
  });

  for (const row of result.rows) {
    const valid = await verifyApiKey(apiKey, asString(row.api_key_hash));
    if (valid) {
      return {
        id: asString(row.id),
        device_id: asString(row.device_id),
        name: row.name ? asString(row.name) : null,
        status: asString(row.status),
      };
    }
  }
  return null;
}

export async function regenerateQr(deviceUuid: string) {
  const device = await getDeviceByUuid(deviceUuid);
  if (!device) {
    throw createError('Device not found', 404);
  }

  const qrPayload = buildQrPayload(device.device_id, {
    static_ip: device.static_ip ?? undefined,
  });
  const qrDataUrl = await QRCode.toDataURL(qrPayload, {
    width: 400,
    margin: 2,
    color: { dark: '#1a1a2e', light: '#ffffff' },
  });

  return {
    device: { ...device, mac: deviceIdToMac(device.device_id) },
    qr_payload: qrPayload,
    qr_data_url: qrDataUrl,
  };
}

export async function getDeviceByDeviceId(deviceId: string): Promise<DeviceRecord | null> {
  const result = await db.execute({
    sql: `SELECT id, device_id, name, status, ip_address, static_ip, dynamic_ip, dynamic_ip_updated_at, last_seen_at, created_at
          FROM devices WHERE device_id = ?`,
    args: [deviceId.toUpperCase()],
  });
  if (result.rows.length === 0) return null;
  return mapDeviceRow(result.rows[0] as Record<string, unknown>);
}

export async function updateDeviceDynamicIp(deviceUuid: string, dynamicIp: string) {
  const trimmedIp = dynamicIp.trim();
  if (!trimmedIp) {
    throw createError('Dynamic IP cannot be empty', 400);
  }

  await db.execute({
    sql: `UPDATE devices 
          SET dynamic_ip = ?, dynamic_ip_updated_at = datetime('now'), updated_at = datetime('now')
          WHERE id = ?`,
    args: [trimmedIp, deviceUuid],
  });

  return getDeviceByUuid(deviceUuid);
}

export async function updateDeviceDynamicIpByMac(mac: string, dynamicIp: string) {
  if (!isValidMac(mac)) {
    throw createError('Invalid MAC address. Use format AA:BB:CC:DD:EE:FF or AABBCCDDEEFF', 400);
  }

  const deviceIdStr = macToDeviceId(mac);
  const device = await getDeviceByDeviceId(deviceIdStr);
  if (!device) {
    throw createError('Device not found. Ask admin to provision this device first.', 404, 'DEVICE_NOT_FOUND');
  }

  await updateDeviceDynamicIp(device.id, dynamicIp);
  await touchDevicePresence(device.id);

  return getDeviceByUuid(device.id);
}
