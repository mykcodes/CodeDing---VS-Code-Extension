import * as vscode from 'vscode';
import { DevTraceEvent } from './types';
import { Logger } from '../diagnostics/logger';

export class EventStore {
    private storageUri: vscode.Uri;
    private logFileUri?: vscode.Uri;

    constructor(context: vscode.ExtensionContext) {
        // We use workspace storage because DevTrace is project-scoped
        this.storageUri = context.storageUri || context.globalStorageUri;
    }

    public async initialize(sessionId: string) {
        try {
            await vscode.workspace.fs.createDirectory(this.storageUri);
            this.logFileUri = vscode.Uri.joinPath(this.storageUri, `${sessionId}.jsonl`);
            Logger.debug(`EventStore initialized at ${this.logFileUri.fsPath}`);
        } catch (e) {
            Logger.error('Failed to initialize EventStore', e);
        }
    }

    public async appendEvent(event: DevTraceEvent) {
        if (!this.logFileUri) {
            Logger.debug('EventStore not initialized. Cannot append event.');
            return;
        }

        const data = JSON.stringify(event) + '\n';
        const buffer = Buffer.from(data, 'utf8');

        try {
            // Check if file exists, if so append, else write new
            let existingData = Buffer.alloc(0);
            try {
                const readData = await vscode.workspace.fs.readFile(this.logFileUri);
                existingData = Buffer.from(readData);
            } catch (e) {
                // File does not exist, which is fine
            }

            const combinedData = Buffer.concat([existingData, buffer]);

            await vscode.workspace.fs.writeFile(this.logFileUri, combinedData);
        } catch (e) {
            Logger.error('Failed to append event to EventStore', e);
        }
    }
}
