import * as vscode from 'vscode';
import { Logger } from './diagnostics/logger';
import { ConfigurationService } from './config/configurationService';
import { SoundResolver } from './audio/soundResolver';
import { AudioService } from './audio/audioService';
import { TerminalExecutionMonitor } from './detection/terminalExecutionMonitor';
import { CommandRegistrar } from './commands/commandRegistrar';

let monitor: TerminalExecutionMonitor | undefined;

export async function activate(context: vscode.ExtensionContext) {
    const configService = new ConfigurationService();
    Logger.initialize(context, configService);
    
    Logger.log('CodeDing is activating.');

    const soundResolver = new SoundResolver(configService, context.extensionPath);
    const audioService = new AudioService(soundResolver, configService);
    
    await audioService.initialize();

    const commandRegistrar = new CommandRegistrar(configService, audioService);
    commandRegistrar.register(context);

    monitor = new TerminalExecutionMonitor(audioService, configService);
    monitor.start();
    context.subscriptions.push(monitor);

    Logger.log('CodeDing activation complete.');
}

export function deactivate() {
    if (monitor) {
        monitor.dispose();
    }
}
