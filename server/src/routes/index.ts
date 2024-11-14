import { Router } from 'express';
import logs from './logs';

const router = Router();

router.use('/api/logs', logs);

export default router; 