const assert = require('assert');
const fs = require('fs');
const path = require('path');
const filesystemController = require('../playwright-worker/filesystem-controller');

function runFilesystemTests() {
    console.log('=== STAGE B FILESYSTEM AUTOMATION TEST SUITE ===');

    const folderName = `StageB_TestFolder_${Date.now()}`;
    const fileName = 'summary.txt';
    const testContent = 'Project: StageB_TestFolder\nCreated by Codez48 Pilot\nStatus: VERIFIED\n';

    // Test 1: Folder creation
    const folderRes = filesystemController.createFolder('Desktop', folderName);
    assert.strictEqual(folderRes.success, true);
    assert.strictEqual(fs.existsSync(folderRes.path), true);
    assert.strictEqual(fs.statSync(folderRes.path).isDirectory(), true);
    console.log('[TEST 1 PASSED] Folder created and verified on disk');

    // Test 2: File creation & content verification
    const fileRes = filesystemController.createTextFile(folderRes.path, fileName, testContent);
    assert.strictEqual(fileRes.success, true);
    assert.strictEqual(fs.existsSync(fileRes.path), true);
    const readBack = fs.readFileSync(fileRes.path, 'utf8');
    assert.strictEqual(readBack, testContent);
    console.log('[TEST 2 PASSED] Text file created and content verified');

    // Test 3: Cleanup
    const cleaned = filesystemController.cleanup(folderRes.path);
    assert.strictEqual(cleaned, true);
    assert.strictEqual(fs.existsSync(folderRes.path), false);
    console.log('[TEST 3 PASSED] Test artifacts cleaned up successfully');

    console.log('ALL FILESYSTEM AUTOMATION TESTS PASSED SUCCESSFULLY.');
}

try {
    runFilesystemTests();
} catch (err) {
    console.error('FILESYSTEM TEST FAILED:', err.message);
    process.exit(1);
}
