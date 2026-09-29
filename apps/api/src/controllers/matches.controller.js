import { getMatches } from '../services/match.service.js';

export async function list(req, res, next) {
  try {
    const items = await getMatches(req.user.uid);
    res.json(items);
  } catch (e) {
    next(e);
  }
}
