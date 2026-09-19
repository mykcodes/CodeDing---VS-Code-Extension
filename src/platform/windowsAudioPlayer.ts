import { spawn } from 'child_process';
import { AudioPlaybackOptions, AudioPlayer } from '../types';
import { Logger } from '../diagnostics/logger';

export class WindowsAudioPlayer implements AudioPlayer {
    public async isAvailable(): Promise<boolean> {
        // PowerShell is available on Windows practically always.
        return process.platform === 'win32';
    }

    public async play(soundPath: string, _options?: AudioPlaybackOptions): Promise<void> {
        return new Promise((resolve, reject) => {
            const command = `(New-Object System.Media.SoundPlayer '${soundPath.replace(/'/g, "''")}').PlaySync()`;
            const proc = spawn('powershell', ['-NoProfile', '-NonInteractive', '-Command', command], {
                windowsHide: true
            });

            proc.on('close', (code) => {
                if (code !== 0) {
                    Logger.debug(`WindowsAudioPlayer exited with code ${code}`);
                    reject(new Error(`PowerShell exited with code ${code}`));
                } else {
                    resolve();
                }
            });

            proc.on('error', (err) => {
                Logger.error('WindowsAudioPlayer failed to start', err);
                reject(err);
            });
        });
    }
}
