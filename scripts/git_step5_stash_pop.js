const { execSync } = require('child_process');
try {
  const output = execSync('git stash pop 2>&1', { encoding: 'utf8' });
  console.log('=== git stash pop ===');
  console.log(output);
} catch (err) {
  const msg = err.stdout || err.message || '';
  console.log('=== git stash pop ===');
  if (msg.includes('No stash') || msg.includes('no stash')) {
    console.log('No stash to pop — stash was empty (nothing was stashed in step 3).');
  } else {
    console.error('ERROR during stash pop:');
    console.error(msg);
  }
}
