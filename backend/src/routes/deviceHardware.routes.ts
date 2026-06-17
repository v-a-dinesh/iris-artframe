import { Router, type Response, type NextFunction, type Request } from 'express';
import { z } from 'zod';
import { hardwareUpdateDevice } from '../services/device.service.js';
import { isValidMac } from '../utils/deviceId.js';

const router = Router();

/**
 * Hardware: report device status on boot or when details change. No auth required.
 * POST /api/device/dynamic-ip
 * Body: {
 *   "device_id": "B8:27:EB:AA:BB:AA",
 *   "name": "Bedroom Frame",
 *   "dynamic_ip": "192.167.85.12",
 *   "wifiname": "HomeWiFi",
 *   "status": "active"
 * }
 */
router.post('/dynamic-ip', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      device_id: z.string().min(1),
      name: z.string().optional(),
      dynamic_ip: z.string().ip().optional(),
      wifiname: z.string().optional(),
      wifi_name: z.string().optional(),
      status: z.enum(['active', 'inactive']).optional(),
    });
    const data = schema.parse(req.body);

    if (!isValidMac(data.device_id)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid device_id. Use MAC format AA:BB:CC:DD:EE:FF or AABBCCDDEEFF',
      });
      return;
    }

    const device = await hardwareUpdateDevice(data.device_id, {
      name: data.name,
      dynamic_ip: data.dynamic_ip,
      wifi_name: data.wifiname ?? data.wifi_name,
      status: data.status,
    });

    res.json({
      status: 'success',
      message: 'Device updated',
      device,
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
