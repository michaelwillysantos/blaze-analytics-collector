'use strict';

const { calculateExposure, rollToColor } = require('./calculations');
const { saveSnapshot, finalizeRound } = require('./database');

const baseUrl = (process.env.BLAZE_BASE_URL || 'https://blaze.bet.br/api').replace(/\/$/, '');
const currentPath = process.env.CURRENT_PATH || '/roulette_games/current';
const recentPath = process.env.RECENT_PATH || '/roulette_games/recent';
const currentPollMs = Math.max(Number(process.env.CURRENT_POLL_MS) || 2000, 1000);
const recentPollMs = Math.max(Number(process.env.RECENT_POLL_MS) || 5000, 2000);
const userAgent = process.env.HTTP_USER_AGENT || 'BlazeAnalyticsCollector/1.0';

let running = false;
let lastCurrentError = null;
let lastRecentError = null;
let currentTimer = null;
let recentTimer = null;

async function fetchJson(pathname) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`${baseUrl}${pathname}`, {
      headers: {
        accept: 'application/json',
        'user-agent': userAgent
      },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} em ${pathname}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function collectCurrent() {
  try {
    const current = await fetchJson(currentPath);
    if (!current || current.id == null) throw new Error('Resposta da rodada atual sem ID');
    const exposure = calculateExposure(current);
    await saveSnapshot(current, exposure);
    lastCurrentError = null;
    console.log(`[current] rodada=${current.id} status=${current.status} favorito=${exposure.favoriteColor}`);
  } catch (error) {
    lastCurrentError = error.message;
    console.error('[current] erro:', error.message);
  }
}

async function collectRecent() {
  try {
    const recent = await fetchJson(recentPath);
    if (!Array.isArray(recent)) throw new Error('Resposta de recentes não é uma lista');
    for (const round of recent) {
      const color = rollToColor(round.roll);
      if (round?.id != null && color) await finalizeRound(round, color);
    }
    lastRecentError = null;
    console.log(`[recent] ${recent.length} resultados sincronizados`);
  } catch (error) {
    lastRecentError = error.message;
    console.error('[recent] erro:', error.message);
  }
}

function schedule(task, interval) {
  let busy = false;
  return setInterval(async () => {
    if (busy) return;
    busy = true;
    try { await task(); } finally { busy = false; }
  }, interval);
}

async function startCollector() {
  if (running) return;
  running = true;
  await Promise.allSettled([collectCurrent(), collectRecent()]);
  currentTimer = schedule(collectCurrent, currentPollMs);
  recentTimer = schedule(collectRecent, recentPollMs);
  console.log(`Coletor iniciado: current=${currentPollMs}ms recent=${recentPollMs}ms`);
}

function stopCollector() {
  if (currentTimer) clearInterval(currentTimer);
  if (recentTimer) clearInterval(recentTimer);
  running = false;
}

function collectorStatus() {
  return { running, baseUrl, currentPollMs, recentPollMs, lastCurrentError, lastRecentError };
}

module.exports = { startCollector, stopCollector, collectorStatus };
