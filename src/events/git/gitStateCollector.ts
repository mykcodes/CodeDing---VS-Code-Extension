import * as vscode from 'vscode';
import { EventBus } from '../../core/eventBus';
import { SessionManager } from '../../core/sessionManager';
import { GitEvent, GitStateSnapshot } from '../../core/types';
import { Logger } from '../../diagnostics/logger';

// Type definitions to interact with the VS Code Git Extension API
interface GitExtension {
    getAPI(version: 1): GitAPI;
}

interface GitAPI {
    repositories: Repository[];
    onDidOpenRepository: vscode.Event<Repository>;
    onDidCloseRepository: vscode.Event<Repository>;
}

interface Repository {
    state: RepositoryState;
}

interface RepositoryState {
    HEAD?: Branch;
    workingTreeChanges: any[];
    indexChanges: any[];
    mergeChanges: any[];
    untrackedChanges: any[];
    onDidChange: vscode.Event<void>;
}

interface Branch {
    name?: string;
    commit?: string;
}

export class GitStateCollector {
    private disposables: vscode.Disposable[] = [];
    private repoDisposables = new Map<Repository, vscode.Disposable[]>();
    private repoSnapshots = new Map<Repository, GitStateSnapshot>();
    
    private eventBus: EventBus;
    private sessionManager: SessionManager;

    constructor(eventBus: EventBus, sessionManager: SessionManager) {
        this.eventBus = eventBus;
        this.sessionManager = sessionManager;
    }

    public async start() {
        try {
            const extension = vscode.extensions.getExtension<GitExtension>('vscode.git');
            if (!extension) {
                Logger.log('Git extension not available. Git collection disabled.');
                return;
            }

            const isActive = extension.isActive;
            if (!isActive) {
                await extension.activate();
            }

            const gitApi = extension.exports.getAPI(1);
            if (!gitApi) {
                Logger.log('Git API v1 not available.');
                return;
            }

            // Register existing repos
            gitApi.repositories.forEach(repo => this.registerRepository(repo));

            // Listen for new repos
            this.disposables.push(
                gitApi.onDidOpenRepository(repo => this.registerRepository(repo)),
                gitApi.onDidCloseRepository(repo => this.unregisterRepository(repo))
            );

            Logger.log('GitStateCollector started.');
        } catch (e) {
            Logger.error('Failed to start GitStateCollector', e);
        }
    }

    private registerRepository(repo: Repository) {
        if (this.repoDisposables.has(repo)) {
            return;
        }

        Logger.debug('Registering Git repository for monitoring.');

        // Establish internal baseline snapshot WITHOUT emitting an event
        const baseline = this.computeSnapshot(repo.state);
        this.repoSnapshots.set(repo, baseline);

        const disposable = repo.state.onDidChange(() => {
            this.handleStateChange(repo);
        });

        this.repoDisposables.set(repo, [disposable]);
    }

    private unregisterRepository(repo: Repository) {
        const disposables = this.repoDisposables.get(repo);
        if (disposables) {
            disposables.forEach(d => d.dispose());
            this.repoDisposables.delete(repo);
        }
        this.repoSnapshots.delete(repo);
    }

    private computeSnapshot(state: RepositoryState): GitStateSnapshot {
        // Compute unique changed files
        const uniquePaths = new Set<string>();

        const addPaths = (changes: any[]) => {
            for (const change of changes) {
                if (change.uri && change.uri.fsPath) {
                    uniquePaths.add(change.uri.fsPath);
                }
            }
        };

        addPaths(state.workingTreeChanges);
        addPaths(state.indexChanges);
        addPaths(state.mergeChanges);
        addPaths(state.untrackedChanges);

        const changedFileCount = uniquePaths.size;

        return {
            branch: state.HEAD?.name,
            head: state.HEAD?.commit,
            isDirty: changedFileCount > 0,
            changedFileCount: changedFileCount
        };
    }

    private handleStateChange(repo: Repository) {
        const currentState = this.computeSnapshot(repo.state);
        const previousState = this.repoSnapshots.get(repo);

        if (!previousState) {
            // Should not happen as we baseline on registration
            this.repoSnapshots.set(repo, currentState);
            return;
        }

        // Compare state to determine if a meaningful transition occurred
        if (
            currentState.branch !== previousState.branch ||
            currentState.head !== previousState.head ||
            currentState.isDirty !== previousState.isDirty ||
            currentState.changedFileCount !== previousState.changedFileCount
        ) {
            const now = Date.now();
            const gitEvent: GitEvent = {
                id: `git_${now}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: now,
                type: "git",
                workspaceId: this.sessionManager.getWorkspaceId(),
                metadata: {
                    action: "state_changed",
                    previous: previousState,
                    current: currentState
                }
            };

            this.eventBus.emit(gitEvent);
            this.repoSnapshots.set(repo, currentState);
        }
    }

    public dispose() {
        this.disposables.forEach(d => d.dispose());
        this.repoDisposables.forEach(disposables => disposables.forEach(d => d.dispose()));
        this.repoDisposables.clear();
        this.repoSnapshots.clear();
    }
}
