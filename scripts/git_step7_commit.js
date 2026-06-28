const { execSync } = require('child_process');
const commitMsg = 'feat: add HeatwaveProof contract, QuickDApp frontend, and README';

try {
  // First try a normal commit
  const output = execSync(`git commit -m "${commitMsg}" 2>&1`, { encoding: 'utf8' });
  console.log('=== git commit ===');
  console.log(output);
} catch (err) {
  const msg = err.stdout || err.message || '';
  console.log('=== git commit (first attempt) ===');
  console.log(msg);

  // If nothing to commit, use --allow-empty
  if (msg.includes('nothing to commit') || msg.includes('nothing added to commit')) {
    console.log('Nothing to commit — retrying with --allow-empty...');
    try {
      const output2 = execSync(`git commit --allow-empty -m "${commitMsg}" 2>&1`, { encoding: 'utf8' });
      console.log('=== git commit --allow-empty ===');
      console.log(output2);
    } catch (err2) {
      console.error('ERROR during --allow-empty commit:');
      console.error(err2.stdout || err2.message);
    }
  } else {
    console.error('Unexpected commit error — see output above.');
  }
}
