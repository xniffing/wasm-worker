// worker.js
let wasm = null;

// Initialize the Wasm module
async function initWasm() {
    try {
        // Update the import path to use the plugin's handling
        wasm = await import('../pkg/wasm_worker.js');
        await wasm.default();
        self.postMessage({ type: 'init', status: 'ready' });
    } catch (err) {
        self.postMessage({ type: 'error', error: err.message });
    }
}

// Handle messages from the main thread
self.onmessage = async function(e) {
    if (e.data === 'init') {
        await initWasm();
    } else if (e.data.type === 'calculate' && wasm) {
        try {
            const { operation, a, b } = e.data.payload;
            let result;
            
            switch (operation) {
                case 'add':
                    result = wasm.add(a, b);
                    break;
                case 'subtract':
                    result = wasm.subtract(a, b);
                    break;
                case 'multiply':
                    result = wasm.multiply(a, b);
                    break;
                case 'divide':
                    if (b === 0) {
                        throw new Error('Division by zero');
                    }
                    result = wasm.divide(a, b);
                    break;
                default:
                    throw new Error('Unsupported operation');
            }
            
            self.postMessage({ 
                type: 'result', 
                data: result,
                operation: operation
            });
        } catch (err) {
            self.postMessage({ type: 'error', error: err.message });
        }
    }
};