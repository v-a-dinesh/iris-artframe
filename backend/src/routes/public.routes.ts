import { Router, type Response, type NextFunction } from 'express';
import { getImageByPublicId } from '../services/image.service.js';
import { paramId } from '../utils/params.js';

const router = Router();

router.get('/images/:publicId', async (req, res: Response, next: NextFunction) => {
  try {
    const publicId = paramId(req, 'publicId');
    const image = await getImageByPublicId(publicId);
    if (!image) {
      res.status(404).json({ status: 'error', message: 'Image not found' });
      return;
    }

    res.set('Content-Type', image.mime_type);
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(image.file_data as Uint8Array));
  } catch (err) {
    next(err);
  }
});

export default router;
