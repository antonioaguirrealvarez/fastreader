import { Router } from 'express';
import logger from '../config/logger';
import winston from 'winston';
import path from 'path';

const router = Router();

// Create a specific logger for Spritz analysis
const spritzLogger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(__dirname, '../../../logs/spritz.log')
    })
  ]
});

router.post('/log', (req, res) => {
  const { level, message, data } = req.body;
  
  logger.log(level, message, {
    ...data,
    timestamp: new Date().toISOString()
  });

  res.json({ success: true });
});

router.post('/spritz-analysis', (req, res) => {
  const { word, analysis } = req.body;

  const result = {
    word,
    originalLength: word.length,
    ...analysis,
    timestamp: new Date().toISOString()
  };

  // Use the specific Spritz logger
  spritzLogger.info('Spritz word analysis', result);
  res.json(result);
});

router.post('/file-analysis', (req, res) => {
  const { content, fileName } = req.body;

  const analysis = {
    fileName,
    totalLength: content.length,
    wordCount: content.split(/\s+/).length,
    lineCount: content.split('\n').length,
    paragraphCount: content.split('\n\n').length,
    timestamp: new Date().toISOString()
  };

  logger.info('File analysis', analysis);
  res.json(analysis);
});

export default router; 