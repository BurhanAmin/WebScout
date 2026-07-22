const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

// Create a .wpd folder inside the project being monitored (like .git)
const wpdDir = path.join(process.cwd(), '.wpd');
if (!fs.existsSync(wpdDir)) {
  fs.mkdirSync(wpdDir);
}

// Open (or create) the SQLite database file inside .wpd
const db = new DatabaseSync(path.join(wpdDir, 'metrics.db'));

// --- Tables ---
db.exec(`
  CREATE TABLE IF NOT EXISTS api_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    method TEXT,
    path TEXT,
    status INTEGER,
    duration_ms REAL,
    commit_hash TEXT,
    timestamp TEXT
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS client_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT,
    path TEXT,
    url TEXT,
    status INTEGER,
    fcp REAL,
    load_time REAL,
    duration_ms REAL,
    commit_hash TEXT,
    timestamp TEXT
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS build_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT,
    fcp REAL,
    lcp REAL,
    tti REAL,
    total_bytes REAL,
    perf_score REAL,
    commit_hash TEXT,
    timestamp TEXT
  )
`);

// --- Prepared statements ---
const insertStmt = db.prepare(`
  INSERT INTO api_metrics (method, path, status, duration_ms, commit_hash, timestamp)
  VALUES (?, ?, ?, ?, ?, ?)
`);
const recentStmt = db.prepare(`SELECT * FROM api_metrics ORDER BY id DESC LIMIT 20`);

const insertClientStmt = db.prepare(`
  INSERT INTO client_events (type, path, url, status, fcp, load_time, duration_ms, commit_hash, timestamp)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const recentClientStmt = db.prepare(`SELECT * FROM client_events ORDER BY id DESC LIMIT 20`);

const insertBuildStmt = db.prepare(`
  INSERT INTO build_metrics (url, fcp, lcp, tti, total_bytes, perf_score, commit_hash, timestamp)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
const recentBuildStmt = db.prepare(`SELECT * FROM build_metrics ORDER BY id DESC LIMIT 20`);

// --- Functions ---
function logMetric(m) {
  insertStmt.run(m.method, m.path, m.status, m.duration_ms, m.commit_hash, m.timestamp);
}
function getRecentMetrics() {
  return recentStmt.all();
}

function logClientEvent(e, commitHash) {
  insertClientStmt.run(
    e.type ?? null,
    e.path ?? null,
    e.url ?? null,
    e.status ?? null,
    e.fcp ?? null,
    e.loadTime ?? null,
    e.duration_ms ?? null,
    commitHash,
    e.timestamp ?? new Date().toISOString()
  );
}
function getRecentClientEvents() {
  return recentClientStmt.all();
}

function logBuildMetric(b) {
  insertBuildStmt.run(b.url, b.fcp, b.lcp, b.tti, b.total_bytes, b.perf_score, b.commit_hash, b.timestamp);
}
function getRecentBuildMetrics() {
  return recentBuildStmt.all();
}
// --- Regression detection: a table to store flagged regressions ---
db.exec(`
  CREATE TABLE IF NOT EXISTS regressions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT,
    target TEXT,
    baseline REAL,
    latest REAL,
    change_pct REAL,
    detail TEXT,
    commit_hash TEXT,
    detected_at TEXT
  )
`);

// Distinct commits, oldest -> newest, for each data source
const apiCommitsStmt = db.prepare(`
  SELECT commit_hash, MAX(timestamp) AS last_seen
  FROM api_metrics GROUP BY commit_hash ORDER BY last_seen ASC
`);
const buildCommitsStmt = db.prepare(`
  SELECT commit_hash, MAX(timestamp) AS last_seen
  FROM build_metrics GROUP BY commit_hash ORDER BY last_seen ASC
`);

// Per-endpoint stats for one commit: avg latency, request count, error count
const apiEndpointStatsStmt = db.prepare(`
  SELECT path,
         AVG(duration_ms) AS avg_ms,
         COUNT(*)         AS total,
         SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) AS errors
  FROM api_metrics WHERE commit_hash = ? GROUP BY path
`);

// Lighthouse averages for one commit
const buildStatsStmt = db.prepare(`
  SELECT AVG(fcp) AS fcp, AVG(lcp) AS lcp, AVG(tti) AS tti, AVG(total_bytes) AS total_bytes
  FROM build_metrics WHERE commit_hash = ?
`);

// Regression storage
const insertRegressionStmt = db.prepare(`
  INSERT INTO regressions (kind, target, baseline, latest, change_pct, detail, commit_hash, detected_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
const getRegressionsStmt = db.prepare(`SELECT * FROM regressions ORDER BY id DESC LIMIT 50`);
const clearRegressionsStmt = db.prepare(`DELETE FROM regressions`);

function getApiCommits() { return apiCommitsStmt.all(); }
function getBuildCommits() { return buildCommitsStmt.all(); }
function getApiEndpointStats(commit) { return apiEndpointStatsStmt.all(commit); }
function getBuildStats(commit) { return buildStatsStmt.get(commit); }
function insertRegression(r) {
  insertRegressionStmt.run(r.kind, r.target, r.baseline, r.latest, r.change_pct ?? null, r.detail, r.commit_hash, r.detected_at);
}
function getRegressions() { return getRegressionsStmt.all(); }
function clearRegressions() { clearRegressionsStmt.run(); }
// --- Exports (must be last, after everything is defined) ---
module.exports = {
  logMetric, getRecentMetrics,
  logClientEvent, getRecentClientEvents,
  logBuildMetric, getRecentBuildMetrics,
  getApiCommits, getBuildCommits, getApiEndpointStats, getBuildStats,
  insertRegression, getRegressions, clearRegressions,
};