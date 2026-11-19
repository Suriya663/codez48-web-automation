const bridge = require('./src/pilot/remote/mobile-mouse-bridge');
const agentController = require('./src/core/agent-controller');
bridge.start(agentController);
