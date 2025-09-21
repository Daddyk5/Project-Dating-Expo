import { registerLike } from '../services/match.service.js';

export async function likeUser(req, res, next) {
  try {
    const { targetUid } = req.params;
    if (!targetUid) return res.status(400).json({ error: 'targetUid required' });
    if (targetUid === req.user.uid) return res.status(400).json({ error: "Can't like yourself" });

    const result = await registerLike(req.user.uid, targetUid);
    res.json(result); // { matched:boolean, matchId?:string }
  } catch (e) {
    next(e);
  }
}
