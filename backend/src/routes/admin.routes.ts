import { Router, type Response, type NextFunction, type Request } from 'express';
import { z } from 'zod';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { provisionDevice, listAllDevices, regenerateQr, adminUpdateDevice, resolveDeviceUuid } from '../services/device.service.js';
import { isValidMac } from '../utils/deviceId.js';
import { paramId } from '../utils/params.js';

const router = Router();

router.use(authMiddleware, adminMiddleware);

router.get('/devices', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const devices = await listAllDevices();
    res.json({ status: 'success', devices });
  } catch (err) {
    next(err);
  }
});

router.post('/devices/provision', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      mac: z.string().min(1),
      name: z.string().optional(),
      static_ip: z.string().ip(),
    });
    const data = schema.parse(req.body);

    if (!isValidMac(data.mac)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid MAC address. Use format AA:BB:CC:DD:EE:FF or AABBCCDDEEFF',
      });
      return;
    }

    const result = await provisionDevice({ mac: data.mac, name: data.name, staticIp: data.static_ip });
    res.status(201).json({ status: 'success', ...result });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ status: 'error', message: err.errors[0].message });
      return;
    }
    next(err);
  }
});

router.get('/devices/:id/qr', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deviceUuid = await resolveDeviceUuid(paramId(req));
    const result = await regenerateQr(deviceUuid);
    res.json({ status: 'success', ...result });
  } catch (err) {
    next(err);
  }
});

router.patch('/devices/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      name: z.string().optional(),
      static_ip: z.string().ip().optional().nullable(),
      dynamic_ip: z.string().ip().optional().nullable(),
    });
    const data = schema.parse(req.body);
    const deviceUuid = await resolveDeviceUuid(paramId(req));
    const device = await adminUpdateDevice(deviceUuid, {
      name: data.name,
      static_ip: data.static_ip ?? undefined,
      dynamic_ip: data.dynamic_ip ?? undefined,
    });
    res.json({ status: 'success', device });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ status: 'error', message: err.errors[0].message });
      return;
    }
    next(err);
  }
});

export default router;
