import { Router } from 'express';
import health from './health.js';
import users from './users.js';
import likes from './likes.js';
import matches from './matches.js';
import messages from './messages.js';

const r = Router();
r.use('/health', health);
r.use('/users', users);
r.use('/likes', likes);
r.use('/matches', matches);
r.use('/messages', messages);
export default r;
