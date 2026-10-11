const readline = require('readline');

class UserInputDialog {
    async promptUser(promptMessage = 'User input required') {
        return new Promise((resolve) => {
            console.log('\n------------------------------------------------');
            console.log('| Verification Required                     X |');
            console.log('|                                             |');
            console.log(`| ${promptMessage.padEnd(43, ' ')} |`);
            console.log('|                                             |');
            console.log('| [_________________________________________] |');
            console.log('|                                             |');
            console.log('|              [ Continue ]                   |');
            console.log('------------------------------------------------');

            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            rl.question('Enter required value (or type "cancel" to abort): ', (answer) => {
                rl.close();
                const trimmed = (answer || '').trim();
                if (trimmed.toLowerCase() === 'cancel' || trimmed === '') {
                    console.log('[USER INPUT] User cancelled input request.');
                    resolve({ cancelled: true, value: null });
                } else {
                    console.log('[USER INPUT] Value received securely. [REDACTED]');
                    resolve({ cancelled: false, value: trimmed });
                }
            });
        });
    }
}

module.exports = new UserInputDialog();
