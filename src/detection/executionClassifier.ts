import { ExecutionClassification, TriggerMode } from '../types';

export class ExecutionClassifier {
    // A conservative list of known non-code execution commands
    private static readonly ORDINARY_COMMANDS = new Set([
        'cd', 'pwd', 'ls', 'dir', 'echo', 'cat', 'type', 'clear', 'cls', 
        'git', 'svn', 'hg', 'mkdir', 'rmdir', 'rm', 'del', 'cp', 'copy', 
        'mv', 'move', 'touch', 'find', 'grep', 'tree', 'date', 'time',
        'export', 'set', 'env', 'source', 'alias', 'unalias', 'exit', 'history'
    ]);

    public static classify(commandLine: string, triggerMode: TriggerMode, customCommands: string[] = []): ExecutionClassification {
        const trimmed = commandLine.trim();
        if (!trimmed) {
            return "unknown";
        }

        if (triggerMode === "allTerminalCommands") {
            return "codeExecution";
        }

        if (triggerMode === "custom") {
            try {
                for (const pattern of customCommands) {
                    const regex = new RegExp(pattern);
                    if (regex.test(trimmed)) {
                        return "codeExecution";
                    }
                }
            } catch (e) {
                // If regex is invalid, fail safely
                return "unknown";
            }
            return "ordinaryCommand";
        }

        // codeRun mode heuristic
        return this.heuristicClassify(trimmed);
    }

    private static heuristicClassify(command: string): ExecutionClassification {
        // Extract the base command (first token, disregarding paths)
        const firstToken = command.split(/\s+/)[0];
        
        // Remove path components to just get the executable name
        const parts = firstToken.split(/[/\\]/);
        const executable = parts[parts.length - 1].toLowerCase();
        const baseExecutable = executable.endsWith('.exe') ? executable.slice(0, -4) : executable;

        // 1. If it's a known ordinary command, ignore it
        if (this.ORDINARY_COMMANDS.has(baseExecutable)) {
            return "ordinaryCommand";
        }

        // 2. Look for obvious build/run triggers
        const buildRunTriggers = ['npm', 'yarn', 'pnpm', 'npx', 'node', 'python', 'python3', 'go', 'cargo', 'dotnet', 'java', 'javac', 'make', 'gcc', 'g++', 'clang', 'clang++', 'ts-node', 'tsx', 'bun', 'deno', 'pytest', 'jest'];
        
        if (buildRunTriggers.includes(baseExecutable)) {
            return "codeExecution";
        }

        // 3. Executable runs (e.g. ./program, .\program.exe)
        // If the command starts with ./ or .\ it's likely a local execution
        if (command.startsWith('./') || command.startsWith('.\\')) {
            return "codeExecution";
        }

        // 4. Default to unknown for safety
        return "unknown";
    }
}
