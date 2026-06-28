const { execSync } = require('child_process');
try {
  const output = execSync('git push HeatProof-AI HEAD 2>&1', { encoding: 'utf8' });
  console.log('=== git push HeatProof-AI HEAD ===');
  console.log(output || '(push completed — no output)');
} catch (err) {
  const msg = err.stdout || err.message || '';
  console.error('ERROR during push:');
  console.error(msg);
}
