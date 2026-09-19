import * as assert from 'assert';
import { ExecutionClassifier } from '../detection/executionClassifier';

suite('ExecutionClassifier Test Suite', () => {

    test('codeRun mode - known commands', () => {
        assert.strictEqual(ExecutionClassifier.classify('cd my-project', 'codeRun'), 'ordinaryCommand');
        assert.strictEqual(ExecutionClassifier.classify('ls -al', 'codeRun'), 'ordinaryCommand');
        assert.strictEqual(ExecutionClassifier.classify('echo hello', 'codeRun'), 'ordinaryCommand');
    });

    test('codeRun mode - build/run commands', () => {
        assert.strictEqual(ExecutionClassifier.classify('npm run build', 'codeRun'), 'codeExecution');
        assert.strictEqual(ExecutionClassifier.classify('python app.py', 'codeRun'), 'codeExecution');
        assert.strictEqual(ExecutionClassifier.classify('node index.js', 'codeRun'), 'codeExecution');
        assert.strictEqual(ExecutionClassifier.classify('go run main.go', 'codeRun'), 'codeExecution');
        assert.strictEqual(ExecutionClassifier.classify('./program', 'codeRun'), 'codeExecution');
        assert.strictEqual(ExecutionClassifier.classify('.\\program.exe', 'codeRun'), 'codeExecution');
    });

    test('codeRun mode - unknown commands', () => {
        // Just some random command not in the explicit allowlist/blocklist
        assert.strictEqual(ExecutionClassifier.classify('some_random_cmd', 'codeRun'), 'unknown');
    });

    test('allTerminalCommands mode', () => {
        assert.strictEqual(ExecutionClassifier.classify('cd dir', 'allTerminalCommands'), 'codeExecution');
        assert.strictEqual(ExecutionClassifier.classify('python app.py', 'allTerminalCommands'), 'codeExecution');
        assert.strictEqual(ExecutionClassifier.classify('some_random_cmd', 'allTerminalCommands'), 'codeExecution');
    });

    test('custom mode', () => {
        const custom = ['^test-cmd', 'build-it'];
        assert.strictEqual(ExecutionClassifier.classify('test-cmd something', 'custom', custom), 'codeExecution');
        assert.strictEqual(ExecutionClassifier.classify('build-it --all', 'custom', custom), 'codeExecution');
        assert.strictEqual(ExecutionClassifier.classify('python app.py', 'custom', custom), 'ordinaryCommand');
        
        // Invalid regex fallback
        assert.strictEqual(ExecutionClassifier.classify('npm run', 'custom', ['[']), 'unknown');
    });

});
