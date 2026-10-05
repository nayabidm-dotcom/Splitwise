import express from 'express';
import cors from 'cors';
import api from './routes.js';
import { HttpError } from './errors.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', api);
app.get('/', (req, res) => res.json({ ok: true, service: 'splitwise-api' }));
app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  const status = err instanceof HttpError ? err.status : 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: err.message || 'Server error' });
});
const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => console.log(`API listening on http://0.0.0.0:${PORT}`));