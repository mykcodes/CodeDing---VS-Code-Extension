export type DevTraceEventType =
    | "terminal"
    | "file"
    | "git"
    | "build"
    | "test"
    | "server"
    | "session";

export interface DevTraceEvent {
    id: string;
    timestamp: number;
    type: DevTraceEventType;
    workspaceId: string;
    metadata: unknown;
}

export interface TerminalEventMetadata {
    command: string;
    shell?: string;
    cwd?: string;
    exitCode?: number;
    durationMs?: number | null; // null if unavailable
    executionType: string;
    category: string;
    success: boolean | "unknown";
}

export interface TerminalEvent extends DevTraceEvent {
    type: "terminal";
    metadata: TerminalEventMetadata;
}

export type SessionStatus = "active" | "completed" | "interrupted";

export interface Session {
    id: string;
    workspaceId: string;
    startTime: number;
    lastActivity: number;
    eventCount: number;
    status: SessionStatus;
}

export type FileAction = "created" | "modified" | "deleted" | "renamed";

export interface FileEventMetadata {
    action: FileAction;
    relativePath: string;
    oldRelativePath?: string;
}

export interface FileEvent extends DevTraceEvent {
    type: "file";
    metadata: FileEventMetadata;
}

export interface GitStateSnapshot {
    branch?: string;
    head?: string;
    isDirty: boolean;
    changedFileCount: number;
}

export interface GitEventMetadata {
    action: "state_changed";
    previous: GitStateSnapshot;
    current: GitStateSnapshot;
}

export interface GitEvent extends DevTraceEvent {
    type: "git";
    metadata: GitEventMetadata;
}
