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
        if (!editor || !isEnabled()) {
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
        if (!editor || !isEnabled()) {
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
        
        if (!isEnabled()) {
            return undefined;
        }

        // If we have internal clipboard content and copy blocking is enabled, use internal clipboard
        if (isInternalCopy && internalClipboard && shouldBlockCopy()) {
            isInternalCopy = false;
            const edit = new vscode.DocumentPasteEdit(internalClipboard, 'Clipboard Guardian: Internal paste', vscode.DocumentDropOrPasteEditKind.Empty);
            return [edit];
        }

        const clipboardText = await vscode.env.clipboard.readText();
        
        // Allow paste if it matches our internal clipboard (copy blocking disabled case)
        if (isInternalCopy && internalClipboard === clipboardText) {
            isInternalCopy = false;
            return undefined;
        }

        // Block external pastes
        if (clipboardText && clipboardText !== internalClipboard) {
            vscode.window.showWarningMessage('External paste blocked by Clipboard Guardian');
            const edit = new vscode.DocumentPasteEdit('', 'Clipboard Guardian: External paste blocked', vscode.DocumentDropOrPasteEditKind.Empty);
            return [edit];
        }

        return undefined;
    }
}

function isEnabled(): boolean {
    const config = vscode.workspace.getConfiguration('clipboardGuardian');
    return config.get('enabled', true);
}

function shouldBlockCopy(): boolean {
    const config = vscode.workspace.getConfiguration('clipboardGuardian');
    return config.get('blockCopy', true);
}

export function deactivate() {}