/// <reference types="vite/client" />

// Create and initialize the worker
const worker = import.meta.env.DEV 
    ? new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })
    : new Worker(new URL('./worker.js', import.meta.url), { type: 'classic' });

// Initialize the worker
worker.postMessage('init');

// Calculator state
let currentNumber = '';
let firstNumber: number | null = null;
let operation: string | null = null;
let newNumberStarted = false;

// Display elements
const resultDisplay = document.getElementById('result')!;
const num1Display = document.getElementById('num1-display')!;
const operationDisplay = document.getElementById('operation-display')!;
const num2Display = document.getElementById('num2-display')!;

// Update display function
function updateDisplay() {
    resultDisplay.textContent = currentNumber || '0';
    num1Display.textContent = firstNumber?.toString() || '';
    operationDisplay.textContent = operation ? getOperationSymbol(operation) : '';
    num2Display.textContent = operation ? currentNumber : '';
}

function getOperationSymbol(op: string): string {
    switch(op) {
        case 'add': return ' + ';
        case 'subtract': return ' − ';
        case 'multiply': return ' × ';
        case 'divide': return ' ÷ ';
        default: return '';
    }
}

// Add event listeners
document.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', () => {
        const num = button.getAttribute('data-num');
        const op = button.getAttribute('data-operation');
        const action = button.getAttribute('data-action');

        if (num) {
            if (newNumberStarted) {
                currentNumber = num;
                newNumberStarted = false;
            } else {
                if (num === '.' && currentNumber.includes('.')) return;
                currentNumber += num;
            }
            updateDisplay();
        }
        else if (op) {
            if (currentNumber) {
                if (firstNumber === null) {
                    firstNumber = parseFloat(currentNumber);
                    operation = op;
                    newNumberStarted = true;
                } else {
                    calculateResult();
                    operation = op;
                }
                updateDisplay();
            }
        }
        else if (action) {
            switch(action) {
                case 'equals':
                    calculateResult();
                    break;
                case 'clear':
                    clearCalculator();
                    break;
                case 'backspace':
                    currentNumber = currentNumber.slice(0, -1);
                    updateDisplay();
                    break;
            }
        }
    });
});

function calculateResult() {
    if (firstNumber !== null && operation && currentNumber) {
        const a = firstNumber;
        const b = parseFloat(currentNumber);

        worker.postMessage({
            type: 'calculate',
            payload: {
                operation,
                a,
                b
            }
        });
    }
}

function clearCalculator() {
    currentNumber = '';
    firstNumber = null;
    operation = null;
    newNumberStarted = false;
    updateDisplay();
}

// Handle worker messages
worker.onmessage = function(e) {
    if (e.data.type === 'init' && e.data.status === 'ready') {
        console.log('Worker initialized and ready');
    } else if (e.data.type === 'result') {
        const result = e.data.data;
        currentNumber = Number.isInteger(result) 
            ? result.toString()
            : result.toFixed(6).replace(/\.?0+$/, '');
        firstNumber = null;
        operation = null;
        newNumberStarted = true;
        updateDisplay();
    } else if (e.data.type === 'error') {
        resultDisplay.textContent = `Error: ${e.data.error}`;
        currentNumber = '';
        firstNumber = null;
        operation = null;
        newNumberStarted = true;
    }
};

// Handle worker errors
worker.onerror = function(error) {
    console.error('Worker error:', error);
    resultDisplay.textContent = 'Error occurred';
};