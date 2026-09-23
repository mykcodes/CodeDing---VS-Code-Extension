import * as vscode from 'vscode';
import { Logger } from '../diagnostics/logger';
import { AudioService } from '../audio/audioService';
import { ExecutionClassifier } from './executionClassifier';
import { ConfigurationService } from '../config/configurationService';
import { EventBus } from '../core/eventBus';
import { RedactionService } from '../privacy/redactionService';
import { TerminalEvent } from '../core/types';
import { SessionManager } from '../core/sessionManager';

export class TerminalExecutionMonitor {
    private audioService: AudioService;
    private configService: ConfigurationService;
    private eventBus: EventBus;
    private sessionManager: SessionManager;
    private disposables: vscode.Disposable[] = [];
    private executionStartTimes: Map<vscode.TerminalShellExecution, number> = new Map();

    constructor(
        audioService: AudioService, 
        configService: ConfigurationService,
        eventBus: EventBus,
        sessionManager: SessionManager
    ) {
        this.audioService = audioService;
        this.configService = configService;
        this.eventBus = eventBus;
        this.sessionManager = sessionManager;
    }

    public start() {
        if (!vscode.window.onDidEndTerminalShellExecution) {
            Logger.log('Shell integration API is not available in this VS Code version.');
            return;
        }

        if (vscode.window.onDidStartTerminalShellExecution) {
            this.disposables.push(
                vscode.window.onDidStartTerminalShellExecution((event) => {
                    this.executionStartTimes.set(event.execution, Date.now());
                })
            );
        }

        this.disposables.push(
            vscode.window.onDidEndTerminalShellExecution((event) => {
                this.handleExecutionEnd(event);
            })
        );

        if (vscode.window.onDidChangeTerminalShellIntegration) {
            this.disposables.push(
                vscode.window.onDidChangeTerminalShellIntegration((event) => {
                    Logger.debug(`Shell integration state changed for terminal: ${event.terminal.name}`);
                })
            );
        }

        Logger.log('TerminalExecutionMonitor started.');
    }

    private handleExecutionEnd(event: vscode.TerminalShellExecutionEndEvent) {
        const endTime = Date.now();
        const startTime = this.executionStartTimes.get(event.execution);
        this.executionStartTimes.delete(event.execution);
        
        const durationMs = startTime ? endTime - startTime : null;
        
        const exitCode = event.exitCode;
        const commandLine = event.execution.commandLine;

        if (exitCode === undefined) {
            Logger.debug('Execution ended with undefined exitCode. Treating as UNKNOWN state.');
        }

        let cmdStr = '';
        if (commandLine && typeof commandLine.value === 'string') {
            cmdStr = commandLine.value;
            if (commandLine.isTrusted === false) {
                Logger.debug('Command line is untrusted. Proceeding cautiously.');
            }
        } else {
            Logger.debug('Command line information unavailable. Ignoring.');
            return;
        }

        // 1. Classify
        const config = this.configService.getConfiguration();
        const classification = ExecutionClassifier.classify(cmdStr, config.triggerMode, config.customCommands);

        // 2. Redact
        const redactedCmd = RedactionService.redact(cmdStr);
        const success = exitCode === 0 ? true : (exitCode === undefined ? "unknown" : false);

        // 3. Emit DevTrace Event
        const terminalEvent: TerminalEvent = {
            id: `evt_${endTime}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: endTime,
            type: "terminal",
            workspaceId: this.sessionManager.getWorkspaceId(),
            metadata: {
                command: redactedCmd,
                shell: event.terminal.name,
                cwd: event.execution.cwd ? event.execution.cwd.fsPath : undefined,
                exitCode: exitCode,
                durationMs: durationMs,
                executionType: classification.type,
                category: classification.category,
                success: success
            }
        };

        this.eventBus.emit(terminalEvent);

        // 4. Backward Compatibility for Audio
        if (classification.type === 'ordinaryCommand' || classification.type === 'unknown') {
            return;
        }

        if (classification.type === 'codeExecution') {
            if (exitCode === 0) {
                this.audioService.playSuccess().catch(err => Logger.error('Error playing success sound', err));
            } else if (exitCode !== undefined) {
                this.audioService.playError().catch(err => Logger.error('Error playing error sound', err));
            }
        }
    }

    public dispose() {
        this.disposables.forEach(d => d.dispose());
        this.executionStartTimes.clear();
    }
}
