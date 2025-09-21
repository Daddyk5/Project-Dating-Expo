import { db } from '../config/firebase.js';
import admin from 'firebase-admin';

export async function me(req, res) {
  const snap = await db.collection('users').doc(req.user.uid).get();
  res.json({ uid: req.user.uid, ...snap.data() });
}

export async function updateMe(req, res) {
  const allowed = ['name', 'age', 'bio', 'photos', 'interests', 'city', 'country'];
  const payload = {};
  for (const k of allowed) if (req.body[k] !== undefined) payload[k] = req.body[k];

  await db.collection('users').doc(req.user.uid).set(
    { ...payload, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true }
  );
  res.json({ ok: true });
}

export async function discover(req, res) {
  const { city, limit = 20 } = req.query;
  let q = db.collection('users');
  if (city) q = q.where('city', '==', city);
  const snaps = await q.limit(Number(limit)).get();
  const users = snaps.docs
    .map(d => ({ uid: d.id, ...d.data() }))
    .filter(u => u.uid !== req.user.uid);
  res.json({ users });
}
