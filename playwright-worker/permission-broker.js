const readline = require('readline');

class PermissionBroker {
    constructor() {
        this.grantedScopes = new Set();
    }

    async requestPermission(scope, reason, envDetails = {}) {
        if (this.grantedScopes.has(scope)) {
            return { granted: true, scope, mode: 'CACHED' };
        }

        console.log('\n================================================');
        console.log('[PERMISSIONS BROKER] AUTHORIZATION REQUEST');
        console.log('================================================');
        console.log(`Requested Scope: ${scope}`);
        console.log(`Reason: ${reason}`);
        console.log(`Environment: ${envDetails.environment || 'SYSTEM'} | App: ${envDetails.application || 'GENERAL'}`);
        console.log('------------------------------------------------');

        return new Promise((resolve) => {
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            rl.question(`Grant permission for "${scope}"? (yes/no): `, (answer) => {
                rl.close();
                const granted = (answer || '').trim().toLowerCase() === 'yes';
                if (granted) {
                    this.grantedScopes.add(scope);
                    console.log(`[PERMISSIONS BROKER] Permission GRANTED for scope: ${scope}`);
                    resolve({ granted: true, scope, mode: 'GRANTED' });
                } else {
                    console.log(`[PERMISSIONS BROKER] Permission DENIED for scope: ${scope}`);
                    resolve({ granted: false, scope, mode: 'DENIED' });
                }
            });
        });
    }
}

module.exports = new PermissionBroker();
