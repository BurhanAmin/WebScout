const {
  getApiCommits, getApiEndpointStats,
  getBuildCommits, getBuildStats,
  insertRegression, clearRegressions,
} = require('./db');

const LATENCY_THRESHOLD = 0.20; // flag if >20% slower than baseline
const WEIGHT_THRESHOLD = 0.20;  // flag if >20% heavier than baseline
const BASELINE_WINDOW = 5;      // compare against the last 5 builds

function mean(nums) {
  const valid = nums.filter((n) => typeof n === 'number' && !isNaN(n));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function detectRegressions() {
  clearRegressions(); // recompute fresh each run
  const found = [];

  // ---------- API latency + new errors ----------
  const apiCommits = getApiCommits(); // oldest -> newest
  if (apiCommits.length >= 2) {
    const latest = apiCommits[apiCommits.length - 1];
    const baseline = apiCommits.slice(-1 - BASELINE_WINDOW, -1); // up to N before latest

    // Baseline per-endpoint: collect latencies + whether it ever errored
    const baseByPath = {};
    baseline.forEach((c) => {
      getApiEndpointStats(c.commit_hash).forEach((s) => {
        if (!baseByPath[s.path]) baseByPath[s.path] = { latencies: [], errored: false };
        baseByPath[s.path].latencies.push(s.avg_ms);
        if (s.errors > 0) baseByPath[s.path].errored = true;
      });
    });

    getApiEndpointStats(latest.commit_hash).forEach((s) => {
      const base = baseByPath[s.path];

      // Latency spike vs baseline average for this endpoint
      if (base) {
        const baseAvg = mean(base.latencies);
        if (baseAvg && s.avg_ms > baseAvg * (1 + LATENCY_THRESHOLD)) {
          const changePct = ((s.avg_ms - baseAvg) / baseAvg) * 100;
          found.push({
            kind: 'latency', target: s.path,
            baseline: baseAvg, latest: s.avg_ms, change_pct: changePct,
            detail: `Latency up ${changePct.toFixed(0)}% on ${s.path}`,
            commit_hash: latest.commit_hash,
          });
        }
      }

      // New errors: errors now, but endpoint was clean (or absent) in baseline
      if (s.errors > 0 && (!base || !base.errored)) {
        found.push({
          kind: 'error', target: s.path,
          baseline: 0, latest: s.errors, change_pct: null,
          detail: `New errors on ${s.path} (${s.errors} failed request(s))`,
          commit_hash: latest.commit_hash,
        });
      }
    });
  }

  // ---------- Lighthouse build metrics ----------
  const buildCommits = getBuildCommits();
  if (buildCommits.length >= 2) {
    const latest = buildCommits[buildCommits.length - 1];
    const baseline = buildCommits.slice(-1 - BASELINE_WINDOW, -1);
    const l = getBuildStats(latest.commit_hash);

    const checks = [
      ['FCP', l.fcp, mean(baseline.map((c) => getBuildStats(c.commit_hash).fcp)), LATENCY_THRESHOLD, 'latency'],
      ['LCP', l.lcp, mean(baseline.map((c) => getBuildStats(c.commit_hash).lcp)), LATENCY_THRESHOLD, 'latency'],
      ['TTI', l.tti, mean(baseline.map((c) => getBuildStats(c.commit_hash).tti)), LATENCY_THRESHOLD, 'latency'],
      ['page_weight', l.total_bytes, mean(baseline.map((c) => getBuildStats(c.commit_hash).total_bytes)), WEIGHT_THRESHOLD, 'page_weight'],
    ];

    checks.forEach(([name, latestVal, baseVal, threshold, kind]) => {
      if (baseVal && latestVal > baseVal * (1 + threshold)) {
        const changePct = ((latestVal - baseVal) / baseVal) * 100;
        found.push({
          kind, target: name,
          baseline: baseVal, latest: latestVal, change_pct: changePct,
          detail: `${name} up ${changePct.toFixed(0)}% vs baseline`,
          commit_hash: latest.commit_hash,
        });
      }
    });
  }

  const now = new Date().toISOString();
  found.forEach((r) => insertRegression({ ...r, detected_at: now }));
  return found;
}

module.exports = { detectRegressions };