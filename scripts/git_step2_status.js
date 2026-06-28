const { execSync } = require('child_process');
try {
  const output = execSync('git status 2>&1', { encoding: 'utf8' });
  console.log('=== git status ===');
  console.log(output);
} catch (err) {
  console.error('ERROR during status:');
  console.error(err.stdout || err.message);
}
