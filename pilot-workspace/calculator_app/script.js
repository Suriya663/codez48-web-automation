const display = document.getElementById('display');

function appendToDisplay(value) {
    display.value += value;
}

function clearDisplay() {
    display.value = '';
}

function deleteLast() {
    display.value = display.value.slice(0, -1);
}

function calculate() {
    try {
        // Replace any accidental multiple operators (e.g., ++ or --) before eval
        const sanitized = display.value.replace(/([+\-*/]){2,}/g, '$1');
        // Evaluate the expression safely
        const result = Function(`'use strict'; return (${sanitized})`)();
        display.value = result;
    } catch (e) {
        display.value = 'Error';
    }
}

document.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const value = btn.dataset.value;
        switch (action) {
            case 'digit':
                appendToDisplay(value);
                break;
            case 'decimal':
                if (!display.value.includes('.')) appendToDisplay('.');
                break;
            case 'operator':
                // Prevent two operators in a row
                if (display.value && !/[+\-*/]$/.test(display.value)) {
                    appendToDisplay(value);
                }
                break;
            case 'clear':
                clearDisplay();
                break;
            case 'delete':
                deleteLast();
                break;
            case 'equal':
                calculate();
                break;
        }
    });
});