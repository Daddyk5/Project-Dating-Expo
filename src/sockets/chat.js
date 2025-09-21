import { chatIdFor, listMessages, sendMessage } from '../services/message.service.js';
import { db } from '../config/firebase.js';
import admin from 'firebase-admin';

function validUid(v) { return typeof v === 'string' && v.length >= 3; }
function validText(v) { return typeof v === 'string' && v.trim().length > 0; }

export default function registerChatHandlers(io, socket) {
  const uid = socket.user?.uid;
  if (!uid) {
    socket.emit('error', { message: 'Unauthorized socket (no uid)' });
    socket.disconnect(true);
    return;
  }

  const joinRoom = (otherUid) => {
    const room = chatIdFor(uid, otherUid);
    socket.join(room);
    return room;
  };

  socket.on('chat:join', async ({ otherUid }) => {
    try {
      if (!validUid(otherUid)) throw new Error('Invalid otherUid');
      const room = joinRoom(otherUid);
      const history = await listMessages(uid, otherUid, 30);
      socket.emit('chat:history', history);
      socket.to(room).emit('chat:presence', { uid, online: true });
    } catch (e) {
      socket.emit('error', { message: e.message });
    }
  });

  socket.on('chat:send', async ({ toUid, text }) => {
    try {
      if (!validUid(toUid)) throw new Error('Invalid toUid');
      if (!validText(text)) throw new Error('Message text required');
      const msg = await sendMessage({ fromUid: uid, toUid, text: text.trim() });
      io.to(chatIdFor(uid, toUid)).emit('chat:message', msg);
    } catch (e) {
      socket.emit('error', { message: e.message });
    }
  });

  socket.on('chat:typing', ({ otherUid, isTyping }) => {
    try {
      if (!validUid(otherUid)) throw new Error('Invalid otherUid');
      socket.to(chatIdFor(uid, otherUid)).emit('chat:typing', { fromUid: uid, isTyping: !!isTyping });
    } catch (e) {
      socket.emit('error', { message: e.message });
    }
  });

  socket.on('chat:read', async ({ otherUid, messageIds = [] }) => {
    try {
      if (!validUid(otherUid)) throw new Error('Invalid otherUid');
      const room = chatIdFor(uid, otherUid);
      const metaRef = db.collection('chats').doc(room).collection('meta').doc(uid);
      const now = admin.firestore.FieldValue.serverTimestamp();
      await metaRef.set({ lastReadAt: now, lastReadIds: messageIds }, { merge: true });
      socket.to(room).emit('chat:read', { byUid: uid, messageIds, at: Date.now() });
    } catch (e) {
      socket.emit('error', { message: e.message });
    }
  });

  socket.on('disconnect', () => {
    for (const room of socket.rooms) {
      if (room !== socket.id) {
        socket.to(room).emit('chat:presence', { uid, online: false });
      }
    }
  });
}
