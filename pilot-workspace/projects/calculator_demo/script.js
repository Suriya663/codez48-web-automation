const display = document.getElementById('display');
const buttons = document.querySelectorAll('.btn[data-value]');
const clearBtn = document.getElementById('clear');
const equalsBtn = document.getElementById('equals');

let currentInput = '';
let operator = null;
let previousValue = null;

function updateDisplay(value) {
    display.value = value;
}

function appendNumber(num) {
    // Prevent multiple leading zeros
    if (currentInput === '0' && num !== '.') {
        currentInput = num;
    } else {
        // Prevent multiple decimals in the same number
        if (num === '.' && currentInput.includes('.')) return;
        currentInput += num;
    }
    updateDisplay(currentInput);
}

function chooseOperator(op) {
    if (currentInput === '' && previousValue === null) return; // nothing to operate on
    if (previousValue === null) {
        previousValue = parseFloat(currentInput);
    } else if (currentInput !== '') {
        compute();
    }
    operator = op;
    currentInput = '';
}

function compute() {
    if (operator === null || currentInput === '' || previousValue === null) return;
    const current = parseFloat(currentInput);
    let result;
    switch (operator) {
        case '+':
            result = previousValue + current;
            break;
        case '-':
            result = previousValue - current;
            break;
        case '*':
            result = previousValue * current;
            break;
        case '/':
            if (current === 0) {
                alert('Error: Division by zero');
                clearAll();
                return;
            }
            result = previousValue / current;
            break;
        default:
            return;
    }
    // Round to avoid floating point artifacts (e.g., 0.1+0.2)
    result = Math.round((result + Number.EPSILON) * 1e12) / 1e12;
    updateDisplay(result);
    // Prepare for next operation
    previousValue = result;
    currentInput = '';
    operator = null;
}

function clearAll() {
    currentInput = '';
    previousValue = null;
    operator = null;
    updateDisplay('');
}

buttons.forEach(btn => {
    btn.addEventListener('click', () => {
        const value = btn.getAttribute('data-value');
        if (['+', '-', '*', '/'].includes(value)) {
            chooseOperator(value);
        } else {
            appendNumber(value);
        }
    });
});

clearBtn.addEventListener('click', clearAll);

equalsBtn.addEventListener('click', compute);

// Optional: support keyboard input
document.addEventListener('keydown', e => {
    if ((e.key >= '0' && e.key <= '9') || e.key === '.') {
        appendNumber(e.key);
    } else if (['+', '-', '*', '/'].includes(e.key)) {
        chooseOperator(e.key);
    } else if (e.key === 'Enter' || e.key === '=') {
        compute();
    } else if (e.key === 'Backspace') {
        // Remove last character
        currentInput = currentInput.slice(0, -1);
        updateDisplay(currentInput);
    } else if (e.key.toLowerCase() === 'c') {
        clearAll();
    }
});