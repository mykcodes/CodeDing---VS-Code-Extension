import * as vscode from 'vscode';
import { CodeDingConfiguration, TriggerMode } from '../types';

export class ConfigurationService {
    public getConfiguration(): CodeDingConfiguration {
        const config = vscode.workspace.getConfiguration('codeding');
        return {
            enabled: config.get<boolean>('enabled', true),
            successEnabled: config.get<boolean>('successEnabled', true),
            errorEnabled: config.get<boolean>('errorEnabled', true),
            successSound: config.get<string>('successSound', ''),
            errorSound: config.get<string>('errorSound', ''),
            triggerMode: config.get<TriggerMode>('triggerMode', 'codeRun'),
            customCommands: config.get<string[]>('customCommands', []),
            notificationLevel: config.get<"quiet" | "diagnostics">('notificationLevel', 'quiet')
        };
    }

    public async updateSuccessSound(path: string): Promise<void> {
        const config = vscode.workspace.getConfiguration('codeding');
        await config.update('successSound', path, vscode.ConfigurationTarget.Global);
    }

    public async updateErrorSound(path: string): Promise<void> {
        const config = vscode.workspace.getConfiguration('codeding');
        await config.update('errorSound', path, vscode.ConfigurationTarget.Global);
    }

    public async resetSuccessSound(): Promise<void> {
        await this.updateSuccessSound('');
    }

    public async resetErrorSound(): Promise<void> {
        await this.updateErrorSound('');
    }

    public async toggleEnabled(): Promise<void> {
        const config = vscode.workspace.getConfiguration('codeding');
        const current = config.get<boolean>('enabled', true);
        await config.update('enabled', !current, vscode.ConfigurationTarget.Global);
    }
}
