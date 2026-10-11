const assert = require('assert');
const mt5DiscoveryManager = require('../playwright-worker/mt5-discovery-manager');

async function runMt5ReadOnlyTests() {
    console.log('=== STAGE D METATRADER 5 READ-ONLY TEST SUITE ===');

    // Test 1: Executable Path Discovery & Process Inspection
    const paths = mt5DiscoveryManager.findExecutablePaths();
    assert.strictEqual(Array.isArray(paths), true);
    console.log(`[TEST 1 PASSED] MT5 Executable Discovery checked (${paths.length} installation paths found)`);

    // Test 2: Terminal Diagnostic Probe
    const probe = await mt5DiscoveryManager.probeBridgeAndAccount();
    assert.strictEqual(typeof probe.statusSummary, 'string');
    assert.strictEqual(probe.bridgeAvailable, true); // Python MetaTrader5 package is installed
    console.log(`[TEST 2 PASSED] MT5 Diagnostic Probe verified. Status Summary: ${probe.statusSummary}`);

    // Test 3: Read-Only Market Data Access Error Handling
    const marketDataRes = await mt5DiscoveryManager.getReadonlyMarketData('EURUSD', 'H1', 10);
    assert.strictEqual(typeof marketDataRes.success, 'boolean');
    console.log(`[TEST 3 PASSED] Read-only market data access method handled cleanly (success: ${marketDataRes.success})`);

    // Test 4: Live Trading Blocked Exception - Order Submission
    assert.throws(() => {
        mt5DiscoveryManager.submitOrder();
    }, /LIVE_TRADING_BLOCKED/);
    console.log('[TEST 4 PASSED] submitOrder() LIVE_TRADING_BLOCKED enforcement verified');

    // Test 5: Live Trading Blocked Exception - Order Modification
    assert.throws(() => {
        mt5DiscoveryManager.modifyOrder();
    }, /LIVE_TRADING_BLOCKED/);
    console.log('[TEST 5 PASSED] modifyOrder() LIVE_TRADING_BLOCKED enforcement verified');

    // Test 6: Live Trading Blocked Exception - Position Closure
    assert.throws(() => {
        mt5DiscoveryManager.closePosition();
    }, /LIVE_TRADING_BLOCKED/);
    console.log('[TEST 6 PASSED] closePosition() LIVE_TRADING_BLOCKED enforcement verified');

    console.log('ALL METATRADER 5 READ-ONLY TESTS PASSED SUCCESSFULLY.');
}

runMt5ReadOnlyTests().catch(err => {
    console.error('METATRADER 5 READ-ONLY TEST FAILED:', err.message);
    process.exit(1);
});
