import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { createApi } from './backend.ts';
import { createStore } from './store.ts';

const rootDir = path.resolve(import.meta.dirname, '..');
const distDir = path.join(rootDir, 'dist');
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const store = createStore(rootDir);
await store.init();

const app = createApi(store);

// Built frontend. Hashed assets can be cached; index.html must not be.
app.use(express.static(distDir, { index: false, maxAge: '1y', immutable: true }));
app.get('*', (_req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.sendFile(path.join(distDir, 'index.html'));
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Card Backend] Listening on http://0.0.0.0:${PORT}`);
});

const shutdown = () => {
  server.close(() => {
    store.close().finally(() => process.exit(0));
  });
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
