export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  mobile: string | null;
  role: UserRole;
}

export interface Device {
  id: string;
  device_id: string;
  name: string | null;
  status: string;
  ip_address?: string | null;
  static_ip?: string | null;
  mac?: string | null;
  dynamic_ip?: string | null;
  dynamic_ip_updated_at?: string | null;
  wifi_name?: string | null;
  registered_at?: string;
  owner_count?: number;
  created_at?: string;
  last_seen_at?: string | null;
}

export type DeviceUpdatePayload = {
  name?: string;
  ip_address?: string;
  static_ip?: string | null;
  dynamic_ip?: string | null;
  wifi_name?: string | null;
  status?: 'active' | 'inactive';
};

export interface Image {
  id: string;
  public_id: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  public_url: string;
  created_at: string;
}

export interface ProvisionResult {
  device: Device;
  api_key?: string;
  qr_payload: string;
  qr_data_url: string;
}

export interface RegisterForm {
  name: string;
  email: string;
  password: string;
  mobile?: string;
}

export interface ApiSuccess<T> {
  status: 'success';
  [key: string]: T | string | undefined;
}
