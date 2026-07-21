const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { logBuildMetric } = require('./db');
 const chromePath = process.env.CHROME_PATH
    || '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';

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

  try {
    execSync(
      `npx lighthouse ${url} --quiet --chrome-flags="--headless" ` +
      `--only-categories=performance --output=json --output-path=${outPath}`,
      { stdio: 'inherit', env: { ...process.env, CHROME_PATH: chromePath } }
    );
  } catch (err) {
    console.error('Lighthouse failed. Is Chrome installed and the app running?');
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