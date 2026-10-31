import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { apiRouter } from './backend';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Mount Central Backend API
app.use('/api', apiRouter);

// Serve built frontend assets in production
const distDir = path.resolve(__dirname, '../dist');
app.use(express.static(distDir));

// Fallback to index.html for SPA routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Card Backend] Central server running at http://0.0.0.0:${PORT}`);
  console.log(`[Card Backend] API accessible at http://0.0.0.0:${PORT}/api/card`);
});
