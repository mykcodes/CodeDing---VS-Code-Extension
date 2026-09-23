import * as vscode from 'vscode';
import { Session, DevTraceEvent } from './types';
import { EventBus } from './eventBus';
import { Logger } from '../diagnostics/logger';

export class SessionManager {
    private currentSession?: Session;
    private workspaceId: string;
    private disposables: vscode.Disposable[] = [];

    constructor(private eventBus: EventBus) {
        // Compute a stable workspace ID
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            // Hash or encode the URI to create a safe ID
            this.workspaceId = encodeURIComponent(workspaceFolders[0].uri.toString());
        } else {
            this.workspaceId = 'global-no-workspace';
        }

        this.disposables.push(
            this.eventBus.onDidReceiveEvent((event) => this.handleEvent(event))
        );
    }

    public startSession(): Session {
        const now = Date.now();
        const sessionId = `session_${now}`;
        
        this.currentSession = {
            id: sessionId,
            workspaceId: this.workspaceId,
            startTime: now,
            lastActivity: now,
            eventCount: 0,
            status: 'active'
        };

        Logger.debug(`Started DevTrace session: ${sessionId} for workspace: ${this.workspaceId}`);
        return this.currentSession;
    }

    public endSession() {
        if (this.currentSession) {
            this.currentSession.status = 'completed';
            this.currentSession.lastActivity = Date.now();
            Logger.debug(`Ended DevTrace session: ${this.currentSession.id}`);
            // Note: In future we might persist the final session state
        }
    }

    public getSession(): Session | undefined {
        return this.currentSession;
    }

    public getWorkspaceId(): string {
        return this.workspaceId;
    }

    private handleEvent(event: DevTraceEvent) {
        if (this.currentSession && this.currentSession.status === 'active') {
            this.currentSession.eventCount++;
            this.currentSession.lastActivity = event.timestamp;
        }
    }

    public dispose() {
        this.disposables.forEach(d => d.dispose());
    }
}
