const { execSync } = require('child_process');
try {
  // Configure git identity in case it's needed for merge commits
  execSync('git config user.email "remix@remix.ethereum.org" 2>&1', { encoding: 'utf8' });
  execSync('git config user.name "Remix IDE" 2>&1', { encoding: 'utf8' });

  const output = execSync(
    'git pull HeatProof-AI HEAD --allow-unrelated-histories --no-rebase 2>&1',
    { encoding: 'utf8' }
  );
  console.log('=== git pull HeatProof-AI HEAD --allow-unrelated-histories --no-rebase ===');
  console.log(output);
} catch (err) {
  const out = err.stdout || err.message || '';
  console.error('ERROR during pull:');
  console.error(out);

  // Check for merge conflicts
  try {
    const conflictCheck = execSync('git diff --name-only --diff-filter=U 2>&1', { encoding: 'utf8' });
    if (conflictCheck.trim()) {
      console.log('CONFLICT FILES DETECTED:');
      console.log(conflictCheck);
      console.log('Resolving conflicts by keeping OUR version (git checkout --ours .)...');
      execSync('git checkout --ours . 2>&1', { encoding: 'utf8' });
      console.log('Conflicts resolved — ours kept.');
    }
  } catch (conflictErr) {
    console.error('Could not check/resolve conflicts:', conflictErr.message);
  }
}
