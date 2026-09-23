import { ExecutionClassification, ExecutionCategory, TriggerMode } from '../types';

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
            return { type: "unknown", category: "unknown" };
        }

        if (triggerMode === "allTerminalCommands") {
            return { type: "codeExecution", category: "other" };
        }

        if (triggerMode === "custom") {
            try {
                for (const pattern of customCommands) {
                    const regex = new RegExp(pattern);
                    if (regex.test(trimmed)) {
                        return { type: "codeExecution", category: "other" };
                    }
                }
            } catch (e) {
                // If regex is invalid, fail safely
                return { type: "unknown", category: "unknown" };
            }
            return { type: "ordinaryCommand", category: "other" };
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

        // Determine specific category based on executable
        let category: ExecutionCategory = "unknown";
        if (['npm', 'yarn', 'pnpm', 'npx', 'bun'].includes(baseExecutable)) {
            category = "packageManager";
            if (command.includes('run build') || command.includes('run compile')) category = "build";
            if (command.includes('run test') || command.includes('test')) category = "test";
            if (command.includes('run dev') || command.includes('start')) category = "devServer";
        } else if (['git', 'svn', 'hg'].includes(baseExecutable)) {
            category = "git";
        } else if (['pytest', 'jest', 'mocha', 'vitest'].includes(baseExecutable)) {
            category = "test";
        } else if (['tsc', 'javac', 'gcc', 'g++', 'clang', 'clang++', 'go', 'cargo'].includes(baseExecutable)) {
            if (['go', 'cargo'].includes(baseExecutable) && command.includes('test')) category = "test";
            else if (['go', 'cargo'].includes(baseExecutable) && command.includes('run')) category = "codeRunner";
            else category = "compiler";
        } else if (['node', 'python', 'python3', 'ts-node', 'tsx', 'deno', 'dotnet', 'java', 'ruby', 'perl', 'php'].includes(baseExecutable)) {
            category = "codeRunner";
        }

        // 1. If it's a known ordinary command
        if (this.ORDINARY_COMMANDS.has(baseExecutable)) {
            return { type: "ordinaryCommand", category: category !== "unknown" ? category : "other" };
        }

        // 2. Look for obvious build/run triggers
        const buildRunTriggers = ['npm', 'yarn', 'pnpm', 'npx', 'node', 'python', 'python3', 'go', 'cargo', 'dotnet', 'java', 'javac', 'tsc', 'make', 'gcc', 'g++', 'clang', 'clang++', 'ts-node', 'tsx', 'bun', 'deno', 'pytest', 'jest'];
        
        if (buildRunTriggers.includes(baseExecutable)) {
            return { type: "codeExecution", category: category !== "unknown" ? category : "other" };
        }

        // 3. Executable runs (e.g. ./program, .\program.exe)
        // If the command starts with ./ or .\ it's likely a local execution
        if (command.startsWith('./') || command.startsWith('.\\')) {
            return { type: "codeExecution", category: "other" };
        }

        // 4. Default to unknown for safety
        return { type: "unknown", category: "unknown" };
    }
}
