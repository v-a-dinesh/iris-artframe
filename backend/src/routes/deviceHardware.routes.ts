import { Router, type Response, type NextFunction, type Request } from 'express';
import { z } from 'zod';
import { updateDeviceDynamicIpByMac } from '../services/device.service.js';

const router = Router();

/**
 * Hardware: report dynamic IP when device powers on or IP changes.
 * POST /api/device/dynamic-ip
 * Body: { "mac": "B8:27:EB:AA:BB:CC", "dynamic_ip": "192.168.1.50" }
 */
router.post('/dynamic-ip', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      mac: z.string().min(1),
      dynamic_ip: z.string().ip(),
    });
    const data = schema.parse(req.body);

    const device = await updateDeviceDynamicIpByMac(data.mac, data.dynamic_ip);

    res.json({
      status: 'success',
      message: 'Dynamic IP updated',
      device_id: device?.device_id,
      mac: data.mac,
      dynamic_ip: data.dynamic_ip,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ status: 'error', message: err.errors[0].message });
      return;
    }
    next(err);
  }
});

export default router;
