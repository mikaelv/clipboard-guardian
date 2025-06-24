import * as vscode from 'vscode';

let internalClipboard: string | undefined;
let isInternalCopy = false;

export function activate(context: vscode.ExtensionContext) {
    const pasteProvider = vscode.languages.registerDocumentPasteEditProvider(
        { scheme: '*' },
        new ClipboardGuardianPasteEditProvider(),
        {
            pasteMimeTypes: ['text/plain'],
            providedPasteEditKinds: []
        }
    );

    const copyHandler = vscode.commands.registerCommand('editor.action.clipboardCopyAction', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return vscode.commands.executeCommand('editor.action.clipboardCopyAction');
        }

        const selection = editor.selection;
        if (!selection.isEmpty) {
            const selectedText = editor.document.getText(selection);
            internalClipboard = selectedText;
            isInternalCopy = true;
            
            if (shouldBlockCopy()) {
                // Don't write to system clipboard when copy blocking is enabled
                vscode.window.showWarningMessage('Copy to external clipboard blocked by Clipboard Guardian');
            } else {
                await vscode.env.clipboard.writeText(selectedText);
            }
        }
    });

    const cutHandler = vscode.commands.registerCommand('editor.action.clipboardCutAction', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return vscode.commands.executeCommand('editor.action.clipboardCutAction');
        }

        const selection = editor.selection;
        if (!selection.isEmpty) {
            const selectedText = editor.document.getText(selection);
            internalClipboard = selectedText;
            isInternalCopy = true;
            
            await editor.edit(editBuilder => {
                editBuilder.delete(selection);
            });
            
            if (shouldBlockCopy()) {
                // Don't write to system clipboard when copy blocking is enabled
                vscode.window.showWarningMessage('Cut to external clipboard blocked by Clipboard Guardian');
            } else {
                await vscode.env.clipboard.writeText(selectedText);
            }
        }
    });

    context.subscriptions.push(pasteProvider, copyHandler, cutHandler);
}

class ClipboardGuardianPasteEditProvider implements vscode.DocumentPasteEditProvider {
    async provideDocumentPasteEdits(
        document: vscode.TextDocument,
        ranges: readonly vscode.Range[],
        dataTransfer: vscode.DataTransfer,
        context: vscode.DocumentPasteEditContext,
        token: vscode.CancellationToken
    ): Promise<vscode.DocumentPasteEdit[] | undefined> {
        
        if (!shouldBlockPaste()) {
            return undefined;
        }

        // Handle internal paste operations
        if (isInternalCopy && internalClipboard) {
            isInternalCopy = false;
            
            if (shouldBlockCopy()) {
                // Use internal clipboard when copy blocking is enabled
                const edit = new vscode.DocumentPasteEdit(internalClipboard, 'Clipboard Guardian: Internal paste', vscode.DocumentDropOrPasteEditKind.Empty);
                return [edit];
            } else {
                // Allow normal paste when copy blocking is disabled
                return undefined;
            }
        }

        // Block all external pastes (we already checked shouldBlockPaste() above)
        vscode.window.showWarningMessage('External paste blocked by Clipboard Guardian');
        const edit = new vscode.DocumentPasteEdit('', 'Clipboard Guardian: External paste blocked', vscode.DocumentDropOrPasteEditKind.Empty);
        return [edit];
    }
}

function shouldBlockCopy(): boolean {
    const config = vscode.workspace.getConfiguration('clipboardGuardian');
    return config.get('blockCopy', true);
}

function shouldBlockPaste(): boolean {
    const config = vscode.workspace.getConfiguration('clipboardGuardian');
    return config.get('blockPaste', true);
}

export function deactivate() {}