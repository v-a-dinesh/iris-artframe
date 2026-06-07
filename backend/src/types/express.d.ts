import type { User } from './index.js';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      device?: {
        id: string;
        device_id: string;
        name: string | null;
        status: string;
      };
    }
  }
}

export {};
