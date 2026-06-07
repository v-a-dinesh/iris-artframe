export function macToDeviceId(mac: string): string {
  const cleaned = mac.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
  if (cleaned.length !== 12) {
    throw new Error('Invalid MAC address. Expected 12 hex characters.');
  }
  return `IRIS-${cleaned}`;
}

export function isValidMac(mac: string): boolean {
  const cleaned = mac.replace(/[^a-fA-F0-9]/g, '');
  return cleaned.length === 12;
}

export function formatMac(mac: string): string {
  const cleaned = mac.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
  if (cleaned.length !== 12) {
    throw new Error('Invalid MAC address. Expected 12 hex characters.');
  }
  return cleaned.match(/.{2}/g)!.join(':');
}

export function deviceIdToMac(deviceId: string): string {
  const cleaned = deviceId.replace(/^IRIS-/i, '').replace(/[^a-fA-F0-9]/g, '').toUpperCase();
  if (cleaned.length !== 12) {
    throw new Error('Invalid device ID for MAC conversion.');
  }
  return formatMac(cleaned);
}

export function buildQrPayload(
  deviceId: string,
  opts?: { mac?: string; static_ip?: string }
): string {
  const mac = opts?.mac ? formatMac(opts.mac) : deviceIdToMac(deviceId);
  return JSON.stringify({
    type: 'iris-artframe',
    device_id: deviceId,
    mac,
    static_ip: opts?.static_ip,
    version: 1,
  });
}

export function parseQrPayload(raw: string): string {
  const trimmed = raw.trim();

  try {
    const parsed = JSON.parse(trimmed) as { device_id?: string };
    if (parsed.device_id) return parsed.device_id;
  } catch {
    // not JSON
  }

  const urlMatch = trimmed.match(/device_id=([A-Za-z0-9-]+)/);
  if (urlMatch) return urlMatch[1];

  const irisMatch = trimmed.match(/IRIS-[A-F0-9]{12}/i);
  if (irisMatch) return irisMatch[0].toUpperCase();

  if (/^IRIS-[A-F0-9]{12}$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  throw new Error('Could not parse device ID from QR code');
}
