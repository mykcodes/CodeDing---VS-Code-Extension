import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import { QueryService } from '../../core/queryService';
import { EventStore } from '../../core/eventStore';
import { SessionManager } from '../../core/sessionManager';
import { ReportGenerator } from '../../diagnostics/reportGenerator';
import { EventBus } from '../../core/eventBus';
import { DevTraceEvent } from '../../core/types';

suite('ReportGenerator Test Suite', () => {
    let mockContext: vscode.ExtensionContext;
    let tempDir: vscode.Uri;
    let sessionId: string;
    let eventStore: EventStore;
    let queryService: QueryService;
    let sessionManager: SessionManager;
    let reportGenerator: ReportGenerator;
    let eventBus: EventBus;

    setup(async () => {
        const tmpPath = path.join(os.tmpdir(), `devtrace-test-${Date.now()}`);
        tempDir = vscode.Uri.file(tmpPath);
        
        mockContext = {
            storageUri: tempDir,
            globalStorageUri: tempDir
        } as unknown as vscode.ExtensionContext;
        
        eventBus = new EventBus();
        sessionManager = new SessionManager(eventBus);
        const session = sessionManager.startSession();
        sessionId = session.id;

        eventStore = new EventStore(mockContext);
        await eventStore.initialize(sessionId);
        
        queryService = new QueryService(mockContext);
        reportGenerator = new ReportGenerator(queryService, sessionManager);
    });

    teardown(async () => {
        eventBus.dispose();
        sessionManager.dispose();
        try {
            await vscode.workspace.fs.delete(tempDir, { recursive: true, useTrash: false });
        } catch (e) {
            // Ignore teardown errors
        }
    });

    test('generates factual redacted report', async () => {
        // 1. Add some context events
        await eventStore.appendEvent({
            id: 'evt_1', timestamp: 1000, type: 'file', workspaceId: 'test',
            metadata: { action: 'modified', relativePath: 'src/app.ts' }
        } as unknown as DevTraceEvent);

        // 2. Add target event with a secret
        await eventStore.appendEvent({
            id: 'evt_2', timestamp: 2000, type: 'terminal', workspaceId: 'test',
            metadata: { 
                command: 'npm run deploy --token=secret12345',
                exitCode: 1,
                cwd: '/fake'
            }
        } as unknown as DevTraceEvent);

        const markdown = await reportGenerator.generate('evt_2');

        // Verify factual elements
        assert.ok(markdown.includes('DevTrace Debug Report'));
        assert.ok(markdown.includes('**Exit Code:** 1'));
        assert.ok(markdown.includes('File modified: `src/app.ts`'));
        
        // Verify redaction
        assert.ok(markdown.includes('[REDACTED]'));
        assert.ok(!markdown.includes('secret12345'));
    });
});
