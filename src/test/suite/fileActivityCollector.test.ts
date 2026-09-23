import * as assert from 'assert';
import * as vscode from 'vscode';
import { FileActivityCollector } from '../../events/file/fileActivityCollector';
import { EventBus } from '../../core/eventBus';
import { SessionManager } from '../../core/sessionManager';
import { FileEvent } from '../../core/types';

suite('FileActivityCollector Test Suite', () => {
    let eventBus: EventBus;
    let sessionManager: SessionManager;
    let collector: FileActivityCollector;
    let emittedEvents: FileEvent[] = [];

    setup(() => {
        eventBus = new EventBus();
        sessionManager = new SessionManager(eventBus);
        collector = new FileActivityCollector(eventBus, sessionManager);
        emittedEvents = [];

        eventBus.onDidReceiveEvent(e => {
            if (e.type === 'file') {
                emittedEvents.push(e as FileEvent);
            }
        });
    });

    teardown(() => {
        collector.dispose();
        sessionManager.dispose();
        eventBus.dispose();
    });

    test('isIgnored blocks ignored folders', () => {
        // Expose private method for testing via any cast
        const isIgnored = (collector as any).isIgnored.bind(collector);

        assert.strictEqual(isIgnored('.git/config'), true);
        assert.strictEqual(isIgnored('node_modules/express/index.js'), true);
        assert.strictEqual(isIgnored('src/node_modules_fake/index.js'), false); // partial match doesn't ignore unless exact segment
        assert.strictEqual(isIgnored('build/main.js'), true);
        assert.strictEqual(isIgnored('src/main.ts'), false);
    });

    // Note: It's hard to mock VS Code Workspace events (onDidSaveTextDocument) completely 
    // without spinning up actual files. But we can test the internal handleFileEvent logic.
    test('handleFileEvent deduplicates rapid events', async () => {
        const handleFileEvent = (collector as any).handleFileEvent.bind(collector);
        const uri = vscode.Uri.file('/fake/workspace/src/app.ts');

        // Mock workspace.getWorkspaceFolder and asRelativePath
        const originalGetFolder = vscode.workspace.getWorkspaceFolder;
        const originalRelativePath = vscode.workspace.asRelativePath;
        
        (vscode.workspace as any).getWorkspaceFolder = () => ({ uri: vscode.Uri.file('/fake/workspace'), name: 'fake', index: 0 });
        (vscode.workspace as any).asRelativePath = () => 'src/app.ts';

        try {
            handleFileEvent('modified', uri);
            handleFileEvent('modified', uri);
            handleFileEvent('modified', uri);

            assert.strictEqual(emittedEvents.length, 1);
            assert.strictEqual(emittedEvents[0].metadata.action, 'modified');
            assert.strictEqual(emittedEvents[0].metadata.relativePath, 'src/app.ts');

            // Wait 1.1s to bypass dedupe
            await new Promise(resolve => setTimeout(resolve, 1100));

            handleFileEvent('modified', uri);
            assert.strictEqual(emittedEvents.length, 2);

        } finally {
            (vscode.workspace as any).getWorkspaceFolder = originalGetFolder;
            (vscode.workspace as any).asRelativePath = originalRelativePath;
        }
    });
});
