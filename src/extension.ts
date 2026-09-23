import * as vscode from 'vscode';
import { Logger } from './diagnostics/logger';
import { ConfigurationService } from './config/configurationService';
import { SoundResolver } from './audio/soundResolver';
import { AudioService } from './audio/audioService';
import { TerminalExecutionMonitor } from './detection/terminalExecutionMonitor';
import { CommandRegistrar } from './commands/commandRegistrar';
import { EventBus } from './core/eventBus';
import { SessionManager } from './core/sessionManager';
import { EventStore } from './core/eventStore';
import { FileActivityCollector } from './events/file/fileActivityCollector';
import { GitStateCollector } from './events/git/gitStateCollector';
import { QueryService } from './core/queryService';
import { ReportGenerator } from './diagnostics/reportGenerator';

let monitor: TerminalExecutionMonitor | undefined;
let eventBus: EventBus | undefined;
let sessionManager: SessionManager | undefined;
let eventStore: EventStore | undefined;
let fileCollector: FileActivityCollector | undefined;
let gitCollector: GitStateCollector | undefined;
let statusBarItem: vscode.StatusBarItem | undefined;

export async function activate(context: vscode.ExtensionContext) {
    const configService = new ConfigurationService();
    Logger.initialize(context, configService);
    
    Logger.log('DevTrace is activating.');

    // 1. Initialize Event Infrastructure
    eventBus = new EventBus();
    sessionManager = new SessionManager(eventBus);
    eventStore = new EventStore(context);
    const queryService = new QueryService(context);
    const reportGenerator = new ReportGenerator(queryService, sessionManager);
    
    context.subscriptions.push(eventBus);
    context.subscriptions.push(sessionManager);

    // 2. Start Session and Initialize Store
    const session = sessionManager.startSession();
    await eventStore.initialize(session.id);

    context.subscriptions.push(
        eventBus.onDidReceiveEvent(async (event) => {
            if (eventStore) {
                await eventStore.appendEvent(event);
            }
        })
    );

    // 3. Initialize Audio Subsystem
    const soundResolver = new SoundResolver(configService, context.extensionPath);
    const audioService = new AudioService(soundResolver, configService);
    
    await audioService.initialize();

    // 4. Register Commands
    const commandRegistrar = new CommandRegistrar(
        configService, 
        audioService,
        queryService,
        sessionManager,
        reportGenerator,
        eventBus,
        context.extensionUri
    );
    commandRegistrar.register(context);

    // 5. Start Monitors & Collectors
    monitor = new TerminalExecutionMonitor(audioService, configService, eventBus, sessionManager);
    monitor.start();
    context.subscriptions.push(monitor);

    fileCollector = new FileActivityCollector(eventBus, sessionManager);
    fileCollector.start();
    context.subscriptions.push(fileCollector);

    gitCollector = new GitStateCollector(eventBus, sessionManager);
    gitCollector.start();
    context.subscriptions.push(gitCollector);

    // 6. Setup Status Bar
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = '$(circle-large-filled) DevTrace';
    statusBarItem.tooltip = 'Open DevTrace Timeline';
    statusBarItem.command = 'devtrace.openTimeline';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    Logger.log('DevTrace activation complete.');
}

export function deactivate() {
    if (sessionManager) {
        sessionManager.endSession();
    }
    if (monitor) {
        monitor.dispose();
    }
    if (fileCollector) {
        fileCollector.dispose();
    }
    if (gitCollector) {
        gitCollector.dispose();
    }
    if (eventBus) {
        eventBus.dispose();
    }
    if (statusBarItem) {
        statusBarItem.dispose();
    }
}



