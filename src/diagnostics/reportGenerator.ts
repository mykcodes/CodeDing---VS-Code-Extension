
import { QueryService } from '../core/queryService';
import { SessionManager } from '../core/sessionManager';
import { RedactionService } from '../privacy/redactionService';

export class ReportGenerator {
    private queryService: QueryService;
    private sessionManager: SessionManager;

    constructor(queryService: QueryService, sessionManager: SessionManager) {
        this.queryService = queryService;
        this.sessionManager = sessionManager;
    }

    public async generate(eventId: string): Promise<string> {
        const sessionId = this.sessionManager.getSession()?.id;
        if (!sessionId) {
            return "No active session found.";
        }

        const events = await this.queryService.getEventsAround(sessionId, eventId, { before: 5, after: 1 });
        const targetEvent = events.find(e => e.id === eventId);
        
        if (!targetEvent) {
            return "Event not found.";
        }

        let markdown = `# DevTrace Debug Report\n\n`;
        markdown += `**Project/Workspace:** ${targetEvent.workspaceId}\n`;
        markdown += `**Session:** ${sessionId}\n`;
        markdown += `**Event Time:** ${new Date(targetEvent.timestamp).toLocaleString()}\n\n`;

        markdown += `## Selected Event\n\n`;
        markdown += this.formatEvent(targetEvent) + '\n\n';

        markdown += `## Context (What Happened Before)\n\n`;
        for (const e of events) {
            if (e.id === targetEvent.id) {
                markdown += `👉 **${this.formatEventShort(e)}**\n`;
            } else {
                markdown += `- ${this.formatEventShort(e)}\n`;
            }
        }

        return RedactionService.redact(markdown);
    }

    private formatEvent(e: any): string {
        let text = '';
        if (e.type === 'terminal') {
            text += `**Command:** \`${e.metadata.command}\`\n`;
            text += `**Exit Code:** ${e.metadata.exitCode !== undefined ? e.metadata.exitCode : 'Unknown'}\n`;
            text += `**Duration:** ${e.metadata.durationMs ? e.metadata.durationMs + 'ms' : 'Unknown'}\n`;
            text += `**Working Directory:** ${e.metadata.cwd}\n`;
        } else if (e.type === 'file') {
            text += `**Action:** ${e.metadata.action}\n`;
            text += `**File:** \`${e.metadata.relativePath}\`\n`;
        } else if (e.type === 'git') {
            text += `**Git State Changed**\n`;
            text += `**Branch:** ${e.metadata.current?.branch}\n`;
            text += `**HEAD:** ${e.metadata.current?.head}\n`;
            text += `**Dirty:** ${e.metadata.current?.isDirty} (${e.metadata.current?.changedFileCount} files)\n`;
        }
        return text;
    }

    private formatEventShort(e: any): string {
        const time = new Date(e.timestamp).toLocaleTimeString();
        if (e.type === 'terminal') {
            return `[${time}] Terminal: \`${e.metadata.command}\` (Exit ${e.metadata.exitCode})`;
        } else if (e.type === 'file') {
            return `[${time}] File ${e.metadata.action}: \`${e.metadata.relativePath}\``;
        } else if (e.type === 'git') {
            return `[${time}] Git state changed (${e.metadata.current?.branch || 'repo'})`;
        }
        return `[${time}] Unknown event`;
    }
}
