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

// Define the table for API request logs (runs safely every launch)
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

// Prepared statements: compiled once, reused. Uses positional ? parameters.
const insertStmt = db.prepare(`
  INSERT INTO api_metrics (method, path, status, duration_ms, commit_hash, timestamp)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const recentStmt = db.prepare(`SELECT * FROM api_metrics ORDER BY id DESC LIMIT 20`);

function logMetric(m) {
  insertStmt.run(m.method, m.path, m.status, m.duration_ms, m.commit_hash, m.timestamp);
}

function getRecentMetrics() {
  return recentStmt.all();
}

const insertClientStmt = db.prepare(`
  INSERT INTO client_events (type, path, url, status, fcp, load_time, duration_ms, commit_hash, timestamp)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const recentClientStmt = db.prepare(`SELECT * FROM client_events ORDER BY id DESC LIMIT 20`);

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

module.exports = { logMetric, getRecentMetrics, logClientEvent, getRecentClientEvents };