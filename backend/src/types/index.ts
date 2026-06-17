import type { Request } from 'express';

export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  mobile: string | null;
  role: UserRole;
  created_at?: string;
}

export interface DeviceRecord {
  id: string;
  device_id: string;
  name: string | null;
  status: string;
  ip_address?: string | null;
  static_ip?: string | null;
  dynamic_ip?: string | null;
  dynamic_ip_updated_at?: string | null;
  wifi_name?: string | null;
  registered_at?: string;
  created_at?: string;
  owner_count?: number;
  last_seen_at?: string | null;
}

export interface ImageRecord {
  id: string;
  public_id: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  public_url: string;
  created_at: string;
}

export interface AppError extends Error {
  status?: number;
  code?: string;
  device?: { id: string; device_id: string };
}

export function createError(message: string, status: number, code?: string): AppError {
  const err = new Error(message) as AppError;
  err.status = status;
  if (code) err.code = code;
  return err;
}

export interface AuthenticatedRequest extends Request {
  user: User;
}

export interface DeviceAuthenticatedRequest extends Request {
  device: {
    id: string;
    device_id: string;
    name: string | null;
    status: string;
  };
}

export function asString(value: unknown): string {
  return String(value ?? '');
}

export function asNumber(value: unknown): number {
  return Number(value ?? 0);
}
