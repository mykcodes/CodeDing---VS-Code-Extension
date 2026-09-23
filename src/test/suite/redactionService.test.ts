import * as assert from 'assert';
import { RedactionService } from '../../privacy/redactionService';

suite('RedactionService Test Suite', () => {
    test('Redacts Bearer tokens', () => {
        const input = 'curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c" https://api.example.com';
        const expected = 'curl -H "Authorization: Bearer [REDACTED]" https://api.example.com';
        assert.strictEqual(RedactionService.redact(input), expected);
    });

    test('Redacts password assignments', () => {
        const input = 'export DATABASE_URL="postgres://user:password=supersecret@localhost:5432/db"';
        const expected = 'export DATABASE_URL="postgres://user:password=[REDACTED]@localhost:5432/db"';
        assert.strictEqual(RedactionService.redact(input), expected);
    });

    test('Redacts token flags', () => {
        const input = 'my-cli --token=abc123xyz --verbose';
        const expected = 'my-cli --token=[REDACTED] --verbose';
        assert.strictEqual(RedactionService.redact(input), expected);
    });

    test('Redacts AWS keys', () => {
        const input = 'export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE';
        const expected = 'export AWS_ACCESS_KEY_ID=[REDACTED_AWS_KEY]';
        assert.strictEqual(RedactionService.redact(input), expected);
    });

    test('Does not redact ordinary commands', () => {
        const input = 'npm run build';
        assert.strictEqual(RedactionService.redact(input), input);
    });

    test('Does not redact harmless assignments', () => {
        const input = 'export NODE_ENV=production';
        assert.strictEqual(RedactionService.redact(input), input);
    });
});
