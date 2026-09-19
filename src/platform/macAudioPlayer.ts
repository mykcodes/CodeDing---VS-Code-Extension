import { spawn, spawnSync } from 'child_process';
import { AudioPlaybackOptions, AudioPlayer } from '../types';
import { Logger } from '../diagnostics/logger';

export class MacAudioPlayer implements AudioPlayer {
    public async isAvailable(): Promise<boolean> {
        if (process.platform !== 'darwin') return false;
        try {
            const result = spawnSync('which', ['afplay']);
            return result.status === 0;
        } catch {
            return false;
        }
    }

    public async play(soundPath: string, _options?: AudioPlaybackOptions): Promise<void> {
        return new Promise((resolve, reject) => {
            const proc = spawn('afplay', [soundPath]);

            proc.on('close', (code) => {
                if (code !== 0) {
                    Logger.debug(`MacAudioPlayer (afplay) exited with code ${code}`);
                    reject(new Error(`afplay exited with code ${code}`));
                } else {
                    resolve();
                }
            });

            proc.on('error', (err) => {
                Logger.error('MacAudioPlayer failed to start afplay', err);
                reject(err);
            });
        });
    }
}
