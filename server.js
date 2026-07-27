'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não configurada. Crie o PostgreSQL e adicione a variável no Railway.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000
});

async function initializeDatabase() {
  const schemaPath = path.join(__dirname, '..', 'sql', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(schema);
}

async function saveSnapshot(round, exposure) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO rounds (
        round_id, status, started_at, last_seen_at,
        total_red_bet, total_black_bet, total_white_bet, total_bet,
        house_red, house_black, house_white,
        favorite_color, favorite_value, financial_difference, updated_at
      ) VALUES ($1,$2,$3,NOW(),$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
      ON CONFLICT (round_id) DO UPDATE SET
        status = EXCLUDED.status,
        started_at = COALESCE(rounds.started_at, EXCLUDED.started_at),
        last_seen_at = NOW(),
        total_red_bet = EXCLUDED.total_red_bet,
        total_black_bet = EXCLUDED.total_black_bet,
        total_white_bet = EXCLUDED.total_white_bet,
        total_bet = EXCLUDED.total_bet,
        house_red = EXCLUDED.house_red,
        house_black = EXCLUDED.house_black,
        house_white = EXCLUDED.house_white,
        favorite_color = EXCLUDED.favorite_color,
        favorite_value = EXCLUDED.favorite_value,
        financial_difference = EXCLUDED.financial_difference,
        updated_at = NOW()`,
      [
        String(round.id), round.status ?? null, round.created_at ?? null,
        exposure.red, exposure.black, exposure.white, exposure.total,
        exposure.houseRed, exposure.houseBlack, exposure.houseWhite,
        exposure.favoriteColor, exposure.favoriteValue, exposure.financialDifference
      ]
    );

    await client.query(
      `INSERT INTO snapshots (
        round_id, status, total_red_bet, total_black_bet, total_white_bet,
        total_bet, house_red, house_black, house_white,
        favorite_color, favorite_value, financial_difference
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        String(round.id), round.status ?? null,
        exposure.red, exposure.black, exposure.white, exposure.total,
        exposure.houseRed, exposure.houseBlack, exposure.houseWhite,
        exposure.favoriteColor, exposure.favoriteValue, exposure.financialDifference
      ]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function finalizeRound(recent, resultColor) {
  await pool.query(
    `INSERT INTO rounds (round_id, roll, result_color, closed_at, finalized, first_seen_at, last_seen_at, updated_at)
     VALUES ($1,$2,$3,$4,TRUE,NOW(),NOW(),NOW())
     ON CONFLICT (round_id) DO UPDATE SET
       roll = EXCLUDED.roll,
       result_color = EXCLUDED.result_color,
       closed_at = COALESCE(EXCLUDED.closed_at, rounds.closed_at, NOW()),
       finalized = TRUE,
       updated_at = NOW()`,
    [String(recent.id), Number(recent.roll), resultColor, recent.created_at ?? recent.updated_at ?? null]
  );
}

async function getLatestRounds(limit = 50) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 500);
  const { rows } = await pool.query(
    `SELECT * FROM rounds
     ORDER BY COALESCE(closed_at, last_seen_at) DESC
     LIMIT $1`,
    [safeLimit]
  );
  return rows;
}

async function getRoundById(roundId) {
  const roundResult = await pool.query('SELECT * FROM rounds WHERE round_id = $1', [String(roundId)]);
  if (!roundResult.rows[0]) return null;
  const snapshotResult = await pool.query(
    'SELECT * FROM snapshots WHERE round_id = $1 ORDER BY captured_at ASC',
    [String(roundId)]
  );
  return { ...roundResult.rows[0], snapshots: snapshotResult.rows };
}

async function getStats() {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*)::int AS rounds_total,
      COUNT(*) FILTER (WHERE finalized)::int AS rounds_finalized,
      (SELECT COUNT(*)::int FROM snapshots) AS snapshots_total,
      MAX(updated_at) AS last_update
    FROM rounds
  `);
  return rows[0];
}

module.exports = {
  pool,
  initializeDatabase,
  saveSnapshot,
  finalizeRound,
  getLatestRounds,
  getRoundById,
  getStats
};
