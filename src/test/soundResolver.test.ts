import * as assert from 'assert';
import * as path from 'path';
import { SoundResolver } from '../audio/soundResolver';
import { ConfigurationService } from '../config/configurationService';
import { CodeDingConfiguration } from '../types';


suite('SoundResolver Test Suite', () => {

    const extensionPath = path.resolve(__dirname, '..', '..');
    const bundledSuccess = path.join(extensionPath, 'media', 'default-success.wav');
    const bundledError = path.join(extensionPath, 'media', 'default-error.wav');

    // Dummy config service
    class MockConfigService extends ConfigurationService {
        private mockConfig: CodeDingConfiguration;
        constructor(config: Partial<CodeDingConfiguration>) {
            super();
            this.mockConfig = {
                enabled: true,
                successEnabled: true,
                errorEnabled: true,
                successSound: '',
                errorSound: '',
                triggerMode: 'codeRun',
                customCommands: [],
                notificationLevel: 'quiet',
                ...config
            };
        }
        public getConfiguration(): CodeDingConfiguration {
            return this.mockConfig;
        }
    }

    test('Falls back to bundled when custom path is empty', () => {
        const resolver = new SoundResolver(new MockConfigService({}), extensionPath);
        assert.strictEqual(resolver.getSuccessSound(), bundledSuccess);
        assert.strictEqual(resolver.getErrorSound(), bundledError);
    });

    test('Uses custom path if valid', () => {
        // Just use an existing file as a mock valid sound
        const validPath = path.join(extensionPath, 'package.json'); 
        const resolver = new SoundResolver(new MockConfigService({
            successSound: validPath,
            errorSound: validPath
        }), extensionPath);

        assert.strictEqual(resolver.getSuccessSound(), validPath);
        assert.strictEqual(resolver.getErrorSound(), validPath);
    });

    test('Falls back to bundled if custom path is invalid/missing', () => {
        const invalidPath = path.join(extensionPath, 'does-not-exist.wav');
        const resolver = new SoundResolver(new MockConfigService({
            successSound: invalidPath,
            errorSound: invalidPath
        }), extensionPath);

        assert.strictEqual(resolver.getSuccessSound(), bundledSuccess);
        assert.strictEqual(resolver.getErrorSound(), bundledError);
    });

});
