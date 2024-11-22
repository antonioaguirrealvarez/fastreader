import express from 'express';
import { LogEntry } from '../../types/logs';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const logEntry: LogEntry = {
      level: req.body.level,
      message: req.body.message,
      timestamp: new Date(),
      data: req.body.data
    };

    // Log to console for development
    console.log(`[${logEntry.timestamp.toISOString()}] ${logEntry.level.toUpperCase()}: ${logEntry.message}`);
    if (logEntry.data) {
      console.log('Data:', JSON.stringify(logEntry.data, null, 2));
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error logging:', error);
    res.status(500).json({ success: false, error: 'Failed to log message' });
  }
});

export default router; 