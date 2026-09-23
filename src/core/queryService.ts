import * as vscode from 'vscode';
import { DevTraceEvent } from './types';
import { Logger } from '../diagnostics/logger';

export interface QueryOptions {
    limit?: number;
    offset?: number;
    filterType?: string;
}

export class QueryService {
    private storageUri: vscode.Uri;

    constructor(context: vscode.ExtensionContext) {
        this.storageUri = context.storageUri || context.globalStorageUri;
    }

    private async readAllEvents(sessionId: string): Promise<DevTraceEvent[]> {
        const logFileUri = vscode.Uri.joinPath(this.storageUri, `${sessionId}.jsonl`);
        try {
            const data = await vscode.workspace.fs.readFile(logFileUri);
            const strContent = Buffer.from(data).toString('utf8');
            const lines = strContent.trim().split('\n');
            const events: DevTraceEvent[] = [];
            for (const line of lines) {
                if (!line) continue;
                try {
                    events.push(JSON.parse(line));
                } catch (e) {
                    Logger.error('Failed to parse event line', e);
                }
            }
            return events;
        } catch (e) {
            Logger.debug(`No events found or failed to read session ${sessionId}`);
            return [];
        }
    }

    public async getEvents(sessionId: string, options?: QueryOptions): Promise<DevTraceEvent[]> {
        let events = await this.readAllEvents(sessionId);
        
        if (options?.filterType && options.filterType !== 'all') {
            events = events.filter(e => e.type === options.filterType);
        }

        if (options?.offset !== undefined) {
            events = events.slice(options.offset);
        }
        
        if (options?.limit !== undefined) {
            events = events.slice(0, options.limit);
        }

        return events;
    }

    public async getRecentEvents(sessionId: string, count: number): Promise<DevTraceEvent[]> {
        const events = await this.readAllEvents(sessionId);
        return events.slice(-count);
    }

    public async searchEvents(sessionId: string, query: string): Promise<DevTraceEvent[]> {
        const events = await this.readAllEvents(sessionId);
        const lowerQuery = query.toLowerCase();
        
        return events.filter(e => {
            const metadataStr = JSON.stringify(e.metadata || {}).toLowerCase();
            return metadataStr.includes(lowerQuery);
        });
    }

    public async getEventsAround(sessionId: string, eventId: string, options: { before: number, after: number }): Promise<DevTraceEvent[]> {
        const events = await this.readAllEvents(sessionId);
        const targetIndex = events.findIndex(e => e.id === eventId);
        
        if (targetIndex === -1) {
            return [];
        }

        const startIndex = Math.max(0, targetIndex - options.before);
        const endIndex = Math.min(events.length, targetIndex + options.after + 1);
        
        return events.slice(startIndex, endIndex);
    }

    public async clearSessionHistory(sessionId: string): Promise<void> {
        const logFileUri = vscode.Uri.joinPath(this.storageUri, `${sessionId}.jsonl`);
        try {
            await vscode.workspace.fs.delete(logFileUri, { useTrash: false });
        } catch (e) {
            Logger.error(`Failed to clear history for session ${sessionId}`, e);
        }
    }
}
