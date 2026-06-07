import { Router, type Response, type NextFunction, type Request } from 'express';
import { z } from 'zod';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { provisionDevice, listAllDevices, regenerateQr } from '../services/device.service.js';
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
    });
    const data = schema.parse(req.body);

    if (!isValidMac(data.mac)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid MAC address. Use format AA:BB:CC:DD:EE:FF or AABBCCDDEEFF',
      });
      return;
    }

    const result = await provisionDevice(data);
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
    const result = await regenerateQr(paramId(req));
    res.json({ status: 'success', ...result });
  } catch (err) {
    next(err);
  }
});

export default router;
