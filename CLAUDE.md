# Clipboard Guardian VSCode Extension

A VSCode extension that blocks external clipboard operations while preserving internal copy/paste functionality.

## Features
- Blocks pasting from external sources (browsers, other apps)
- Prevents copying VSCode content to external clipboard
- Allows normal copy/paste operations within VSCode
- Configurable via settings

## Development Commands
```bash
npm install           # Install dependencies
npm run compile       # Compile TypeScript
npm run watch         # Watch mode compilation
npx vsce package      # Package extension to .vsix
```

## Installation
```bash
code --install-extension clipboard-guardian-1.0.0.vsix
```

## Settings
- `clipboardGuardian.enabled`: Enable/disable paste blocking (default: true)
- `clipboardGuardian.blockCopy`: Enable/disable copy blocking (default: true)

## Architecture
- Uses `registerDocumentPasteEditProvider` to intercept paste operations
- Overrides copy/cut commands to track internal clipboard state
- Returns empty `DocumentPasteEdit` to block external pastes
- Maintains internal clipboard content to allow VSCode-internal operations