const assert = require('assert');
const strategyResearchEngine = require('../playwright-worker/strategy-research-engine');

function runStrategyTests() {
    console.log('=== STAGE D STRATEGY RESEARCH & BACKTESTING TEST SUITE ===');

    // Test 1: Position Sizing - Standard EURUSD 1% Risk
    const size1 = strategyResearchEngine.calculatePositionSize({
        accountEquity: 10000,
        riskPercent: 1.0,
        entryPrice: 1.0850,
        stopLossPrice: 1.0800,
        contractSize: 100000,
        tickSize: 0.0001,
        tickValue: 10.0
    });
    assert.strictEqual(size1.rejected, false);
    assert.strictEqual(size1.monetaryRisk, 100);
    assert.strictEqual(size1.stopDistance, 0.0050);
    assert.strictEqual(size1.lotSize, 0.20); // $100 risk / (50 ticks * $10) = $100 / $500 = 0.20 lots
    console.log('[TEST 1 PASSED] Standard EURUSD position sizing verified (0.20 lots)');

    // Test 2: Position Sizing - USDJPY 1% Risk (Tick Size 0.01)
    const size2 = strategyResearchEngine.calculatePositionSize({
        accountEquity: 10000,
        riskPercent: 1.0,
        entryPrice: 150.00,
        stopLossPrice: 149.50,
        contractSize: 100000,
        tickSize: 0.01,
        tickValue: 6.67
    });
    assert.strictEqual(size2.rejected, false);
    assert.strictEqual(size2.monetaryRisk, 100);
    assert.strictEqual(size2.stopDistance, 0.50);
    assert.strictEqual(typeof size2.lotSize, 'number');
    assert.strictEqual(size2.lotSize > 0, true);
    console.log(`[TEST 2 PASSED] USDJPY position sizing verified (${size2.lotSize} lots)`);

    // Test 3: Invalid Stop Loss Distance Boundary
    const size3 = strategyResearchEngine.calculatePositionSize({
        accountEquity: 10000,
        riskPercent: 1.0,
        entryPrice: 1.0850,
        stopLossPrice: 1.0850 // Stop distance = 0
    });
    assert.strictEqual(size3.rejected, true);
    assert.strictEqual(size3.reason, 'INVALID_STOP_DISTANCE');
    assert.strictEqual(size3.lotSize, 0);
    console.log('[TEST 3 PASSED] Zero stop distance rejected cleanly');

    // Test 4: Negative/NaN Input Boundary
    const size4 = strategyResearchEngine.calculatePositionSize({
        accountEquity: -500,
        riskPercent: 1.0,
        entryPrice: 1.0850,
        stopLossPrice: 1.0800
    });
    assert.strictEqual(size4.rejected, true);
    assert.strictEqual(size4.reason, 'INVALID_NUMERIC_INPUTS');
    assert.strictEqual(size4.lotSize, 0);
    console.log('[TEST 4 PASSED] Negative account equity input rejected cleanly');

    // Test 5: Strategy Signal Evaluations
    const syntheticCandles = [];
    let price = 1.0800;
    for (let i = 0; i < 50; i++) {
        const change = (i % 2 === 0 ? 0.0010 : -0.0005);
        price += change;
        syntheticCandles.push({
            time: Date.now() + i * 3600000,
            open: price - change,
            high: price + 0.0005,
            low: price - 0.0005,
            close: price,
            volume: 1000
        });
    }

    const trendEval = strategyResearchEngine.evaluateTrendFollowing(syntheticCandles);
    assert.strictEqual(typeof trendEval.signal, 'string');
    console.log(`[TEST 5 PASSED] Trend strategy signal evaluated (${trendEval.signal})`);

    // Test 6: Offline Bar-by-Bar Backtest Engine
    const backtestRes = strategyResearchEngine.runOfflineBacktest(syntheticCandles, 'trend');
    assert.strictEqual(backtestRes.success, true);
    assert.strictEqual(backtestRes.dataClassification, 'SIMULATED_BACKTEST_RESULT');
    assert.strictEqual(typeof backtestRes.finalBalance, 'number');
    assert.strictEqual(typeof backtestRes.totalTrades, 'number');
    assert.strictEqual(typeof backtestRes.maxDrawdownPct, 'number');
    console.log(`[TEST 6 PASSED] Bar-by-bar backtest executed cleanly (Total Trades: ${backtestRes.totalTrades}, Final Balance: $${backtestRes.finalBalance})`);

    console.log('ALL STRATEGY RESEARCH & BACKTESTING TESTS PASSED SUCCESSFULLY.');
}

try {
    runStrategyTests();
} catch (err) {
    console.error('STRATEGY RESEARCH TEST FAILED:', err.message);
    process.exit(1);
}
