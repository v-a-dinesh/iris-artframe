export function formatMac(mac: string): string {
  const cleaned = mac.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
  if (cleaned.length !== 12) {
    throw new Error('Invalid MAC address. Expected 12 hex characters.');
  }
  return cleaned.match(/.{2}/g)!.join(':');
}

export function isValidMac(mac: string): boolean {
  const cleaned = mac.replace(/[^a-fA-F0-9]/g, '');
  return cleaned.length === 12;
}

/** Device identifier is the MAC address in AA:BB:CC:DD:EE:FF format. */
export function normalizeDeviceId(input: string): string {
  const trimmed = input.trim();
  if (/^IRIS-/i.test(trimmed)) {
    const cleaned = trimmed.replace(/^IRIS-/i, '').replace(/[^a-fA-F0-9]/g, '');
    return formatMac(cleaned);
  }
  return formatMac(trimmed);
}

export function parseQrPayload(raw: string): string {
  const trimmed = raw.trim();

  try {
    const parsed = JSON.parse(trimmed) as { device_id?: string; mac?: string };
    if (parsed.device_id) return normalizeDeviceId(parsed.device_id);
    if (parsed.mac) return normalizeDeviceId(parsed.mac);
  } catch {
    // not JSON
  }

  const urlMatch = trimmed.match(/device_id=([^&\s]+)/);
  if (urlMatch) return normalizeDeviceId(decodeURIComponent(urlMatch[1]));

  const irisMatch = trimmed.match(/IRIS-[A-F0-9]{12}/i);
  if (irisMatch) return normalizeDeviceId(irisMatch[0]);

  if (isValidMac(trimmed)) return normalizeDeviceId(trimmed);

  throw new Error('Could not parse device ID from QR code');
}
