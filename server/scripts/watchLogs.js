const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, '../logs/combined.log');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Create log file if it doesn't exist
if (!fs.existsSync(logFile)) {
  fs.writeFileSync(logFile, '');
}

console.log('Watching for logs...');

// Watch the log file
fs.watchFile(logFile, { interval: 1000 }, (curr, prev) => {
  if (curr.mtime !== prev.mtime) {
    const content = fs.readFileSync(logFile, 'utf8');
    const lines = content.split('\n');
    const newLines = lines.slice(-10); // Show last 10 lines
    console.clear();
    console.log('Latest logs:');
    console.log('------------');
    newLines.forEach(line => {
      if (line.trim()) {
        try {
          const parsed = JSON.parse(line);
          console.log(`[${parsed.timestamp}] ${parsed.level}: ${parsed.message}`);
          if (parsed.data) {
            console.log('Data:', parsed.data);
          }
        } catch {
          console.log(line);
        }
      }
    });
  }
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  fs.unwatchFile(logFile);
  process.exit();
}); 