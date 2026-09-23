import * as vscode from 'vscode';
import { EventBus } from '../../core/eventBus';
import { SessionManager } from '../../core/sessionManager';
import { FileEvent, FileAction } from '../../core/types';
import { Logger } from '../../diagnostics/logger';

export class FileActivityCollector {
    private disposables: vscode.Disposable[] = [];
    private eventBus: EventBus;
    private sessionManager: SessionManager;

    // Default noisy folders to ignore
    private ignoredFolders = [
        '.git', 'node_modules', 'dist', 'out', 'build', 'coverage', '.next', '.cache'
    ];

    // Simple dedupe tracking: map of "action:path" -> timestamp
    private lastEventTimes = new Map<string, number>();
    private readonly DEBOUNCE_MS = 1000; // 1 second dedupe window

    constructor(eventBus: EventBus, sessionManager: SessionManager) {
        this.eventBus = eventBus;
        this.sessionManager = sessionManager;
    }

    public start() {
        this.disposables.push(
            vscode.workspace.onDidSaveTextDocument((doc) => {
                this.handleFileEvent('modified', doc.uri);
            }),
            vscode.workspace.onDidCreateFiles((e) => {
                for (const uri of e.files) {
                    this.handleFileEvent('created', uri);
                }
            }),
            vscode.workspace.onDidDeleteFiles((e) => {
                for (const uri of e.files) {
                    this.handleFileEvent('deleted', uri);
                }
            }),
            vscode.workspace.onDidRenameFiles((e) => {
                for (const rename of e.files) {
                    this.handleFileEvent('renamed', rename.newUri, rename.oldUri);
                }
            })
        );
        Logger.log('FileActivityCollector started.');
    }

    private handleFileEvent(action: FileAction, uri: vscode.Uri, oldUri?: vscode.Uri) {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        if (!workspaceFolder) {
            // Ignore files outside the workspace to protect privacy
            return;
        }

        const relativePath = vscode.workspace.asRelativePath(uri, false);
        let oldRelativePath: string | undefined;

        if (oldUri) {
            const oldWorkspaceFolder = vscode.workspace.getWorkspaceFolder(oldUri);
            if (oldWorkspaceFolder) {
                oldRelativePath = vscode.workspace.asRelativePath(oldUri, false);
            }
        }

        if (this.isIgnored(relativePath) || (oldRelativePath && this.isIgnored(oldRelativePath))) {
            return;
        }

        const now = Date.now();
        const dedupeKey = `${action}:${relativePath}`;
        const lastTime = this.lastEventTimes.get(dedupeKey);

        if (lastTime && (now - lastTime) < this.DEBOUNCE_MS) {
            // Suppress duplicate event
            return;
        }

        this.lastEventTimes.set(dedupeKey, now);

        const fileEvent: FileEvent = {
            id: `file_${now}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: now,
            type: "file",
            workspaceId: this.sessionManager.getWorkspaceId(), // Use session workspace ID
            metadata: {
                action: action,
                relativePath: relativePath,
                oldRelativePath: oldRelativePath
            }
        };

        this.eventBus.emit(fileEvent);
    }

    private isIgnored(relativePath: string): boolean {
        // Convert paths like .git/foo or node_modules/bar to array of segments
        const segments = relativePath.split(/[/\\]/);
        for (const segment of segments) {
            if (this.ignoredFolders.includes(segment)) {
                return true;
            }
        }
        return false;
    }

    public dispose() {
        this.disposables.forEach(d => d.dispose());
        this.lastEventTimes.clear();
    }
}
