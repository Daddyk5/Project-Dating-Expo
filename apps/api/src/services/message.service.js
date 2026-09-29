import { db } from '../config/firebase.js';
import admin from 'firebase-admin';

export function chatIdFor(a, b) {
  return [a, b].sort().join('_');
}

export async function listMessages(uidA, uidB, limit = 50) {
  const room = chatIdFor(uidA, uidB);
  const snap = await db.collection('chats').doc(room)
    .collection('messages')
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return snap.docs.map(d => ({ id: d.id, ...d.data() })).reverse();
}

export async function sendMessage({ fromUid, toUid, text }) {
  const room = chatIdFor(fromUid, toUid);
  const now = admin.firestore.FieldValue.serverTimestamp();

  const chatRef = db.collection('chats').doc(room);
  const msgRef = await chatRef.collection('messages').add({
    from: fromUid,
    to: toUid,
    text,
    createdAt: now,
    seenBy: [fromUid],
  });

  await chatRef.set({
    updatedAt: now,
    lastMessage: { from: fromUid, to: toUid, text, createdAt: now },
    members: [fromUid, toUid],
  }, { merge: true });

  const snap = await msgRef.get();
  return { id: msgRef.id, ...snap.data() };
}
