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
    const { getRecentMetrics } = require('../src/db');
    console.table(getRecentMetrics());
  });

program.parse();