import * as vscode from 'vscode';
import { QueryService } from '../core/queryService';
import { EventBus } from '../core/eventBus';
import { SessionManager } from '../core/sessionManager';

export class TimelineWebview {
    private static currentPanel: TimelineWebview | undefined;
    private readonly panel: vscode.WebviewPanel;
    private readonly extensionUri: vscode.Uri;
    private disposables: vscode.Disposable[] = [];
    
    private queryService: QueryService;
    private eventBus: EventBus;
    private sessionManager: SessionManager;

    public static createOrShow(
        extensionUri: vscode.Uri, 
        queryService: QueryService, 
        eventBus: EventBus, 
        sessionManager: SessionManager
    ) {
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

        if (TimelineWebview.currentPanel) {
            TimelineWebview.currentPanel.panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'devtraceTimeline',
            'DevTrace Timeline',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'out', 'ui', 'webview')
                ],
                retainContextWhenHidden: true
            }
        );

        TimelineWebview.currentPanel = new TimelineWebview(panel, extensionUri, queryService, eventBus, sessionManager);
    }

    private constructor(
        panel: vscode.WebviewPanel, 
        extensionUri: vscode.Uri, 
        queryService: QueryService, 
        eventBus: EventBus, 
        sessionManager: SessionManager
    ) {
        this.panel = panel;
        this.extensionUri = extensionUri;
        this.queryService = queryService;
        this.eventBus = eventBus;
        this.sessionManager = sessionManager;

        this.update();

        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

        this.panel.webview.onDidReceiveMessage(
            async message => {
                const sessionId = this.sessionManager.getSession()?.id;
                if (!sessionId) return;

                switch (message.command) {
                    case 'request_events': {
                        const events = await this.queryService.getEvents(sessionId, {
                            limit: message.limit,
                            offset: message.offset,
                            filterType: message.filterType
                        });
                        this.panel.webview.postMessage({ command: 'render_events', events, clear: message.clear });
                        break;
                    }
                    case 'search': {
                        const results = await this.queryService.searchEvents(sessionId, message.query);
                        this.panel.webview.postMessage({ command: 'render_events', events: results, clear: true });
                        break;
                    }
                    case 'get_context': {
                        const contextEvents = await this.queryService.getEventsAround(sessionId, message.eventId, { before: 5, after: 1 });
                        this.panel.webview.postMessage({ command: 'render_context', events: contextEvents, targetId: message.eventId });
                        break;
                    }
                    case 'generate_report':
                        vscode.commands.executeCommand('devtrace.createDebugReport', message.eventId);
                        break;
                }
            },
            null,
            this.disposables
        );

        // Listen for new real-time events
        this.eventBus.onDidReceiveEvent(event => {
            // Push event to UI
            this.panel.webview.postMessage({ command: 'new_event_arrived', event });
        }, null, this.disposables);
    }

    private update() {
        const webview = this.panel.webview;
        this.panel.webview.html = this.getHtmlForWebview(webview);
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'out', 'ui', 'webview', 'main.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'out', 'ui', 'webview', 'styles.css'));
        
        // Use a strict CSP
        const nonce = getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${styleUri}" rel="stylesheet">
                <title>DevTrace Timeline</title>
            </head>
            <body>
                <header class="timeline-header">
                    <div class="header-content">
                        <h1>DEVTRACE</h1>
                        <span id="session-info">Session Active</span>
                    </div>
                    <div class="header-controls">
                        <div class="search-container">
                            <input type="text" id="search-input" placeholder="Search events..." />
                            <button id="clear-search-btn" class="hidden" title="Clear Search">×</button>
                            <span id="search-results-count" class="hidden"></span>
                        </div>
                        <select id="filter-select">
                            <option value="all">All Events</option>
                            <option value="terminal">Terminal</option>
                            <option value="file">Files</option>
                            <option value="git">Git</option>
                        </select>
                    </div>
                </header>

                <div id="timeline-container">
                    <!-- Events injected here -->
                </div>

                <div id="loading-indicator" class="hidden">Loading...</div>
                <div id="empty-state" class="hidden">
                    <h2>No development activity recorded yet.</h2>
                    <p>Run a command, save a file, or make a Git change to start building your timeline.</p>
                </div>
                <div id="empty-search-state" class="hidden">
                    <h2 style="text-align:center; padding: 40px; color: var(--vscode-descriptionForeground);">No matching events found.</h2>
                </div>

                <div id="new-events-banner" class="hidden">
                    <span id="new-events-text"></span>
                    <span>[Jump to latest]</span>
                </div>

                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
    }

    public dispose() {
        TimelineWebview.currentPanel = undefined;
        this.panel.dispose();
        while (this.disposables.length) {
            const x = this.disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
