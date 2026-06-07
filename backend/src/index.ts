import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import authRoutes from './routes/auth.routes.js';
import devicesRoutes from './routes/devices.routes.js';
import imagesRoutes from './routes/images.routes.js';
import publicRoutes from './routes/public.routes.js';
import adminRoutes from './routes/admin.routes.js';
import devicePollRoutes from './routes/devicePoll.routes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../../.env') });
dotenv.config({ path: join(__dirname, '../../../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || corsOrigins.includes(origin) || corsOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50 });
const uploadLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'iris-artframe-api' });
});

app.use('/public', publicRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/devices', devicesRoutes);
app.use('/api/images', uploadLimiter, imagesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/device', devicePollRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Iris Art Frame API running on port ${PORT}`);
  console.log(`Public base URL: ${process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`}`);
});

export default app;
