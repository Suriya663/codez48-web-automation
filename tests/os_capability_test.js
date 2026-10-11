const assert = require('assert');
const osCapabilityRegistry = require('../playwright-worker/os-capability-registry');
const mt5DiscoveryManager = require('../playwright-worker/mt5-discovery-manager');

async function runCapabilityTests() {
    console.log('=== STAGE B OS CAPABILITY & MT5 DIAGNOSTICS TEST SUITE ===');

    // Test 1: OS Capability Probe
    const probe = await osCapabilityRegistry.runFullCapabilityProbe();
    assert.strictEqual(typeof probe.capabilities.os_platform, 'string');
    assert.strictEqual(typeof probe.system.type, 'string');
    assert.strictEqual(probe.uiAutomation.cursorReaderWorking, true);
    console.log('[TEST 1 PASSED] Full OS Capability Probe returned structured payload');

    // Test 2: Runtimes Detection
    assert.strictEqual(typeof probe.runtimes.nodeVersion, 'string');
    assert.strictEqual(probe.runtimes.playwrightInstalled, true);
    console.log('[TEST 2 PASSED] Node.js & Playwright runtime detection verified');

    // Test 3: Filesystem Write Probe
    assert.strictEqual(probe.filesystem.desktopWritable, true);
    console.log('[TEST 3 PASSED] Desktop write capability probe verified');

    // Test 4: MT5 Discovery & Read-Only Probe
    const mt5Res = await mt5DiscoveryManager.probeBridgeAndAccount();
    assert.strictEqual(typeof mt5Res.statusSummary, 'string');
    assert.strictEqual(mt5Res.bridgeAvailable, true); // Python package MetaTrader5 is installed
    console.log(`[TEST 4 PASSED] MT5 Bridge & Diagnostics verified. Summary: ${mt5Res.statusSummary}`);

    // Test 5: MT5 Read-Only Enforcement
    assert.throws(() => {
        mt5DiscoveryManager.submitOrder();
    }, /LIVE_TRADING_BLOCKED/);
    console.log('[TEST 5 PASSED] MT5 submitOrder read-only restriction verified');

    console.log('ALL STAGE B CAPABILITY TESTS PASSED SUCCESSFULLY.');
}

runCapabilityTests().catch(err => {
    console.error('STAGE B CAPABILITY TEST FAILED:', err.message);
    process.exit(1);
});
