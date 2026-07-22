const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { logBuildMetric } = require('./db');

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates = {
    darwin: [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ],
    linux: ['/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium', '/usr/bin/brave-browser'],
    win32: [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ],
  };
  const list = candidates[process.platform] || [];
  return list.find((p) => fs.existsSync(p)) || null;
}

function getCommitHash() {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'unknown';
  }
}

function runAudit(url) {
  console.log(`Running Lighthouse audit on ${url} ...`);
  const outPath = path.join(os.tmpdir(), `wpd-lh-${Date.now()}.json`);

  const chromePath = findChrome();
  const env = { ...process.env };
  if (chromePath) env.CHROME_PATH = chromePath;

  try {
    execSync(
      `npx lighthouse ${url} --quiet --chrome-flags="--headless" ` +
      `--only-categories=performance --output=json --output-path=${outPath}`,
      { stdio: 'inherit', env }
    );
  } catch (err) {
    console.error('Lighthouse failed. Is a Chromium browser installed and the app running?');
    return;
  }

  const report = JSON.parse(fs.readFileSync(outPath, 'utf8'));
  const a = report.audits;

  const metric = {
    url,
    fcp: a['first-contentful-paint']?.numericValue ?? null,
    lcp: a['largest-contentful-paint']?.numericValue ?? null,
    tti: a['interactive']?.numericValue ?? null,
    total_bytes: a['total-byte-weight']?.numericValue ?? null,
    perf_score: report.categories.performance.score * 100,
    commit_hash: getCommitHash(),
    timestamp: new Date().toISOString(),
  };

  logBuildMetric(metric);
  fs.unlinkSync(outPath);

  console.log('\nStored build metrics:');
  console.log(`  Performance score: ${metric.perf_score.toFixed(0)}`);
  console.log(`  FCP:  ${metric.fcp?.toFixed(0)} ms`);
  console.log(`  LCP:  ${metric.lcp?.toFixed(0)} ms`);
  console.log(`  TTI:  ${metric.tti?.toFixed(0)} ms`);
  console.log(`  Page weight: ${(metric.total_bytes / 1024).toFixed(1)} KB`);
  console.log(`  Commit: ${metric.commit_hash}`);
}

module.exports = { runAudit };