import { Router, type Response, type NextFunction, type Request } from 'express';
import { z } from 'zod';
import { registerUser, loginUser, resetPassword } from '../services/auth.service.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(128),
  mobile: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const resetPasswordSchema = z.object({
  email: z.string().email(),
  new_password: z.string().min(6).max(128),
});

router.post('/register', async (req, res: Response, next: NextFunction) => {
  try {
    const data = registerSchema.parse(req.body);
    const result = await registerUser(data);
    res.status(201).json({ status: 'success', ...result });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ status: 'error', message: err.errors[0].message });
      return;
    }
    next(err);
  }
});

router.post('/login', async (req, res: Response, next: NextFunction) => {
  try {
    const data = loginSchema.parse(req.body);
    const result = await loginUser(data);
    res.json({ status: 'success', ...result });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ status: 'error', message: err.errors[0].message });
      return;
    }
    next(err);
  }
});

router.post('/reset-password', async (req, res: Response, next: NextFunction) => {
  try {
    const data = resetPasswordSchema.parse(req.body);
    const result = await resetPassword(data.email, data.new_password);
    res.json({ status: 'success', message: 'Password updated. You can sign in now.', email: result.email });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ status: 'error', message: err.errors[0].message });
      return;
    }
    next(err);
  }
});

router.get('/me', authMiddleware, (req: Request, res: Response) => {
  res.json({ status: 'success', user: req.user });
});

export default router;
