'use strict';

const express = require('express');
const cors = require('cors');
const { calculateExposure, rollToColor } = require('./calculations');
const { initializeDatabase, saveSnapshot, finalizeRound, getLatestRounds, getRoundById, getStats, pool } = require('./database');
const { startCollector, stopCollector, collectorStatus } = require('./collector');

const app = express();
const port = Number(process.env.PORT) || 3000;
const ingestToken = String(process.env.INGEST_TOKEN || '');

app.use(cors());
app.use(express.json({ limit: '1mb' }));

function requireIngestToken(req, res, next) {
  if (!ingestToken) return res.status(503).json({ error: 'INGEST_TOKEN não configurado no Railway' });
  const supplied = String(req.get('x-ingest-token') || '');
  if (supplied !== ingestToken) return res.status(401).json({ error: 'Token de ingestão inválido' });
  next();
}

app.get('/', (_req, res) => res.json({
  name: 'Blaze Analytics Collector', version: '1.1.0', status: 'online',
  mode: 'extension-ingest', endpoints: ['/health','/api/stats','/api/rounds','/api/ingest/snapshot','/api/ingest/result']
}));

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, database: 'connected', ingestReady: Boolean(ingestToken), collector: collectorStatus(), time: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ ok: false, database: 'error', message: error.message, collector: collectorStatus() });
  }
});

app.post('/api/ingest/snapshot', requireIngestToken, async (req, res, next) => {
  try {
    const current = req.body;
    if (!current || current.id == null) return res.status(400).json({ error: 'Snapshot sem ID de rodada' });
    const exposure = calculateExposure(current);
    await saveSnapshot(current, exposure, 'extension');
    res.status(202).json({ ok: true, roundId: String(current.id), favoriteColor: exposure.favoriteColor });
  } catch (error) { next(error); }
});

app.post('/api/ingest/result', requireIngestToken, async (req, res, next) => {
  try {
    const result = req.body;
    if (!result || result.id == null) return res.status(400).json({ error: 'Resultado sem ID de rodada' });
    const color = rollToColor(result.roll);
    if (!color) return res.status(400).json({ error: 'Roll inválido' });
    await finalizeRound(result, color, 'extension');
    res.status(202).json({ ok: true, roundId: String(result.id), resultColor: color });
  } catch (error) { next(error); }
});

app.get('/api/stats', async (_req, res, next) => { try { res.json(await getStats()); } catch (e) { next(e); } });
app.get('/api/rounds', async (req, res, next) => { try { res.json(await getLatestRounds(req.query.limit)); } catch (e) { next(e); } });
app.get('/api/rounds/:id', async (req, res, next) => {
  try {
    const round = await getRoundById(req.params.id);
    if (!round) return res.status(404).json({ error: 'Rodada não encontrada' });
    res.json(round);
  } catch (e) { next(e); }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Erro interno', message: error.message });
});

async function main() {
  await initializeDatabase();
  await startCollector();
  app.listen(port, '0.0.0.0', () => console.log(`API 1.1 ouvindo na porta ${port}; modo extension-ingest`));
}

async function shutdown(signal) {
  console.log(`Encerrando por ${signal}...`);
  stopCollector();
  await pool.end();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
main().catch(error => { console.error('Falha ao iniciar:', error); process.exit(1); });
