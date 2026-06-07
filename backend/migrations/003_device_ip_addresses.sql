-- Add static_ip (set during provisioning) and dynamic_ip (reported by device)
ALTER TABLE devices ADD COLUMN static_ip TEXT;
ALTER TABLE devices ADD COLUMN dynamic_ip TEXT;
ALTER TABLE devices ADD COLUMN dynamic_ip_updated_at TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_devices_static_ip ON devices(static_ip) WHERE static_ip IS NOT NULL;
