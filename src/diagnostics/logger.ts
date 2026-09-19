import * as vscode from 'vscode';
import { ConfigurationService } from '../config/configurationService';

export class Logger {
    private static channel: vscode.OutputChannel;
    private static configService: ConfigurationService;

    public static initialize(context: vscode.ExtensionContext, configService: ConfigurationService) {
        this.channel = vscode.window.createOutputChannel('CodeDing');
        this.configService = configService;
        context.subscriptions.push(this.channel);
    }

    public static log(message: string) {
        if (!this.channel) return;
        this.channel.appendLine(`[${new Date().toISOString()}] [INFO] ${message}`);
    }

    public static debug(message: string) {
        if (!this.channel) return;
        const config = this.configService.getConfiguration();
        if (config.notificationLevel === 'diagnostics') {
            this.channel.appendLine(`[${new Date().toISOString()}] [DEBUG] ${message}`);
        }
    }

    public static error(message: string, error?: any) {
        if (!this.channel) return;
        this.channel.appendLine(`[${new Date().toISOString()}] [ERROR] ${message}`);
        if (error) {
            this.channel.appendLine(typeof error === 'string' ? error : JSON.stringify(error, Object.getOwnPropertyNames(error)));
        }
    }
}
