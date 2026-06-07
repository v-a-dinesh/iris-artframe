import { Router, type Response, type NextFunction, type Request } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.js';
import {
  uploadImage,
  listUserImages,
  getImageById,
  deleteImage,
} from '../services/image.service.js';
import { paramId } from '../utils/params.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: (parseInt(process.env.MAX_UPLOAD_SIZE_MB ?? '10', 10) || 10) * 1024 * 1024 },
});

router.use(authMiddleware);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const images = await listUserImages(req.user!.id);
    res.json({ status: 'success', images });
  } catch (err) {
    next(err);
  }
});

router.post('/upload', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      res.status(400).json({ status: 'error', message: 'No file uploaded' });
      return;
    }
    const image = await uploadImage(req.user!.id, req.file);
    res.status(201).json({ status: 'success', image });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const image = await getImageById(req.user!.id, paramId(req));
    if (!image) {
      res.status(404).json({ status: 'error', message: 'Image not found' });
      return;
    }
    res.json({ status: 'success', image });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deleteImage(req.user!.id, paramId(req));
    res.json({ status: 'success', message: 'Image deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
