import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import * as Users from '../controllers/users.controller.js';

const r = Router();

r.get('/me', requireAuth, Users.me);
r.put('/me', requireAuth, Users.updateMe);
r.get('/discover', requireAuth, Users.discover); // ?city=?&limit=20

export default r;
