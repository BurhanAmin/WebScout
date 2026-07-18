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

module.exports = { logMetric, getRecentMetrics };