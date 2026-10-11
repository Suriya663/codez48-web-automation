const readline = require('readline');

class SafetyController {
    async requireConfirmation(actionDescription) {
        return new Promise((resolve) => {
            console.log('\n================================================');
            console.log('[!]. SAFETY CONFIRMATION REQUIRED');
            console.log('================================================');
            console.log(`Operation: ${actionDescription}`);
            console.log('This operation is potentially destructive or irreversible.');
            console.log('------------------------------------------------');

            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            rl.question('Do you wish to proceed? (yes/no): ', (answer) => {
                rl.close();
                const confirmed = (answer || '').trim().toLowerCase() === 'yes';
                if (confirmed) {
                    console.log('[SAFETY] User confirmed operation. Proceeding...');
                    resolve(true);
                } else {
                    console.log('[SAFETY] User denied operation. Aborting safely.');
                    resolve(false);
                }
            });
        });
    }
}

module.exports = new SafetyController();
