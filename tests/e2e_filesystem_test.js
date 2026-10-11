const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const filesystemController = require('../playwright-worker/filesystem-controller');

function runFilesystemE2ETests() {
    console.log('=== STAGE C END-TO-END FILESYSTEM TEST SUITE ===');

    const testRootDir = path.join(os.tmpdir(), `codez48_filesystem_e2e_${Date.now()}`);

    // Test 1: Directory creation
    const folderRes = filesystemController.createFolder(testRootDir, 'SubFolder1');
    assert.strictEqual(folderRes.success, true);
    assert.strictEqual(fs.existsSync(folderRes.path), true);
    console.log('[TEST 1 PASSED] E2E Directory creation verified');

    // Test 2: File creation
    const fileRes = filesystemController.createTextFile(folderRes.path, 'initial_notes.txt', 'Line 1: Initial Content\n');
    assert.strictEqual(fileRes.success, true);
    assert.strictEqual(fs.existsSync(fileRes.path), true);
    console.log('[TEST 2 PASSED] E2E File creation verified');

    // Test 3: Read file content
    const readRes = filesystemController.readFile(fileRes.path);
    assert.strictEqual(readRes.success, true);
    assert.strictEqual(readRes.content, 'Line 1: Initial Content\n');
    console.log('[TEST 3 PASSED] E2E Read file content verified');

    // Test 4: Edit / Append file
    const editRes = filesystemController.editFile(fileRes.path, 'Line 2: Appended Content\n');
    assert.strictEqual(editRes.success, true);
    assert.strictEqual(editRes.fullContent.includes('Line 2: Appended Content'), true);
    console.log('[TEST 4 PASSED] E2E File edit / append verified');

    // Test 5: Rename file
    const renameRes = filesystemController.renameFile(folderRes.path, 'initial_notes.txt', 'renamed_notes.txt');
    assert.strictEqual(renameRes.success, true);
    assert.strictEqual(fs.existsSync(renameRes.newPath), true);
    assert.strictEqual(fs.existsSync(renameRes.oldPath), false);
    console.log('[TEST 5 PASSED] E2E File rename verified');

    // Test 6: Move file
    const subFolder2 = path.join(testRootDir, 'SubFolder2');
    const moveRes = filesystemController.moveFile(renameRes.newPath, subFolder2);
    assert.strictEqual(moveRes.success, true);
    assert.strictEqual(fs.existsSync(moveRes.destPath), true);
    assert.strictEqual(fs.existsSync(renameRes.newPath), false);
    console.log('[TEST 6 PASSED] E2E File move verified');

    // Test 7: Copy file
    const copyPath = path.join(subFolder2, 'copied_notes.txt');
    const copyRes = filesystemController.copyFile(moveRes.destPath, copyPath);
    assert.strictEqual(copyRes.success, true);
    assert.strictEqual(fs.existsSync(copyPath), true);
    assert.strictEqual(fs.existsSync(moveRes.destPath), true);
    console.log('[TEST 7 PASSED] E2E File copy verified');

    // Test 8: List directory
    const listRes = filesystemController.listDirectory(subFolder2);
    assert.strictEqual(listRes.success, true);
    assert.strictEqual(listRes.itemsCount, 2); // renamed_notes.txt & copied_notes.txt
    console.log('[TEST 8 PASSED] E2E List directory verified');

    // Test 9: Overwrite protection
    const overwriteRes = filesystemController.createTextFile(subFolder2, 'copied_notes.txt', 'New Content', { overwrite: false });
    assert.strictEqual(overwriteRes.success, false);
    assert.strictEqual(overwriteRes.error, 'FILE_ALREADY_EXISTS_OVERWRITE_PROTECTED');
    console.log('[TEST 9 PASSED] Overwrite protection verified');

    // Test 10: Non-existent file read error
    const nonExistentRes = filesystemController.readFile(path.join(subFolder2, 'non_existent.txt'));
    assert.strictEqual(nonExistentRes.success, false);
    assert.strictEqual(nonExistentRes.error, 'FILE_NOT_FOUND');
    console.log('[TEST 10 PASSED] Non-existent file error handling verified');

    // Test 11: Cleanup
    const cleaned = filesystemController.cleanup(testRootDir);
    assert.strictEqual(cleaned, true);
    assert.strictEqual(fs.existsSync(testRootDir), false);
    console.log('[TEST 11 PASSED] Isolated temporary directory cleaned up');

    console.log('ALL E2E FILESYSTEM TESTS PASSED SUCCESSFULLY.');
}

try {
    runFilesystemE2ETests();
} catch (err) {
    console.error('E2E FILESYSTEM TEST FAILED:', err.message);
    process.exit(1);
}
