import { Router } from 'express';
import { listMessages, postMessage } from '../controllers/messages.controller.js';

const router = Router();

// GET /matches/:matchId/messages
router.get('/:matchId/messages', listMessages);

// POST /matches/:matchId/messages
router.post('/:matchId/messages', postMessage);

export default router;
