const { execSync } = require('child_process');
const { getRegressions, getAllCommitsOrdered } = require('./db');

// Show whole-repo changes but hide dependency/database noise
const EXCLUDE =
  '":(top)" ":(top,glob,exclude)**/node_modules/**" ":(top,glob,exclude)**/.wpd/**"';

function git(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function blameForCommit(flaggedCommit) {
  const commits = getAllCommitsOrdered(); // oldest -> newest
  const idx = commits.findIndex((c) => c.commit_hash === flaggedCommit);
  const lastGood = idx > 0 ? commits[idx - 1].commit_hash : null;

  let suspects, files;
  if (lastGood) {
    const range = `${lastGood}..${flaggedCommit}`;
    suspects = git(`git log --pretty=format:"%h %s (%an)" ${range}`);
    files = git(`git diff --stat ${range} -- ${EXCLUDE}`);
  } else {
    suspects = git(`git show -s --pretty=format:"%h %s (%an)" ${flaggedCommit}`);
    files = git(`git show --stat --pretty=format:"" ${flaggedCommit} -- ${EXCLUDE}`);
  }

  return { flaggedCommit, lastGood, suspects, files };
}

function blameAll() {
  const regressions = getRegressions();
  const byCommit = {};
  regressions.forEach((r) => {
    (byCommit[r.commit_hash] = byCommit[r.commit_hash] || []).push(r);
  });
  return Object.keys(byCommit).map((commit) => ({
    ...blameForCommit(commit),
    regressions: byCommit[commit],
  }));
}

module.exports = { blameAll, blameForCommit };