const assert = require('assert');
const fs = require('fs');
const filesystemController = require('../playwright-worker/filesystem-controller');

function runCsvReportTest() {
    console.log('=== ACCEPTANCE TEST 5: FILESYSTEM CSV REPORT ===');

    const res = filesystemController.createCsvReport();
    assert.strictEqual(res.success, true);
    assert.strictEqual(fs.existsSync(res.filePath), true);
    assert.strictEqual(res.rowCount, 4);
    assert.strictEqual(res.headerCount, 5);

    console.log(`[PASS] CSV report generated and verified at: ${res.filePath} (${res.rowCount} rows)`);
    console.log('ACCEPTANCE TEST 5 PASSED SUCCESSFULLY.');
}

try {
    runCsvReportTest();
} catch (err) {
    console.error('ACCEPTANCE TEST 5 FAILED:', err.message);
    process.exit(1);
}
