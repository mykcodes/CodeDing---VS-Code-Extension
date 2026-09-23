import * as assert from 'assert';
import { ExecutionClassifier } from '../detection/executionClassifier';

suite('ExecutionClassifier Test Suite', () => {

    test('codeRun mode - known commands', () => {
        assert.strictEqual(ExecutionClassifier.classify('cd my-project', 'codeRun').type, 'ordinaryCommand');
        assert.strictEqual(ExecutionClassifier.classify('ls -al', 'codeRun').type, 'ordinaryCommand');
        assert.strictEqual(ExecutionClassifier.classify('echo hello', 'codeRun').type, 'ordinaryCommand');
    });

    test('codeRun mode - build/run commands', () => {
        assert.strictEqual(ExecutionClassifier.classify('npm run build', 'codeRun').type, 'codeExecution');
        assert.strictEqual(ExecutionClassifier.classify('python app.py', 'codeRun').type, 'codeExecution');
        assert.strictEqual(ExecutionClassifier.classify('node index.js', 'codeRun').type, 'codeExecution');
        assert.strictEqual(ExecutionClassifier.classify('go run main.go', 'codeRun').type, 'codeExecution');
        assert.strictEqual(ExecutionClassifier.classify('./program', 'codeRun').type, 'codeExecution');
        assert.strictEqual(ExecutionClassifier.classify('.\\program.exe', 'codeRun').type, 'codeExecution');
    });

    test('codeRun mode - categories', () => {
        assert.strictEqual(ExecutionClassifier.classify('npm run build', 'codeRun').category, 'build');
        assert.strictEqual(ExecutionClassifier.classify('npm test', 'codeRun').category, 'test');
        assert.strictEqual(ExecutionClassifier.classify('pytest test_app.py', 'codeRun').category, 'test');
        assert.strictEqual(ExecutionClassifier.classify('git status', 'codeRun').category, 'git');
        assert.strictEqual(ExecutionClassifier.classify('tsc', 'codeRun').category, 'compiler');
    });

    test('codeRun mode - unknown commands', () => {
        assert.strictEqual(ExecutionClassifier.classify('some_random_cmd', 'codeRun').type, 'unknown');
    });

    test('allTerminalCommands mode', () => {
        assert.strictEqual(ExecutionClassifier.classify('cd dir', 'allTerminalCommands').type, 'codeExecution');
        assert.strictEqual(ExecutionClassifier.classify('python app.py', 'allTerminalCommands').type, 'codeExecution');
        assert.strictEqual(ExecutionClassifier.classify('some_random_cmd', 'allTerminalCommands').type, 'codeExecution');
    });

    test('custom mode', () => {
        const custom = ['^test-cmd', 'build-it'];
        assert.strictEqual(ExecutionClassifier.classify('test-cmd something', 'custom', custom).type, 'codeExecution');
        assert.strictEqual(ExecutionClassifier.classify('build-it --all', 'custom', custom).type, 'codeExecution');
        assert.strictEqual(ExecutionClassifier.classify('python app.py', 'custom', custom).type, 'ordinaryCommand');
        
        // Invalid regex fallback
        assert.strictEqual(ExecutionClassifier.classify('npm run', 'custom', ['[']).type, 'unknown');
    });

});

