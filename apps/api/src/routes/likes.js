import { Router } from 'express';
import { likeUser } from '../controllers/likes.controller.js';

const router = Router();

// POST /likes/:targetUid
router.post('/:targetUid', likeUser);

export default router;
