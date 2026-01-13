import * as vscode from 'vscode';
import { TranslationViewProvider } from '../features/ui/webview-providers';
import { StatusBarManager } from '../features/ui/StatusBarManager';
import { TranslationCommandManager } from '../features/translation/TranslationCommandManager';
import { ScrollSyncManager } from '../features/translation/ScrollSyncManager';
import { LinkValidator } from '../validators/link';
import { PRInfoService } from '../features/review/PRInfoService';
import { i18n } from '../features/i18n';

let statusBarManager: StatusBarManager;
let linkValidator: LinkValidator;
let translationCommandManager: TranslationCommandManager;
let scrollSyncManager: ScrollSyncManager;
let prInfoService: PRInfoService;

function registerPRCommands(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'kubelingoassist.fetchPRInfo',
            async (prNumber?: number) => {
                try {
                    if (!prNumber) {
                        const input = await vscode.window.showInputBox({
                            prompt: i18n.t('messages.pr.enterPRNumber'),
                            placeHolder: '123',
                            validateInput: (value) => {
                                const num = parseInt(value);
                                if (isNaN(num) || num <= 0) {
                                    return i18n.t('messages.pr.enterValidPRNumber');
                                }
                                return null;
                            }
                        });

                        if (!input) {
                            return;
                        }

                        prNumber = parseInt(input);
                    }

                    i18n.showInformationMessage('messages.pr.fetchingPR', { number: String(prNumber) });

                    const prDetails = await prInfoService.getPRDetails(prNumber);
                    if (!prDetails) {
                        i18n.showErrorMessage('messages.pr.failedToFetchPR', { number: String(prNumber) });
                        return;
                    }

                    i18n.showInformationMessage('messages.pr.checkingOutPR', { number: String(prNumber) });
                    await prInfoService.checkoutPR(prNumber, prDetails.title);

                    const workspaceFolders = vscode.workspace.workspaceFolders;
                    if (!workspaceFolders || workspaceFolders.length === 0) {
                        i18n.showErrorMessage('messages.noActiveFile');
                        return;
                    }

                    const workspaceRoot = workspaceFolders[0].uri.fsPath;
                    let openedCount = 0;
                    let skippedCount = 0;

                    const markdownFiles = prInfoService.filterMarkdownFiles(prDetails.files);

                    for (const file of markdownFiles) {
                        try {
                            const filePath = `${workspaceRoot}/${file.path}`;
                            const fileUri = vscode.Uri.file(filePath);
                            await vscode.commands.executeCommand('vscode.open', fileUri);
                            openedCount++;
                        } catch (error) {
                            console.error(`Failed to open file ${file.path}:`, error);
                            skippedCount++;
                        }
                    }

                    i18n.showInformationMessage('messages.pr.prFetchedSuccess', {
                        number: String(prNumber),
                        title: prDetails.title,
                        count: String(openedCount),
                        author: prDetails.author,
                        state: prDetails.state
                    });

                    if (skippedCount > 0) {
                        console.warn(`Skipped ${skippedCount} file(s) due to errors`);
                    }
                } catch (error) {
                    i18n.showErrorMessage('messages.pr.failedToFetchPRInfo', { error: String(error) });
                    console.error('fetchPRInfo error:', error);
                }
            }
        )
    );
}

export function activate(context: vscode.ExtensionContext) {
    statusBarManager = new StatusBarManager();
    linkValidator = new LinkValidator();
    translationCommandManager = new TranslationCommandManager();
    scrollSyncManager = new ScrollSyncManager();
    prInfoService = new PRInfoService();

    const provider = new TranslationViewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('kubelingoassist-view', provider)
    );

    translationCommandManager.setDependencies(statusBarManager, provider, prInfoService);
    translationCommandManager.registerCommands(context);
    registerPRCommands(context);
    translationCommandManager.initStateFromStorage(context);

    vscode.workspace.textDocuments.forEach(document => {
        linkValidator.validateLinks(document);
    });

    const onDidChangeTextDocument = vscode.workspace.onDidChangeTextDocument((event) => {
        linkValidator.validateLinks(event.document);
        if (event.document.languageId === 'markdown') {
            statusBarManager.debouncedRefreshLineCount();
        }
    });

    const onDidSaveTextDocument = vscode.workspace.onDidSaveTextDocument(async (document) => {
        if (document.languageId === 'markdown') {
            await statusBarManager.refreshLineCount();
        }
    });

    const onDidOpenTextDocument = vscode.workspace.onDidOpenTextDocument((document) => {
        linkValidator.validateLinks(document);
    });
    
    context.subscriptions.push(
        ...statusBarManager.getItems(),
        linkValidator.getDiagnostics(),
        linkValidator.getCodeActionProvider(),
        onDidChangeTextDocument,
        onDidSaveTextDocument,
        onDidOpenTextDocument
    );
}

export function deactivate() {
    if (scrollSyncManager) {
        scrollSyncManager.cleanupScrollListeners();
    }
    if (statusBarManager) {
        statusBarManager.dispose();
    }
    if (linkValidator) {
        linkValidator.dispose();
    }
}