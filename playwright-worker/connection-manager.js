/**
 * Connection & Integration Health Manager
 * Monitors connections (browsers, filesystem, APIs, tools) with bounded recovery and health verification.
 */
class ConnectionManager {
    constructor() {
        this.connections = new Map();
    }

    registerConnection(name, connectFn, healthCheckFn) {
        this.connections.set(name, { connectFn, healthCheckFn, status: 'DISCONNECTED' });
    }

    async checkAndConnect(name) {
        const conn = this.connections.get(name);
        if (!conn) return { success: true, message: `No health check registered for ${name}` };

        let attempts = 0;
        while (attempts < 2) {
            try {
                const healthy = await conn.healthCheckFn();
                if (healthy) {
                    conn.status = 'CONNECTED';
                    return { success: true, name, status: 'CONNECTED' };
                }
            } catch (e) {}

            console.log(`[CONNECTION MANAGER] Connection ${name} failed. Attempting reconnection (Attempt ${attempts + 1})...`);
            try {
                await conn.connectFn();
                const healthyAfter = await conn.healthCheckFn();
                if (healthyAfter) {
                    conn.status = 'CONNECTED';
                    return { success: true, name, status: 'CONNECTED' };
                }
            } catch (e) {}

            attempts++;
        }

        conn.status = 'BROKEN';
        return { success: false, name, error: 'Connection broken and unrecoverable' };
    }
}

module.exports = new ConnectionManager();
