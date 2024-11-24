// main.ts
/// <reference types="vite/client" />

// Create and initialize the worker
const worker = import.meta.env.DEV 
    ? new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })
    : new Worker(new URL('./worker.js', import.meta.url), { type: 'classic' });

// Initialize the worker
worker.postMessage('init');

// Calculator state
let currentNumber = '';
let previousResult: number | null = null;
let operation: string | null = null;
let expressionChain = '';
let newNumberStarted = false;
let isNewOperation = true;

// Display elements
const resultDisplay = document.getElementById('result')!;
const num1Display = document.getElementById('num1-display')!;
const operationDisplay = document.getElementById('operation-display')!;
const num2Display = document.getElementById('num2-display')!;

// Update display function
function updateDisplay() {
    // Show current input or result in the main display
    resultDisplay.textContent = currentNumber || (previousResult?.toString() || '0');
    
    // Update expression chain display
    if (previousResult !== null) {
        if (operation) {
            if (isNewOperation) {
                // Start new operation with previous result
                expressionChain = previousResult.toString();
            }
            num1Display.textContent = expressionChain;
            operationDisplay.textContent = getOperationSymbol(operation);
            num2Display.textContent = currentNumber;
        } else {
            // After equals, show the complete expression
            num1Display.textContent = expressionChain;
            operationDisplay.textContent = ' = ';
            num2Display.textContent = previousResult.toString();
        }
    } else {
        // Initial number entry
        num1Display.textContent = currentNumber;
        operationDisplay.textContent = '';
        num2Display.textContent = '';
        expressionChain = currentNumber;
    }
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
            if (newNumberStarted || currentNumber === '0') {
                currentNumber = num;
                newNumberStarted = false;
            } else {
                if (num === '.' && currentNumber.includes('.')) return;
                currentNumber += num;
            }
            updateDisplay();
        }
        else if (op) {
            if (currentNumber || previousResult !== null) {
                if (previousResult === null) {
                    previousResult = parseFloat(currentNumber);
                    expressionChain = currentNumber;
                    currentNumber = '';
                    isNewOperation = false;
                } else if (currentNumber) {
                    // Add to expression chain before calculating
                    expressionChain += getOperationSymbol(operation!) + currentNumber;
                    calculateResult();
                    isNewOperation = false;
                }
                operation = op;
                updateDisplay();
            }
        }
        else if (action) {
            switch(action) {
                case 'equals':
                    if (currentNumber && operation && previousResult !== null) {
                        expressionChain += getOperationSymbol(operation) + currentNumber;
                        calculateResult();
                        operation = null;
                        isNewOperation = true;
                        updateDisplay();
                    }
                    break;
                case 'clear':
                    clearCalculator();
                    break;
                case 'backspace':
                    if (currentNumber) {
                        currentNumber = currentNumber.slice(0, -1);
                        updateDisplay();
                    }
                    break;
            }
        }
    });
});

function calculateResult() {
    if (previousResult !== null && operation && currentNumber) {
        const a = previousResult;
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
    previousResult = null;
    operation = null;
    expressionChain = '';
    newNumberStarted = false;
    isNewOperation = true;
    updateDisplay();
}

// Handle worker messages
worker.onmessage = function(e) {
    if (e.data.type === 'init' && e.data.status === 'ready') {
        console.log('Worker initialized and ready');
    } else if (e.data.type === 'result') {
        const result = e.data.data;
        previousResult = result;
        currentNumber = '';
        newNumberStarted = true;
        
        // Format the result for display
        const displayResult = Number.isInteger(result) 
            ? result.toString()
            : result.toFixed(6).replace(/\.?0+$/, '');
        
        // Update the main result display
        resultDisplay.textContent = displayResult;
        
        updateDisplay();
    } else if (e.data.type === 'error') {
        resultDisplay.textContent = `Error: ${e.data.error}`;
        currentNumber = '';
        previousResult = null;
        operation = null;
        expressionChain = '';
        newNumberStarted = true;
        isNewOperation = true;
        updateDisplay();
    }
};

// Handle worker errors
worker.onerror = function(error) {
    console.error('Worker error:', error);
    resultDisplay.textContent = 'Error occurred';
};