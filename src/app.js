import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';

import healthRouter from './routes/health.js';
import usersRouter from './routes/users.js';
import likesRouter from './routes/likes.js';
import matchesRouter from './routes/matches.js';
import messagesRouter from './routes/messages.js';
import { errorHandler } from './middlewares/error.js';

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

const limiter = rateLimit({ windowMs: 60_000, max: 120 });
app.use(limiter);

// Routes
app.use('/health', healthRouter);
app.use('/users', usersRouter);
app.use('/likes', likesRouter);
app.use('/matches', matchesRouter);
app.use('/messages', messagesRouter);

// 404
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Error
app.use(errorHandler);

export default app;
