const { execSync } = require('child_process');
try {
  const output = execSync('git add -A 2>&1', { encoding: 'utf8' });
  console.log('=== git add -A ===');
  console.log(output || '(all files staged successfully — no output is normal)');

  // Show what's staged
  const staged = execSync('git status --short 2>&1', { encoding: 'utf8' });
  console.log('--- Staged files (git status --short) ---');
  console.log(staged || '(nothing to show)');
} catch (err) {
  console.error('ERROR during git add -A:');
  console.error(err.stdout || err.message);
}
