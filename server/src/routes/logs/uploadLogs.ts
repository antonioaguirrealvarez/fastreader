import { Router } from 'express';
import winston from 'winston';
import path from 'path';

const router = Router();

// Create a specific logger for file uploads
const uploadLogger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(__dirname, '../../../../logs/upload.log')
    })
  ]
});

router.post('/analysis', (req, res) => {
  const { content, fileName } = req.body;

  const analysis = {
    fileName,
    totalLength: content.length,
    wordCount: content.split(/\s+/).length,
    lineCount: content.split('\n').length,
    paragraphCount: content.split('\n\n').length,
    timestamp: new Date().toISOString()
  };

  uploadLogger.info('File analysis', analysis);
  res.json(analysis);
});

export default router; 