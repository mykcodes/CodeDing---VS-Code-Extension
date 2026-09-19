import { spawn, spawnSync } from 'child_process';
import { AudioPlaybackOptions, AudioPlayer } from '../types';
import { Logger } from '../diagnostics/logger';

export class LinuxAudioPlayer implements AudioPlayer {
    private availableCommand: string | null = null;

    public async isAvailable(): Promise<boolean> {
        if (process.platform !== 'linux') return false;
        
        // Check for common linux audio players
        const players = ['paplay', 'aplay'];
        for (const p of players) {
            try {
                const result = spawnSync('which', [p]);
                if (result.status === 0) {
                    this.availableCommand = p;
                    return true;
                }
            } catch {
                // Ignore and try next
            }
        }
        return false;
    }

    public async play(soundPath: string, _options?: AudioPlaybackOptions): Promise<void> {
        if (!this.availableCommand) {
            const isAvail = await this.isAvailable();
            if (!isAvail || !this.availableCommand) {
                return Promise.reject(new Error("No Linux audio player found (paplay/aplay)"));
            }
        }

        return new Promise((resolve, reject) => {
            const proc = spawn(this.availableCommand!, [soundPath]);

            proc.on('close', (code) => {
                if (code !== 0) {
                    Logger.debug(`LinuxAudioPlayer (${this.availableCommand}) exited with code ${code}`);
                    reject(new Error(`${this.availableCommand} exited with code ${code}`));
                } else {
                    resolve();
                }
            });

            proc.on('error', (err) => {
                Logger.error(`LinuxAudioPlayer failed to start ${this.availableCommand}`, err);
                reject(err);
            });
        });
    }
}
