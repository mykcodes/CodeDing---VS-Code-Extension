import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import { QueryService } from '../../core/queryService';
import { EventStore } from '../../core/eventStore';
import { DevTraceEvent } from '../../core/types';

suite('QueryService Test Suite', () => {
    let mockContext: vscode.ExtensionContext;
    let tempDir: vscode.Uri;
    let sessionId: string;
    let eventStore: EventStore;
    let queryService: QueryService;

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
        
        queryService = new QueryService(mockContext);
    });

    teardown(async () => {
        try {
            await vscode.workspace.fs.delete(tempDir, { recursive: true, useTrash: false });
        } catch (e) {
            // Ignore teardown errors
        }
    });

    test('getEvents applies limits and filters', async () => {
        for (let i = 0; i < 5; i++) {
            await eventStore.appendEvent({
                id: `evt_${i}`,
                timestamp: 1000 + i,
                type: i % 2 === 0 ? 'terminal' : 'file',
                workspaceId: 'test',
                metadata: {}
            } as DevTraceEvent);
        }

        const all = await queryService.getEvents(sessionId);
        assert.strictEqual(all.length, 5);

        const terminalOnly = await queryService.getEvents(sessionId, { filterType: 'terminal' });
        assert.strictEqual(terminalOnly.length, 3); // 0, 2, 4

        const limited = await queryService.getEvents(sessionId, { limit: 2 });
        assert.strictEqual(limited.length, 2);
    });

    test('searchEvents finds matching text in metadata', async () => {
        await eventStore.appendEvent({
            id: 'evt_1',
            timestamp: 1000,
            type: 'terminal',
            workspaceId: 'test',
            metadata: { command: 'npm run build' }
        } as unknown as DevTraceEvent);
        
        await eventStore.appendEvent({
            id: 'evt_2',
            timestamp: 1001,
            type: 'file',
            workspaceId: 'test',
            metadata: { relativePath: 'src/app.ts' }
        } as unknown as DevTraceEvent);

        const results1 = await queryService.searchEvents(sessionId, 'build');
        assert.strictEqual(results1.length, 1);
        assert.strictEqual(results1[0].id, 'evt_1');

        const results2 = await queryService.searchEvents(sessionId, 'app.ts');
        assert.strictEqual(results2.length, 1);
        assert.strictEqual(results2[0].id, 'evt_2');
        
        const results3 = await queryService.searchEvents(sessionId, 'missing');
        assert.strictEqual(results3.length, 0);
    });

    test('getEventsAround extracts context slice', async () => {
        for (let i = 0; i < 10; i++) {
            await eventStore.appendEvent({
                id: `evt_${i}`,
                timestamp: 1000 + i,
                type: 'terminal',
                workspaceId: 'test',
                metadata: {}
            } as DevTraceEvent);
        }

        // target is evt_5, get 2 before, 1 after -> 3, 4, 5, 6
        const context = await queryService.getEventsAround(sessionId, 'evt_5', { before: 2, after: 1 });
        assert.strictEqual(context.length, 4);
        assert.strictEqual(context[0].id, 'evt_3');
        assert.strictEqual(context[3].id, 'evt_6');
    });
});
