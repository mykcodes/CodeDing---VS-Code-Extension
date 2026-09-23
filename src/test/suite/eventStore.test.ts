import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';

import { EventStore } from '../../core/eventStore';
import { TerminalEvent } from '../../core/types';

suite('EventStore Test Suite', () => {
    let mockContext: vscode.ExtensionContext;
    let tempDir: vscode.Uri;
    let sessionId: string;
    let eventStore: EventStore;

    setup(async () => {
        const tmpPath = path.join(os.tmpdir(), `devtrace-test-${Date.now()}`);
        tempDir = vscode.Uri.file(tmpPath);
        
        mockContext = {
            storageUri: tempDir,
            globalStorageUri: tempDir
        } as unknown as vscode.ExtensionContext;
        
        sessionId = `test_session_${Date.now()}`;
        eventStore = new EventStore(mockContext);
        await eventStore.initialize(sessionId);
    });

    teardown(async () => {
        try {
            await vscode.workspace.fs.delete(tempDir, { recursive: true, useTrash: false });
        } catch (e) {
            // Ignore teardown errors
        }
    });

    test('Appends and creates new file', async () => {
        const event: TerminalEvent = {
            id: '1',
            timestamp: 12345,
            type: 'terminal',
            workspaceId: 'test',
            metadata: {
                command: 'echo test',
                executionType: 'ordinaryCommand',
                category: 'other',
                success: true
            }
        };

        await eventStore.appendEvent(event);
        
        const logFileUri = vscode.Uri.joinPath(tempDir, `${sessionId}.jsonl`);
        const content = await vscode.workspace.fs.readFile(logFileUri);
        const strContent = Buffer.from(content).toString('utf8');
        
        const lines = strContent.trim().split('\n');
        assert.strictEqual(lines.length, 1);
        
        const parsed = JSON.parse(lines[0]);
        assert.strictEqual(parsed.id, '1');
        assert.strictEqual(parsed.metadata.command, 'echo test');
    });

    test('Appends multiple events', async () => {
        for (let i = 0; i < 3; i++) {
            const event: TerminalEvent = {
                id: i.toString(),
                timestamp: 12345,
                type: 'terminal',
                workspaceId: 'test',
                metadata: {
                    command: `echo ${i}`,
                    executionType: 'ordinaryCommand',
                    category: 'other',
                    success: true
                }
            };
            await eventStore.appendEvent(event);
        }
        
        const logFileUri = vscode.Uri.joinPath(tempDir, `${sessionId}.jsonl`);
        const content = await vscode.workspace.fs.readFile(logFileUri);
        const strContent = Buffer.from(content).toString('utf8');
        
        const lines = strContent.trim().split('\n');
        assert.strictEqual(lines.length, 3);
        
        assert.strictEqual(JSON.parse(lines[0]).id, '0');
        assert.strictEqual(JSON.parse(lines[2]).id, '2');
    });
});
