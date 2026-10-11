class StrategyResearchEngine {
    /**
     * Pure deterministic position sizing calculation
     */
    calculatePositionSize({
        accountEquity,
        riskPercent = 1.0,
        entryPrice,
        stopLossPrice,
        contractSize = 100000,
        tickSize = 0.0001,
        tickValue = 10.0,
        minVolume = 0.01,
        maxVolume = 100.0,
        volumeStep = 0.01
    }) {
        // Validate inputs
        if (!accountEquity || accountEquity <= 0 || !isFinite(accountEquity) ||
            !entryPrice || entryPrice <= 0 || !isFinite(entryPrice) ||
            !stopLossPrice || stopLossPrice <= 0 || !isFinite(stopLossPrice) ||
            !riskPercent || riskPercent <= 0 || !isFinite(riskPercent)) {
            return { lotSize: 0, rejected: true, reason: 'INVALID_NUMERIC_INPUTS' };
        }

        const stopDistance = Math.abs(entryPrice - stopLossPrice);
        if (stopDistance <= 0 || !isFinite(stopDistance)) {
            return { lotSize: 0, rejected: true, reason: 'INVALID_STOP_DISTANCE' };
        }

        const monetaryRisk = accountEquity * (riskPercent / 100.0);
        const ticksAtRisk = stopDistance / tickSize;
        const riskPerLot = ticksAtRisk * tickValue;

        if (riskPerLot <= 0 || !isFinite(riskPerLot)) {
            return { lotSize: 0, rejected: true, reason: 'INVALID_RISK_PER_LOT' };
        }

        const rawLot = monetaryRisk / riskPerLot;
        let roundedLot = Math.floor(rawLot / volumeStep) * volumeStep;

        if (roundedLot < minVolume) {
            return { lotSize: 0, monetaryRisk, stopDistance, rejected: true, reason: 'LOT_BELOW_MINIMUM_VOLUME' };
        }

        if (roundedLot > maxVolume) {
            roundedLot = maxVolume;
        }

        const lotSize = parseFloat(roundedLot.toFixed(2));
        return {
            lotSize,
            monetaryRisk: parseFloat(monetaryRisk.toFixed(2)),
            stopDistance: parseFloat(stopDistance.toFixed(5)),
            riskPerLot: parseFloat(riskPerLot.toFixed(2)),
            rejected: false
        };
    }

    /**
     * Moving Average Crossover Trend Strategy
     */
    evaluateTrendFollowing(candles) {
        if (!candles || candles.length < 21) {
            return { signal: 'NO_TRADE', reason: 'INSUFFICIENT_CANDLE_DATA' };
        }

        const closes = candles.map(c => c.close);
        const sma9 = this.calculateSMA(closes, 9);
        const sma21 = this.calculateSMA(closes, 21);

        const prevSma9 = this.calculateSMA(closes.slice(0, -1), 9);
        const prevSma21 = this.calculateSMA(closes.slice(0, -1), 21);

        if (prevSma9 <= prevSma21 && sma9 > sma21) {
            return { signal: 'BUY', sma9, sma21, reason: 'BULLISH_MA_CROSSOVER' };
        }
        if (prevSma9 >= prevSma21 && sma9 < sma21) {
            return { signal: 'SELL', sma9, sma21, reason: 'BEARISH_MA_CROSSOVER' };
        }

        return { signal: 'NO_TRADE', sma9, sma21, reason: 'NO_CROSSOVER' };
    }

    /**
     * Donchian Channel Breakout Strategy
     */
    evaluateMomentumBreakout(candles, lookback = 20) {
        if (!candles || candles.length <= lookback) {
            return { signal: 'NO_TRADE', reason: 'INSUFFICIENT_CANDLE_DATA' };
        }

        const historical = candles.slice(-lookback - 1, -1);
        const currentBar = candles[candles.length - 1];

        const highestHigh = Math.max(...historical.map(c => c.high));
        const lowestLow = Math.min(...historical.map(c => c.low));

        if (currentBar.close > highestHigh) {
            return { signal: 'BUY', highestHigh, currentClose: currentBar.close, reason: 'DONCHIAN_HIGH_BREAKOUT' };
        }
        if (currentBar.close < lowestLow) {
            return { signal: 'SELL', lowestLow, currentClose: currentBar.close, reason: 'DONCHIAN_LOW_BREAKOUT' };
        }

        return { signal: 'NO_TRADE', highestHigh, lowestLow, currentClose: currentBar.close, reason: 'NO_BREAKOUT' };
    }

    /**
     * RSI Mean Reversion Strategy
     */
    evaluateMeanReversion(candles, period = 14) {
        if (!candles || candles.length <= period + 1) {
            return { signal: 'NO_TRADE', reason: 'INSUFFICIENT_CANDLE_DATA' };
        }

        const closes = candles.map(c => c.close);
        const rsi = this.calculateRSI(closes, period);

        if (rsi < 30) {
            return { signal: 'BUY', rsi, reason: 'RSI_OVERSOLD' };
        }
        if (rsi > 70) {
            return { signal: 'SELL', rsi, reason: 'RSI_OVERBOUGHT' };
        }

        return { signal: 'NO_TRADE', rsi, reason: 'RSI_NEUTRAL' };
    }

    /**
     * Bar-by-bar offline backtest simulation engine
     */
    runOfflineBacktest(candleSeries = [], strategyType = 'trend', options = {}) {
        const spreadPips = options.spreadPips || 1.5;
        const commissionPerLot = options.commissionPerLot || 7.0;
        const slippagePips = options.slippagePips || 0.5;
        const pipSize = options.pipSize || 0.0001;
        const initialBalance = options.initialBalance || 10000;

        if (!candleSeries || candleSeries.length < 30) {
            return {
                dataClassification: 'SIMULATED_BACKTEST_RESULT',
                success: false,
                error: 'INSUFFICIENT_HISTORICAL_DATA_FOR_BACKTEST'
            };
        }

        let balance = initialBalance;
        let peakBalance = initialBalance;
        let maxDrawdownPct = 0;
        let activePosition = null; // { type, entryPrice, stopLoss, takeProfit, lotSize, entryBarIndex }
        let trades = [];

        for (let i = 25; i < candleSeries.length; i++) {
            // Use ONLY historical bars up to current index i (preventing look-ahead bias)
            const historicalWindow = candleSeries.slice(0, i + 1);
            const currentBar = candleSeries[i];

            // 1. Manage existing position exit
            if (activePosition) {
                let exitPrice = null;
                let exitReason = null;

                if (activePosition.type === 'BUY') {
                    if (currentBar.low <= activePosition.stopLoss) {
                        exitPrice = activePosition.stopLoss - (slippagePips * pipSize);
                        exitReason = 'STOP_LOSS_HIT';
                    } else if (currentBar.high >= activePosition.takeProfit) {
                        exitPrice = activePosition.takeProfit;
                        exitReason = 'TAKE_PROFIT_HIT';
                    }
                } else if (activePosition.type === 'SELL') {
                    if (currentBar.high >= activePosition.stopLoss) {
                        exitPrice = activePosition.stopLoss + (slippagePips * pipSize);
                        exitReason = 'STOP_LOSS_HIT';
                    } else if (currentBar.low <= activePosition.takeProfit) {
                        exitPrice = activePosition.takeProfit;
                        exitReason = 'TAKE_PROFIT_HIT';
                    }
                }

                if (exitPrice) {
                    const priceDiff = activePosition.type === 'BUY'
                        ? exitPrice - activePosition.entryPrice
                        : activePosition.entryPrice - exitPrice;

                    const grossProfit = priceDiff * activePosition.lotSize * 100000;
                    const totalCosts = (spreadPips * pipSize * activePosition.lotSize * 100000) + (commissionPerLot * activePosition.lotSize);
                    const netProfit = grossProfit - totalCosts;

                    balance += netProfit;
                    if (balance > peakBalance) peakBalance = balance;
                    const currentDrawdown = ((peakBalance - balance) / peakBalance) * 100;
                    if (currentDrawdown > maxDrawdownPct) maxDrawdownPct = currentDrawdown;

                    trades.push({
                        type: activePosition.type,
                        entryPrice: activePosition.entryPrice,
                        exitPrice,
                        exitReason,
                        netProfit: parseFloat(netProfit.toFixed(2)),
                        balanceAfter: parseFloat(balance.toFixed(2))
                    });

                    activePosition = null;
                }
            }

            // 2. Evaluate strategy signal if no position is open
            if (!activePosition) {
                let evalRes = { signal: 'NO_TRADE' };
                if (strategyType === 'trend') {
                    evalRes = this.evaluateTrendFollowing(historicalWindow);
                } else if (strategyType === 'breakout') {
                    evalRes = this.evaluateMomentumBreakout(historicalWindow);
                } else if (strategyType === 'mean_reversion') {
                    evalRes = this.evaluateMeanReversion(historicalWindow);
                }

                if (evalRes.signal === 'BUY' || evalRes.signal === 'SELL') {
                    const entryPrice = evalRes.signal === 'BUY'
                        ? currentBar.close + (spreadPips * pipSize)
                        : currentBar.close;

                    const stopDistance = 0.0050; // 50 pips
                    const stopLoss = evalRes.signal === 'BUY'
                        ? entryPrice - stopDistance
                        : entryPrice + stopDistance;

                    const takeProfit = evalRes.signal === 'BUY'
                        ? entryPrice + (stopDistance * 1.5)
                        : entryPrice - (stopDistance * 1.5);

                    const sizeRes = this.calculatePositionSize({
                        accountEquity: balance,
                        riskPercent: 1.0,
                        entryPrice,
                        stopLossPrice: stopLoss
                    });

                    if (!sizeRes.rejected && sizeRes.lotSize > 0) {
                        activePosition = {
                            type: evalRes.signal,
                            entryPrice,
                            stopLoss,
                            takeProfit,
                            lotSize: sizeRes.lotSize,
                            entryBarIndex: i
                        };
                    }
                }
            }
        }

        const winningTrades = trades.filter(t => t.netProfit > 0);
        const losingTrades = trades.filter(t => t.netProfit <= 0);
        const netTotalProfit = trades.reduce((sum, t) => sum + t.netProfit, 0);

        return {
            dataClassification: 'SIMULATED_BACKTEST_RESULT',
            success: true,
            strategyType,
            initialBalance,
            finalBalance: parseFloat(balance.toFixed(2)),
            netTotalProfit: parseFloat(netTotalProfit.toFixed(2)),
            totalTrades: trades.length,
            winCount: winningTrades.length,
            lossCount: losingTrades.length,
            winRatePct: trades.length > 0 ? parseFloat(((winningTrades.length / trades.length) * 100).toFixed(1)) : 0,
            maxDrawdownPct: parseFloat(maxDrawdownPct.toFixed(2)),
            assumptions: { spreadPips, commissionPerLot, slippagePips, pipSize },
            trades
        };
    }

    calculateSMA(closes, period) {
        if (!closes || closes.length < period) return 0;
        const slice = closes.slice(-period);
        const sum = slice.reduce((a, b) => a + b, 0);
        return sum / period;
    }

    calculateRSI(closes, period = 14) {
        if (!closes || closes.length <= period) return 50;
        let gains = 0;
        let losses = 0;

        for (let i = closes.length - period; i < closes.length; i++) {
            const diff = closes[i] - closes[i - 1];
            if (diff >= 0) gains += diff;
            else losses += Math.abs(diff);
        }

        if (losses === 0) return 100;
        const rs = (gains / period) / (losses / period);
        return 100 - (100 / (1 + rs));
    }
}

module.exports = new StrategyResearchEngine();
