import * as fs from 'fs';
import * as path from 'path';
import { ConfigurationService } from '../config/configurationService';
import { Logger } from '../diagnostics/logger';

export class SoundResolver {
    private configService: ConfigurationService;
    private extensionContextPath: string;

    constructor(configService: ConfigurationService, extensionContextPath: string) {
        this.configService = configService;
        this.extensionContextPath = extensionContextPath;
    }

    private getBundledSuccessSound(): string {
        return path.join(this.extensionContextPath, 'media', 'default-success.wav');
    }

    private getBundledErrorSound(): string {
        return path.join(this.extensionContextPath, 'media', 'default-error.wav');
    }

    private validateSoundPath(soundPath: string | undefined): boolean {
        if (!soundPath) return false;
        try {
            const stats = fs.statSync(soundPath);
            return stats.isFile();
        } catch {
            return false;
        }
    }

    public getSuccessSound(): string {
        const config = this.configService.getConfiguration();
        if (config.successSound && this.validateSoundPath(config.successSound)) {
            return config.successSound;
        }

        if (config.successSound) {
            Logger.log(`Custom success sound not found or inaccessible: ${config.successSound}. Falling back to default.`);
        }

        return this.getBundledSuccessSound();
    }

    public getErrorSound(): string {
        const config = this.configService.getConfiguration();
        if (config.errorSound && this.validateSoundPath(config.errorSound)) {
            return config.errorSound;
        }

        if (config.errorSound) {
            Logger.log(`Custom error sound not found or inaccessible: ${config.errorSound}. Falling back to default.`);
        }

        return this.getBundledErrorSound();
    }
}
