import { Groq } from 'groq-sdk';
import { logger, LogCategory } from '../../utils/logger';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages } = req.body;

    logger.debug(LogCategory.ANALYTICS, 'Processing Groq request', {
      messageCount: messages.length
    });

    const completion = await groq.chat.completions.create({
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      model: 'llama2-70b-4096',
      temperature: 0.7,
      max_tokens: 1000,
      top_p: 1,
      stream: false,
    });

    logger.debug(LogCategory.ANALYTICS, 'Groq response received', {
      usage: completion.usage
    });

    return res.status(200).json({
      response: completion.choices[0].message.content
    });
  } catch (error) {
    logger.error(LogCategory.ANALYTICS, 'Error in Groq API', error);
    return res.status(500).json({
      error: 'Failed to get response from Groq'
    });
  }
} 