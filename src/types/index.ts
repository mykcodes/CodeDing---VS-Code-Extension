export type ExecutionType = 
    | "codeExecution"
    | "ordinaryCommand"
    | "unknown";

export type ExecutionCategory = 
    | "build"
    | "test"
    | "packageManager"
    | "git"
    | "devServer"
    | "compiler"
    | "codeRunner"
    | "other"
    | "unknown";

export interface ExecutionClassification {
    type: ExecutionType;
    category: ExecutionCategory;
}

export type TriggerMode = "codeRun" | "allTerminalCommands" | "custom";

export interface CodeDingConfiguration {
    enabled: boolean;
    successEnabled: boolean;
    errorEnabled: boolean;
    successSound: string;
    errorSound: string;
    triggerMode: TriggerMode;
    customCommands: string[];
    notificationLevel: "quiet" | "diagnostics";
}

export interface AudioPlaybackOptions {
    // For future expansion
}

export interface AudioPlayer {
    isAvailable(): Promise<boolean>;
    play(soundPath: string, options?: AudioPlaybackOptions): Promise<void>;
}

export interface ExecutionResult {
    classification: ExecutionClassification;
    exitCode?: number;
    commandLine?: string;
    terminalName?: string;
}
