import { db } from '../config/firebase.js';
import { addMessage, ensureUserInMatch } from '../services/match.service.js';

export async function listMessages(req, res, next) {
  try {
    const { matchId } = req.params;

    const allowed = await ensureUserInMatch(req.user.uid, matchId);
    if (!allowed) return res.status(403).json({ error: 'Forbidden' });

    const snap = await db.collection('matches')
      .doc(matchId)
      .collection('messages')
      .orderBy('createdAt', 'asc')
      .limit(100)
      .get();

    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ items });
  } catch (e) {
    next(e);
  }
}

export async function postMessage(req, res, next) {
  try {
    const { matchId } = req.params;
    const { text } = req.body || {};
    if (!text || !text.trim()) return res.status(400).json({ error: 'text required' });

    const allowed = await ensureUserInMatch(req.user.uid, matchId);
    if (!allowed) return res.status(403).json({ error: 'Forbidden' });

    const { id } = await addMessage(matchId, req.user.uid, text.trim());
    res.json({ id, ok: true });
  } catch (e) {
    next(e);
  }
}
