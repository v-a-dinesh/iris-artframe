import { Router, type Response, type NextFunction, type Request } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import {
  registerDeviceForUser,
  listUserDevices,
  listAllDevices,
  updateDevice,
  adminUpdateDevice,
  unregisterDevice,
  resolveDeviceUuid,
} from '../services/device.service.js';
import { queueDisplayJob, getDisplayLogs } from '../services/display.service.js';
import { paramId } from '../utils/params.js';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const devices =
      req.user!.role === 'admin'
        ? await listAllDevices()
        : await listUserDevices(req.user!.id);
    res.json({ status: 'success', devices });
  } catch (err) {
    next(err);
  }
});

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      device_id: z.string().min(1),
      name: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const device = await registerDeviceForUser(req.user!.id, {
      device_id: data.device_id,
      name: data.name,
    });
    res.status(201).json({ status: 'success', device });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ status: 'error', message: err.errors[0].message });
      return;
    }
    next(err);
  }
});

router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deviceUuid = await resolveDeviceUuid(paramId(req));

    if (req.user!.role === 'admin') {
      const schema = z.object({
        name: z.string().optional(),
        static_ip: z.string().ip().optional().nullable(),
        dynamic_ip: z.string().ip().optional().nullable(),
      });
      const data = schema.parse(req.body);
      const device = await adminUpdateDevice(deviceUuid, {
        name: data.name,
        static_ip: data.static_ip ?? undefined,
        dynamic_ip: data.dynamic_ip ?? undefined,
      });
      res.json({ status: 'success', device });
      return;
    }

    const schema = z.object({
      name: z.string().optional(),
      ip_address: z.string().optional(),
      dynamic_ip: z.string().ip().optional(),
    });
    const data = schema.parse(req.body);
    const device = await updateDevice(req.user!.id, deviceUuid, data);
    res.json({ status: 'success', device });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ status: 'error', message: err.errors[0].message });
      return;
    }
    next(err);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deviceUuid = await resolveDeviceUuid(paramId(req));
    await unregisterDevice(req.user!.id, deviceUuid);
    res.json({ status: 'success', message: 'Device unregistered' });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/display', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({ image_id: z.string().uuid() });
    const { image_id } = schema.parse(req.body);
    const deviceUuid = await resolveDeviceUuid(paramId(req));
    const result = await queueDisplayJob(req.user!.id, deviceUuid, image_id);
    res.json({
      status: 'success',
      job_id: result.job_id,
      job_status: result.status,
      message: result.message,
      image_url: result.image_url,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ status: 'error', message: err.errors[0].message });
      return;
    }
    next(err);
  }
});

router.get('/:id/display-logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deviceUuid = await resolveDeviceUuid(paramId(req));
    const logs = await getDisplayLogs(req.user!.id, deviceUuid, req.user!.role);
    res.json({ status: 'success', logs });
  } catch (err) {
    next(err);
  }
});

export default router;
