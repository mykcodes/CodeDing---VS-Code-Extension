import * as vscode from 'vscode';
import { DevTraceEvent } from './types';

export class EventBus {
    private eventEmitter = new vscode.EventEmitter<DevTraceEvent>();
    public readonly onDidReceiveEvent = this.eventEmitter.event;

    public emit(event: DevTraceEvent) {
        this.eventEmitter.fire(event);
    }

    public dispose() {
        this.eventEmitter.dispose();
    }
}
