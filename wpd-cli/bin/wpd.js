#!/usr/bin/env node
const { program } = require('commander');
const { spawn, execSync } = require('child_process');
const { startProxy } = require('../src/proxy');

program
  .command('run <command>')
  .description('Run your app under WPD monitoring')
  .option('--target-port <port>', 'Port your app listens on', '4000')
  .option('--proxy-port <port>', 'Port WPD listens on (browse here)', '5050')
  .action((command, options) => {
    const targetPort = parseInt(options.targetPort, 10);
    const proxyPort = parseInt(options.proxyPort, 10);

    // Read the current commit hash of the monitored project (tags every metric)
    let commitHash = 'unknown';
    try {
      commitHash = execSync('git rev-parse --short HEAD').toString().trim();
    } catch (e) {
      // no git repo or no commits yet — fine, leave as 'unknown'
    }

    console.log(`Starting your app: ${command}`);

    // Launch the target app as a child process
    const child = spawn(command, { shell: true, stdio: 'inherit' });

    // Give the app a moment to boot, then put the proxy in front of it
    setTimeout(() => {
      startProxy({ proxyPort, targetPort, commitHash });
    }, 1500);

    // Ctrl+C: shut the app down too
    process.on('SIGINT', () => {
      child.kill();
      process.exit();
    });
  });

program
  .command('stats')
  .description('Show recently logged requests')
  .action(() => {
    const { getRecentMetrics, getRecentClientEvents, getRecentBuildMetrics } = require('../src/db');
    console.log('\n=== API metrics (server-side) ===');
    console.table(getRecentMetrics());
    console.log('\n=== Client events (browser RUM) ===');
    console.table(getRecentClientEvents());
    console.log('\n=== Build metrics (Lighthouse) ===');
    console.table(getRecentBuildMetrics());
  });
program
  .command('audit [url]')
  .description('Run Lighthouse against a URL and store performance metrics')
  .action((url) => {
    const { runAudit } = require('../src/lighthouseRunner');
    runAudit(url || 'http://localhost:4000/');
  });
program
  .command('check')
  .description('Detect regressions vs. the rolling baseline')
  .action(() => {
    const { detectRegressions } = require('../src/regressionDetector');
    const found = detectRegressions();
    if (found.length === 0) {
      console.log('No regressions detected.');
    } else {
      console.log(`${found.length} regression(s) detected:\n`);
      found.forEach((r) => console.log(`  [${r.kind}] ${r.detail}  (commit ${r.commit_hash})`));
    }
  });
program.parse();