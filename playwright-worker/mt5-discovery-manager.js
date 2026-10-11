const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class Mt5DiscoveryManager {
    findExecutablePaths() {
        const candidatePaths = [
            'C:\\Program Files\\MetaTrader 5\\terminal64.exe',
            'C:\\Program Files\\Vantage FX MetaTrader 5\\terminal64.exe',
            'C:\\Program Files (x86)\\MetaTrader 5\\terminal.exe',
            'C:\\Program Files\\MetaTrader 5 Terminal\\terminal64.exe'
        ];

        return candidatePaths.filter(p => fs.existsSync(p));
    }

    checkRunningProcess() {
        let isRunning = false;
        let processes = [];

        if (process.platform === 'win32') {
            try {
                const psCmd = `powershell -NoProfile -NonInteractive -Command "Get-Process terminal64, terminal -ErrorAction SilentlyContinue | Select-Object Id, ProcessName, MainWindowTitle | ConvertTo-Json"`;
                const out = execSync(psCmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
                if (out) {
                    const parsed = JSON.parse(out);
                    const list = Array.isArray(parsed) ? parsed : [parsed];
                    isRunning = list.length > 0;
                    processes = list.map(p => ({ pid: p.Id, name: p.ProcessName, title: p.MainWindowTitle }));
                }
            } catch (e) {}
        }

        return { isRunning, processes };
    }

    async probeBridgeAndAccount() {
        const installedPaths = this.findExecutablePaths();
        const runningStatus = this.checkRunningProcess();

        let bridgeAvailable = false;
        let pythonVersion = 'None';
        let initialized = false;
        let connected = false;
        let terminalInfo = null;
        let accountInfo = null;
        let tickInfo = null;
        let lastError = null;

        try {
            const pyCmd = `python -c "import json, MetaTrader5 as mt5; init_res = mt5.initialize(); err = list(mt5.last_error()) if not init_res else None; t_info = mt5.terminal_info()._asdict() if init_res and mt5.terminal_info() else None; a_info = mt5.account_info()._asdict() if init_res and mt5.account_info() else None; tick = mt5.symbol_info_tick('EURUSD')._asdict() if init_res and mt5.symbol_info_tick('EURUSD') else None; is_conn = t_info.get('connected', False) if t_info else False; mt5.shutdown() if init_res else None; print(json.dumps({'bridgeAvailable': True, 'version': mt5.__version__, 'initialized': init_res, 'connected': is_conn, 'lastError': err, 'terminalInfo': t_info, 'accountInfo': a_info, 'tickInfo': tick}))"`;

            const rawOut = execSync(pyCmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
            const data = JSON.parse(rawOut);

            bridgeAvailable = data.bridgeAvailable;
            pythonVersion = data.version || 'Unknown';
            initialized = data.initialized || false;
            connected = data.connected || false;
            terminalInfo = data.terminalInfo;
            accountInfo = data.accountInfo;
            tickInfo = data.tickInfo;
            lastError = data.lastError;
        } catch (e) {
            lastError = e.message;
        }

        let statusSummary = 'MODULE_MISSING';
        if (bridgeAvailable) {
            if (!installedPaths.length && !runningStatus.isRunning) {
                statusSummary = 'TERMINAL_NOT_INSTALLED';
            } else if (!initialized) {
                statusSummary = 'INSTALLED_BUT_TERMINAL_OFFLINE';
            } else if (initialized && !connected) {
                statusSummary = 'TERMINAL_INITIALIZED_DISCONNECTED';
            } else if (initialized && connected) {
                statusSummary = 'ONLINE_AND_CONNECTED';
            }
        }

        return {
            installedPaths,
            runningStatus,
            bridgeAvailable,
            pythonVersion,
            initialized,
            connected,
            terminalInfo,
            accountInfo,
            tickInfo,
            lastError,
            statusSummary
        };
    }

    async getReadonlyMarketData(symbol = 'EURUSD', timeframeStr = 'H1', count = 100) {
        console.log(`[MT5 READONLY] Fetching read-only market data for ${symbol} (${timeframeStr}, count: ${count})...`);

        const status = await this.probeBridgeAndAccount();
        if (!status.initialized) {
            return {
                success: false,
                statusSummary: status.statusSummary,
                error: `Terminal offline or uninitialized. Unable to fetch live market data for ${symbol}.`,
                lastError: status.lastError
            };
        }

        try {
            const pyCmd = `python -c "import json, MetaTrader5 as mt5; mt5.initialize(); rates = mt5.copy_rates_from_pos('${symbol}', mt5.TIMEFRAME_${timeframeStr}, 0, ${count}); tick = mt5.symbol_info_tick('${symbol}'); mt5.shutdown(); print(json.dumps({'success': rates is not None, 'ratesCount': len(rates) if rates is not None else 0, 'tick': tick._asdict() if tick else None}))"`;

            const rawOut = execSync(pyCmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
            const data = JSON.parse(rawOut);

            return {
                success: data.success,
                symbol,
                timeframe: timeframeStr,
                ratesCount: data.ratesCount,
                tick: data.tick,
                statusSummary: status.statusSummary
            };
        } catch (err) {
            return {
                success: false,
                symbol,
                error: `Failed to retrieve market data for ${symbol}: ${err.message}`
            };
        }
    }

    submitOrder() {
        throw new Error('LIVE_TRADING_BLOCKED: Order creation/submission is strictly prohibited in this phase.');
    }

    modifyOrder() {
        throw new Error('LIVE_TRADING_BLOCKED: Order modification is strictly prohibited in this phase.');
    }

    closePosition() {
        throw new Error('LIVE_TRADING_BLOCKED: Position closing is strictly prohibited in this phase.');
    }
}

module.exports = new Mt5DiscoveryManager();
