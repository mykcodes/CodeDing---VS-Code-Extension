<div align="center">
  <img src="https://raw.githubusercontent.com/mykcodes/CodeDing---VS-Code-Extension/main/media/icon.jpg" width="128" alt="CodeDing Icon" />
  <h1>CodeDing</h1>
  <p><strong>Never stare at a compiling terminal again.</strong></p>
</div>

CodeDing is a lightweight, zero-configuration VS Code extension that plays non-intrusive sounds when your terminal commands finish. Keep your flow state active, switch contexts to other windows, and let CodeDing notify you the exact moment your long-running builds, tests, or scripts complete.

### Created by [Mayank Sharma](https://mykcodes.tech)
- **GitHub:** [@mykcodes](https://github.com/mykcodes)
- **LinkedIn:** [mynksharma](https://linkedin.com/in/mynksharma)

---

## Features

- **Built-in Sounds**: Works immediately out of the box with bundled success and error sounds.
- **Customizable**: Replace the built-in sounds with your own custom `.wav` files.
- **Smart Detection**: In `codeRun` mode, CodeDing automatically distinguishes between ordinary commands (like `cd` or `ls`) and actual code execution (like `npm test` or `python script.py`).
- **Graceful Fallback**: If a custom sound file is moved or deleted, CodeDing safely falls back to the built-in default sounds without spamming you with errors.
- **Fully Local**: Works completely offline. No telemetry, no cloud uploads, and your sound files never leave your machine.

## Extension Settings

You can configure CodeDing through VS Code settings or by using the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P` and typing `CodeDing`):

* `codeding.enabled`: Enable or disable CodeDing entirely.
* `codeding.successEnabled`: Enable or disable the success sound.
* `codeding.errorEnabled`: Enable or disable the error sound.
* `codeding.triggerMode`: Choose what triggers a sound (`codeRun`, `allTerminalCommands`, `custom`).
* `codeding.customCommands`: Regex patterns for matching commands when trigger mode is `custom`.

## Platform Support

- **Windows**: Uses native PowerShell `System.Media.SoundPlayer`.
- **macOS**: Uses built-in `afplay`.
- **Linux**: Uses `aplay` or `paplay`. (If these utilities are unavailable, CodeDing will degrade gracefully and remain silent without crashing).

Currently, only **WAV** format is guaranteed to be supported across all platforms.

## Limitations & Shell Integration

**Important**: CodeDing relies on VS Code's **Shell Integration API** (introduced in VS Code 1.93) to detect command completions and exit codes. 
- If shell integration is not supported by your specific terminal or environment, CodeDing will gracefully ignore commands rather than making false assumptions.
- "Unknown" or missing exit codes are intentionally ignored.
- Remote environments (like SSH, WSL, or Dev Containers) must support Shell Integration and audio must be playable on the machine running the extension host.

## Commands

- `CodeDing: Choose Success Sound`
- `CodeDing: Choose Error Sound`
- `CodeDing: Test Success Sound`
- `CodeDing: Test Error Sound`
- `CodeDing: Reset Success Sound` (Restores the built-in default)
- `CodeDing: Reset Error Sound` (Restores the built-in default)
- `CodeDing: Toggle Enable/Disable`

## Privacy

CodeDing operates 100% locally. It does not collect telemetry, it does not send your commands to any server, and it does not upload your custom sound files anywhere.

