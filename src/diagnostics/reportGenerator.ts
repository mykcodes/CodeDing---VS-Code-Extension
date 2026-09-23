
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

        const events = await this.queryService.getEventsAround(sessionId, eventId, { before: 5, after: 0 });
        const targetEvent: any = events.find(e => e.id === eventId);
        
        if (!targetEvent) {
            return "Event not found.";
        }

        // Find the latest Git event in context to determine the current branch
        const gitEvents = events.filter(e => e.type === 'git');
        const latestGit: any = gitEvents.length > 0 ? gitEvents[gitEvents.length - 1] : null;
        const currentBranch = latestGit?.metadata?.current?.branch || 'Unknown';

        let markdown = `# DEVTRACE DEBUG REPORT\n\n`;
        markdown += `## Session\n\n`;
        markdown += `Workspace: ${targetEvent.workspaceId}\n`;
        markdown += `Branch: ${currentBranch}\n\n`;

        markdown += `## Failure\n\n`;
        if (targetEvent.type === 'terminal') {
            markdown += `Command: ${targetEvent.metadata.command}\n`;
            markdown += `Exit code: ${targetEvent.metadata.exitCode !== undefined ? targetEvent.metadata.exitCode : 'Unknown'}\n`;
            if (targetEvent.metadata.durationMs) {
                markdown += `Duration: ${(targetEvent.metadata.durationMs / 1000).toFixed(1)}s\n`;
            }
        } else {
            markdown += `Event: ${targetEvent.id}\n`;
        }
        markdown += `\n`;

        markdown += `## Timeline Before Failure\n\n`;
        for (const rawE of events) {
            const e: any = rawE;
            const time = new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            if (e.type === 'terminal') {
                markdown += `${time}  ${e.metadata.command}\n`;
                markdown += `Exit code: ${e.metadata.exitCode !== undefined ? e.metadata.exitCode : '?'}\n\n`;
            } else if (e.type === 'file') {
                markdown += `${time}  File ${e.metadata.action}\n`;
                markdown += `${e.metadata.relativePath}\n\n`;
            } else if (e.type === 'git') {
                markdown += `${time}  Git state changed\n`;
                markdown += `${e.metadata.current?.branch || 'repo'} · ${e.metadata.current?.isDirty ? 'dirty' : 'clean'}\n\n`;
            }
        }

        markdown += `## Git State\n\n`;
        if (latestGit) {
            const curr = latestGit.metadata.current;
            markdown += `Branch: ${curr.branch || 'Unknown'}\n`;
            markdown += `Working tree: ${curr.isDirty ? 'dirty' : 'clean'}\n`;
            markdown += `Changed files: ${curr.changedFileCount || 0}\n\n`;
        } else {
            markdown += `No Git state recorded in context.\n\n`;
        }

        markdown += `## Evidence Note\n\n`;
        markdown += `This report contains observed development events.\n`;
        markdown += `It does not establish causality between events.\n`;

        return RedactionService.redact(markdown);
    }
}
