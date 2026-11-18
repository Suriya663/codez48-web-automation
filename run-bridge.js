const bridge = require('./src/pilot/remote/mobile-mouse-bridge');
const agentController = require('./src/core/agent-controller');
bridge.start(agentController);
console.log('[MOBILE BRIDGE] Codez48 Remote Daemon active with Agent Controller.');
