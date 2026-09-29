import { Server } from 'socket.io';
import registerChatHandlers from './chat.js';

export function attachSocket(server, corsOrigin = '*') {
  const io = new Server(server, {
    cors: { origin: corsOrigin, methods: ['GET', 'POST'] },
  });

  io.use((socket, next) => {
    const user = socket.handshake.auth?.user;
    if (user?.uid) {
      socket.user = user;
    }
    next();
  });

  io.on('connection', (socket) => {
    registerChatHandlers(io, socket);
  });

  return io;
}
