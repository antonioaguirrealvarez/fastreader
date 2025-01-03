import express from 'express';
import cors from 'cors';
import logsRouter from './routes/logs/spritzLogs';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.use('/api/logs', logsRouter);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 