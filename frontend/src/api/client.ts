import axios, { type AxiosProgressEvent } from 'axios';
import type { RegisterForm, Device, Image, ProvisionResult, User } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
export const PUBLIC_BASE = API_BASE.replace(/\/api$/, '');

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config.url?.includes('/auth/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;

export const authApi = {
  register: (data: RegisterForm) =>
    api.post<{ status: string; user: User; token: string }>('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post<{ status: string; user: User; token: string }>('/auth/login', data),
  resetPassword: (data: { email: string; new_password: string }) =>
    api.post<{ status: string; message: string; email: string }>('/auth/reset-password', data),
  me: () => api.get<{ status: string; user: User }>('/auth/me'),
};

export const devicesApi = {
  list: () => api.get<{ status: string; devices: Device[] }>('/devices'),
  register: (data: { device_id: string; name?: string }) =>
    api.post<{ status: string; device: Device }>('/devices/register', data),
  update: (id: string, data: { name?: string; ip_address?: string; dynamic_ip?: string }) =>
    api.patch<{ status: string; device: Device }>(`/devices/${id}`, data),
  remove: (id: string) => api.delete(`/devices/${id}`),
  display: (id: string, imageId: string) =>
    api.post<{ status: string; message: string; job_id: string }>(`/devices/${id}/display`, {
      image_id: imageId,
    }),
  logs: (id: string) => api.get(`/devices/${id}/display-logs`),
};

export const imagesApi = {
  list: () => api.get<{ status: string; images: Image[] }>('/images'),
  upload: (file: File, onProgress?: (event: AxiosProgressEvent) => void) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<{ status: string; image: Image }>('/images/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    });
  },
  get: (id: string) => api.get<{ status: string; image: Image }>(`/images/${id}`),
  remove: (id: string) => api.delete(`/images/${id}`),
};

export const adminApi = {
  listDevices: () => api.get<{ status: string; devices: Device[] }>('/admin/devices'),
  provision: (data: { mac: string; name?: string; static_ip: string }) =>
    api.post<{ status: string } & ProvisionResult>('/admin/devices/provision', data),
  getQr: (id: string) =>
    api.get<{ status: string; device: Device; qr_payload: string; qr_data_url: string }>(
      `/admin/devices/${id}/qr`
    ),
  updateDevice: (id: string, data: { name?: string; static_ip?: string; dynamic_ip?: string }) =>
    api.patch<{ status: string; device: Device }>(`/admin/devices/${id}`, data),
};
