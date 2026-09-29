/* eslint-disable no-empty */
import http from 'http';
import app from './src/app.js';
import dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.PORT || 8080;
const server = http.createServer(app);

try {
  const { Server } = await import('socket.io');
  const io = new Server(server, { cors: { origin: process.env.CORS_ORIGIN || '*' } });
  io.on('connection', s => console.log('socket connected', s.id));
} catch {}

server.listen(PORT, () => console.log(`[BOOT] API listening on http://localhost:${PORT}`));
