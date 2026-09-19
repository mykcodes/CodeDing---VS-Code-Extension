import { AudioPlayer } from '../types';
import { WindowsAudioPlayer } from '../platform/windowsAudioPlayer';
import { MacAudioPlayer } from '../platform/macAudioPlayer';
import { LinuxAudioPlayer } from '../platform/linuxAudioPlayer';
import { SoundResolver } from './soundResolver';
import { Logger } from '../diagnostics/logger';
import { ConfigurationService } from '../config/configurationService';

export class AudioService {
    private player: AudioPlayer | null = null;
    private resolver: SoundResolver;
    private configService: ConfigurationService;
    private isPlaying: boolean = false;

    constructor(resolver: SoundResolver, configService: ConfigurationService) {
        this.resolver = resolver;
        this.configService = configService;
    }

    public async initialize(): Promise<void> {
        const players: AudioPlayer[] = [
            new WindowsAudioPlayer(),
            new MacAudioPlayer(),
            new LinuxAudioPlayer()
        ];

        for (const p of players) {
            if (await p.isAvailable()) {
                this.player = p;
                Logger.log(`Audio backend initialized: ${p.constructor.name}`);
                return;
            }
        }
        
        Logger.error('No supported audio playback mechanism found on this platform.');
    }

    public async playSuccess(): Promise<void> {
        const config = this.configService.getConfiguration();
        if (!config.enabled || !config.successEnabled) return;

        const soundPath = this.resolver.getSuccessSound();
        await this.playSound(soundPath);
    }

    public async playError(): Promise<void> {
        const config = this.configService.getConfiguration();
        if (!config.enabled || !config.errorEnabled) return;

        const soundPath = this.resolver.getErrorSound();
        await this.playSound(soundPath);
    }

    private async playSound(soundPath: string): Promise<void> {
        if (!this.player) {
            Logger.debug('Playback ignored: No audio player available.');
            return;
        }

        if (this.isPlaying) {
            Logger.debug('Playback ignored: Already playing a sound.');
            return;
        }

        this.isPlaying = true;
        try {
            await this.player.play(soundPath);
        } catch (error) {
            Logger.error(`Failed to play sound: ${soundPath}`, error);
        } finally {
            this.isPlaying = false;
        }
    }
}
