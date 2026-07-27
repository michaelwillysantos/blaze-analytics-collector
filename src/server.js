'use strict';

const express = require('express');
const cors = require('cors');
const { initializeDatabase, getLatestRounds, getRoundById, getStats, pool } = require('./database');
const { startCollector, stopCollector, collectorStatus } = require('./collector');

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ name: 'Blaze Analytics Collector', status: 'online', endpoints: ['/health', '/api/stats', '/api/rounds'] });
});

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, database: 'connected', collector: collectorStatus(), time: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ ok: false, database: 'error', message: error.message, collector: collectorStatus() });
  }
});

app.get('/api/stats', async (_req, res, next) => {
  try { res.json(await getStats()); } catch (error) { next(error); }
});

app.get('/api/rounds', async (req, res, next) => {
  try { res.json(await getLatestRounds(req.query.limit)); } catch (error) { next(error); }
});

app.get('/api/rounds/:id', async (req, res, next) => {
  try {
    const round = await getRoundById(req.params.id);
    if (!round) return res.status(404).json({ error: 'Rodada não encontrada' });
    res.json(round);
  } catch (error) { next(error); }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Erro interno', message: error.message });
});

async function main() {
  await initializeDatabase();
  await startCollector();
  app.listen(port, '0.0.0.0', () => console.log(`API ouvindo na porta ${port}`));
}

async function shutdown(signal) {
  console.log(`Encerrando por ${signal}...`);
  stopCollector();
  await pool.end();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

main().catch((error) => {
  console.error('Falha ao iniciar:', error);
  process.exit(1);
});
