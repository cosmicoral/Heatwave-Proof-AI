const { execSync } = require('child_process');
try {
  const output = execSync('git fetch HeatProof-AI 2>&1', { encoding: 'utf8' });
  console.log('=== git fetch HeatProof-AI ===');
  console.log(output || '(no output — fetch completed successfully)');
} catch (err) {
  console.error('ERROR during fetch:');
  console.error(err.stdout || err.message);
}
