import * as vscode from 'vscode';
import { ConfigurationService } from '../config/configurationService';
import { AudioService } from '../audio/audioService';

export class CommandRegistrar {
    private configService: ConfigurationService;
    private audioService: AudioService;

    constructor(configService: ConfigurationService, audioService: AudioService) {
        this.configService = configService;
        this.audioService = audioService;
    }

    public register(context: vscode.ExtensionContext) {
        context.subscriptions.push(
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
