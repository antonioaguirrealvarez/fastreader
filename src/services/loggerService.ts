const API_URL = 'http://localhost:3001/api';

export const loggerService = {
  log: async (level: string, message: string, data?: any) => {
    try {
      const response = await fetch(`${API_URL}/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          level,
          message,
          data,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.warn('Failed to send log to server, logging to console instead:', {
        level,
        message,
        data,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  analyzeSpritzWord: async (word: string, analysis: {
    cleanWord: string;
    orpPosition: number;
    focusLetter: string;
    beforeLength: number;
    afterLength: number;
    processingTime: number;
  }) => {
    try {
      const response = await fetch(`${API_URL}/logs/spritz/analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          word,
          analysis,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.warn('Failed to log Spritz analysis:', {
        word,
        analysis,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  analyzeFile: async (content: string, fileName: string) => {
    try {
      const response = await fetch(`${API_URL}/logs/upload/analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          fileName,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.warn('Failed to analyze file on server, analyzing locally:', {
        fileName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        fileName,
        totalLength: content.length,
        wordCount: content.split(/\s+/).length,
        lineCount: content.split('\n').length,
        paragraphCount: content.split('\n\n').length,
        timestamp: new Date().toISOString(),
        analyzedLocally: true
      };
    }
  }
}; 