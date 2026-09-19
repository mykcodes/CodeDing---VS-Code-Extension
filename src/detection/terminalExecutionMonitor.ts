import * as vscode from 'vscode';
import { Logger } from '../diagnostics/logger';
import { AudioService } from '../audio/audioService';
import { ExecutionClassifier } from './executionClassifier';
import { ConfigurationService } from '../config/configurationService';

export class TerminalExecutionMonitor {
    private audioService: AudioService;
    private configService: ConfigurationService;
    private disposables: vscode.Disposable[] = [];

    constructor(audioService: AudioService, configService: ConfigurationService) {
        this.audioService = audioService;
        this.configService = configService;
    }

    public start() {
        if (!vscode.window.onDidEndTerminalShellExecution) {
            Logger.log('Shell integration API (onDidEndTerminalShellExecution) is not available in this VS Code version.');
            return;
        }

        this.disposables.push(
            vscode.window.onDidEndTerminalShellExecution((event) => {
                this.handleExecutionEnd(event);
            })
        );

        if (vscode.window.onDidChangeTerminalShellIntegration) {
            this.disposables.push(
                vscode.window.onDidChangeTerminalShellIntegration((event) => {
                    // We only log this for diagnostics, we don't need to act on it for sound playback
                    Logger.debug(`Shell integration state changed for terminal: ${event.terminal.name}`);
                })
            );
        }

        Logger.log('TerminalExecutionMonitor started.');
    }

    private handleExecutionEnd(event: vscode.TerminalShellExecutionEndEvent) {
        const exitCode = event.exitCode;
        const commandLine = event.execution.commandLine;

        if (exitCode === undefined) {
            Logger.debug('Execution ended with undefined exitCode (UNKNOWN state). No sound will be played.');
            return;
        }

        let cmdStr = '';
        if (commandLine && typeof commandLine.value === 'string') {
            cmdStr = commandLine.value;
            // If confidence is low, we might want to degrade to unknown
            if (commandLine.isTrusted === false) {
                Logger.debug('Command line is untrusted. Treating as unknown execution.');
                return;
            }
        } else {
            Logger.debug('Command line information unavailable. Treating as unknown execution.');
            return;
        }

        const config = this.configService.getConfiguration();
        const classification = ExecutionClassifier.classify(cmdStr, config.triggerMode, config.customCommands);

        if (classification === 'ordinaryCommand' || classification === 'unknown') {
            Logger.debug(`Execution classified as ${classification}. Ignoring.`);
            return;
        }

        if (classification === 'codeExecution') {
            if (exitCode === 0) {
                Logger.debug(`Code execution SUCCESS: exitCode=0, cmd=${cmdStr}`);
                this.audioService.playSuccess().catch(err => Logger.error('Error playing success sound', err));
            } else {
                Logger.debug(`Code execution ERROR: exitCode=${exitCode}, cmd=${cmdStr}`);
                this.audioService.playError().catch(err => Logger.error('Error playing error sound', err));
            }
        }
    }

    public dispose() {
        this.disposables.forEach(d => d.dispose());
    }
}
