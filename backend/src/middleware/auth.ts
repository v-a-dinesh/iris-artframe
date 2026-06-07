import jwt from 'jsonwebtoken';
import type { Response, NextFunction, Request } from 'express';
import { getUserById } from '../services/auth.service.js';
import { getDeviceByApiKey } from '../services/device.service.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      res.status(401).json({ status: 'error', message: 'Missing or invalid token' });
      return;
    }

    const token = header.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    const user = await getUserById(payload.sub);

    if (!user) {
      res.status(401).json({ status: 'error', message: 'User not found' });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ status: 'error', message: 'Invalid or expired token' });
  }
}

export function adminMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ status: 'error', message: 'Admin access required' });
    return;
  }
  next();
}

export async function deviceAuthMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || typeof apiKey !== 'string') {
    res.status(401).json({ status: 'error', message: 'Missing x-api-key header' });
    return;
  }

  const device = await getDeviceByApiKey(apiKey);

  if (!device) {
    res.status(401).json({ status: 'error', message: 'Invalid API key' });
    return;
  }

  req.device = device;
  next();
}
