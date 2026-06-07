import { Router, type Response, type NextFunction, type Request } from 'express';
import { z } from 'zod';
import { deviceAuthMiddleware } from '../middleware/auth.js';
import { touchDevicePresence } from '../services/device.service.js';
import { getPendingJobForDevice, acknowledgeJob } from '../services/display.service.js';

const router = Router();

router.use(deviceAuthMiddleware);

router.get('/poll', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await touchDevicePresence(req.device!.id);
    const job = await getPendingJobForDevice(req.device!.id);
    if (!job) {
      res.json({ status: 'success', job: null });
      return;
    }
    res.json({
      status: 'success',
      job: {
        job_id: job.job_id,
        image_url: job.image_url,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/poll/ack', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      job_id: z.string().uuid(),
      status: z.enum(['success', 'error']),
      message: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const result = await acknowledgeJob(req.device!.id, data.job_id, data);
    res.json({ status: 'success', log_id: result.log_id, job_status: result.status });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ status: 'error', message: err.errors[0].message });
      return;
    }
    next(err);
  }
});

export default router;
