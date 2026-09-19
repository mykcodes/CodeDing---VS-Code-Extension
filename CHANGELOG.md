# Changelog

## [1.0.0] - 2026-09-20
- **Initial release** 🎉
- Added smart heuristic `codeRun` trigger mode to distinguish between navigation commands (e.g., `cd`) and execution commands (e.g., `npm start`).
- Bundled default lightweight success and error WAV sounds for a zero-configuration setup.
- Added support for custom WAV sound overrides via extension settings.
- Safe cross-platform playback via native OS commands (PowerShell, afplay, aplay/paplay).
- Graceful handling of missing shell integration and undefined exit codes.
- Added marketplace metadata and extension icon.
