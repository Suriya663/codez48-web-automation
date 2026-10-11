const assert = require('assert');
const fs = require('fs');
const filesystemController = require('../playwright-worker/filesystem-controller');

function runStoryTest() {
    console.log('=== ACCEPTANCE TEST 4: GRAVITY STORY TEXT FILE ===');

    const res = filesystemController.createGravityStoryFile();
    assert.strictEqual(res.success, true);
    assert.strictEqual(fs.existsSync(res.filePath), true);
    assert.strictEqual(res.storyContent.includes('The Day Gravity Took a Break'), true);

    console.log(`[PASS] Gravity story text file generated and verified at: ${res.filePath}`);
    console.log('ACCEPTANCE TEST 4 PASSED SUCCESSFULLY.');
}

try {
    runStoryTest();
} catch (err) {
    console.error('ACCEPTANCE TEST 4 FAILED:', err.message);
    process.exit(1);
}
