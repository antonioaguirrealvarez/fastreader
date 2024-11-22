import { Router } from 'express';
import spritzLogs from './spritzLogs';
import uploadLogs from './uploadLogs';
import logger from '../../config/logger';

const router = Router();

// General logging endpoint
router.post('/', (req, res) => {
  const { level, message, data } = req.body;
  
  logger.log(level, message, {
    ...data,
    timestamp: new Date().toISOString()
  });

  res.json({ success: true });
});

// Mount specific log routes
router.use('/spritz', spritzLogs);
router.use('/upload', uploadLogs);

export default router; 