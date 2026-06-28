const { execSync } = require('child_process');
try {
  const output = execSync('git stash 2>&1', { encoding: 'utf8' });
  console.log('=== git stash ===');
  console.log(output || '(no output)');
} catch (err) {
  console.error('ERROR during stash:');
  console.error(err.stdout || err.message);
}
