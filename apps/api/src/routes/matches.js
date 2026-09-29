import { Router } from 'express';
import { list } from '../controllers/matches.controller.js';

const router = Router();

// GET /matches
router.get('/', list);

export default router;
