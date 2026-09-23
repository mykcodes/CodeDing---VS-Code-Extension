import * as vscode from 'vscode';
import { ConfigurationService } from '../config/configurationService';
import { AudioService } from '../audio/audioService';
import { QueryService } from '../core/queryService';
import { SessionManager } from '../core/sessionManager';
import { ReportGenerator } from '../diagnostics/reportGenerator';
import { TimelineWebview } from '../ui/timelineWebview';
import { EventBus } from '../core/eventBus';

export class CommandRegistrar {
    private configService: ConfigurationService;
    private audioService: AudioService;
    private queryService?: QueryService;
    private sessionManager?: SessionManager;
    private reportGenerator?: ReportGenerator;
    private eventBus?: EventBus;
    private extensionUri?: vscode.Uri;

    constructor(
        configService: ConfigurationService, 
        audioService: AudioService,
        queryService?: QueryService,
        sessionManager?: SessionManager,
        reportGenerator?: ReportGenerator,
        eventBus?: EventBus,
        extensionUri?: vscode.Uri
    ) {
        this.configService = configService;
        this.audioService = audioService;
        this.queryService = queryService;
        this.sessionManager = sessionManager;
        this.reportGenerator = reportGenerator;
        this.eventBus = eventBus;
        this.extensionUri = extensionUri;
    }

    public register(context: vscode.ExtensionContext) {
        context.subscriptions.push(
            vscode.commands.registerCommand('devtrace.openTimeline', () => this.openTimeline()),
            vscode.commands.registerCommand('devtrace.startSession', () => this.startSession()),
            vscode.commands.registerCommand('devtrace.createDebugReport', (eventId: string) => this.createDebugReport(eventId)),
            vscode.commands.registerCommand('devtrace.clearHistory', () => this.clearHistory()),
            vscode.commands.registerCommand('codeding.chooseSuccessSound', () => this.chooseSound('success')),
            vscode.commands.registerCommand('codeding.chooseErrorSound', () => this.chooseSound('error')),
            vscode.commands.registerCommand('codeding.testSuccessSound', () => this.testSound('success')),
            vscode.commands.registerCommand('codeding.testErrorSound', () => this.testSound('error')),
            vscode.commands.registerCommand('codeding.resetSuccessSound', () => this.resetSound('success')),
            vscode.commands.registerCommand('codeding.resetErrorSound', () => this.resetSound('error')),
            vscode.commands.registerCommand('codeding.openSettings', () => this.openSettings()),
            vscode.commands.registerCommand('codeding.toggle', () => this.toggleEnabled())
        );
    }

    private openTimeline() {
        if (this.extensionUri && this.queryService && this.eventBus && this.sessionManager) {
            TimelineWebview.createOrShow(this.extensionUri, this.queryService, this.eventBus, this.sessionManager);
        } else {
            vscode.window.showErrorMessage('DevTrace is not fully initialized.');
        }
    }

    private async startSession() {
        if (this.sessionManager) {
            this.sessionManager.endSession();
            this.sessionManager.startSession();
            vscode.window.showInformationMessage('Started new DevTrace session.');
            // Refresh timeline if open
            if (this.extensionUri && this.queryService && this.eventBus) {
                // Not ideal, but creating or showing will reveal it
                TimelineWebview.createOrShow(this.extensionUri, this.queryService, this.eventBus, this.sessionManager);
            }
        }
    }

    private async createDebugReport(eventId?: string) {
        if (!this.reportGenerator) return;
        
        const targetEventId = eventId;
        
        // If not provided (e.g. from command palette), we'd normally prompt, 
        // but for now we expect it to be called from the Webview mostly.
        if (!targetEventId) {
            vscode.window.showInformationMessage('Please select an event from the Timeline to generate a report.');
            return;
        }

        const reportMarkdown = await this.reportGenerator.generate(targetEventId);
        
        const doc = await vscode.workspace.openTextDocument({ content: reportMarkdown, language: 'markdown' });
        await vscode.window.showTextDocument(doc, { preview: false });
    }

    private async clearHistory() {
        if (!this.sessionManager || !this.queryService) return;

        const sessionId = this.sessionManager.getSession()?.id;
        if (!sessionId) return;

        const answer = await vscode.window.showWarningMessage(
            `Delete DevTrace history for this workspace session?`,
            { modal: true },
            'Delete'
        );

        if (answer === 'Delete') {
            await this.queryService.clearSessionHistory(sessionId);
            vscode.window.showInformationMessage('DevTrace session history cleared.');
            // Need to notify webview to clear
            this.startSession(); // starting a new session creates a fresh file and refreshes UI
        }
    }

    private async chooseSound(type: 'success' | 'error') {
        const uris = await vscode.window.showOpenDialog({
            canSelectMany: false,
            filters: {
                'WAV Audio': ['wav']
            },
            title: `Select Custom ${type === 'success' ? 'Success' : 'Error'} Sound`
        });

        if (uris && uris.length > 0) {
            const path = uris[0].fsPath;
            if (type === 'success') {
                await this.configService.updateSuccessSound(path);
                vscode.window.showInformationMessage(`Success sound set to: ${path}`);
            } else {
                await this.configService.updateErrorSound(path);
                vscode.window.showInformationMessage(`Error sound set to: ${path}`);
            }
        }
    }

    private async testSound(type: 'success' | 'error') {
        try {
            if (type === 'success') {
                await this.audioService.playSuccess();
            } else {
                await this.audioService.playError();
            }
        } catch (e) {
            vscode.window.showErrorMessage(`Failed to play ${type} sound: ${e instanceof Error ? e.message : e}`);
        }
    }

    private async resetSound(type: 'success' | 'error') {
        if (type === 'success') {
            await this.configService.resetSuccessSound();
            vscode.window.showInformationMessage('Success sound reset to default.');
        } else {
            await this.configService.resetErrorSound();
            vscode.window.showInformationMessage('Error sound reset to default.');
        }
    }

    private openSettings() {
        vscode.commands.executeCommand('workbench.action.openSettings', 'codeding');
    }

    private async toggleEnabled() {
        await this.configService.toggleEnabled();
        const enabled = this.configService.getConfiguration().enabled;
        vscode.window.showInformationMessage(`CodeDing is now ${enabled ? 'Enabled' : 'Disabled'}.`);
    }
}
