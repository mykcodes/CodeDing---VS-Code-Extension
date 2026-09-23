export class RedactionService {
    /**
     * Redacts sensitive information from the input text.
     * @param text The raw terminal command or output
     * @returns The sanitized text
     */
    public static redact(text: string): string {
        if (!text) {
            return text;
        }

        let redactedText = text;

        // Redact Bearer tokens specifically
        redactedText = redactedText.replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]');

        // Redact generic key/value secrets
        const kvPattern = /(token|auth|key|secret|password|pwd|api_key|apikey|access_token)([\s:=]+)['"]?([^'"\s&]+)['"]?/gi;
        redactedText = redactedText.replace(kvPattern, (_match, p1, p2, _p3) => {
            return `${p1}${p2}[REDACTED]`;
        });

        // AWS keys
        const awsPattern = /(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g;
        redactedText = redactedText.replace(awsPattern, '[REDACTED_AWS_KEY]');

        // Private keys
        const pkPattern = /-----BEGIN (?:RSA )?PRIVATE KEY-----[a-zA-Z0-9+/=\s]+-----END (?:RSA )?PRIVATE KEY-----/g;
        redactedText = redactedText.replace(pkPattern, '[REDACTED_PRIVATE_KEY]');

        return redactedText;
    }
}


