import * as vscode from 'vscode';
import { TranslationUtils } from './TranslationUtils';
import { ScrollSyncManager } from './ScrollSyncManager';
import { TranslationStateManager } from './TranslationStateManager';
import { ReviewModeHandler } from './ReviewModeHandler';
import { StatusBarManager } from '../ui/StatusBarManager';
import { TranslationViewProvider } from '../ui/webview-providers';
import { GitService } from '../git';
import { getI18n } from '../i18n';
import { PRInfoService } from '../review';

export class TranslationCommandManager {
    private gitService: GitService | null = null;
    private statusBarManager: StatusBarManager | null = null;
    private translationViewProvider: TranslationViewProvider | null = null;
    private prInfoService: PRInfoService | null = null;

    private translationUtils: TranslationUtils;
    private scrollSyncManager: ScrollSyncManager;
    private stateManager: TranslationStateManager;
    private reviewModeHandler: ReviewModeHandler;

    constructor() {
        this.translationUtils = new TranslationUtils();
        this.scrollSyncManager = new ScrollSyncManager();
        this.stateManager = new TranslationStateManager();
        this.reviewModeHandler = new ReviewModeHandler();
    }

    setDependencies(
        statusBarManager: StatusBarManager,
        translationViewProvider: TranslationViewProvider,
        prInfoService?: PRInfoService
    ): void {
        this.statusBarManager = statusBarManager;
        this.translationViewProvider = translationViewProvider;
        this.prInfoService = prInfoService ?? null;
        this.reviewModeHandler.setDependencies(this.gitService, this.statusBarManager);
    }

    initStateFromStorage(context: vscode.ExtensionContext): void {
        this.stateManager.initialize(context);
        this.initializeGitUtils();

        vscode.commands.executeCommand(
            'setContext',
            'kubelingoassist.reviewMode',
            this.stateManager.currentMode === 'review'
        );

        this.syncWebviewState();
    }

    private initializeGitUtils(): void {
        try {
            this.gitService = new GitService();
            this.reviewModeHandler.setDependencies(this.gitService, this.statusBarManager);
        } catch (error) {
            console.error('Failed to initialize GitService:', error);
        }
    }

    private syncWebviewState(): void {
        this.translationViewProvider?.broadcastState({
            syncScrollEnabled: this.stateManager.isSyncScrollEnabled,
            mode: this.stateManager.currentMode,
        });
    }

    getState(): {
        isSyncScrollEnabled: boolean;
        currentMode: 'translation' | 'review';
    } {
        return this.stateManager.getState();
    }

    registerCommands(context: vscode.ExtensionContext): void {
        context.subscriptions.push(
            vscode.commands.registerCommand(
                'kubelingoassist.openTranslationFile',
                (uri?: vscode.Uri) => this.openTranslationFile(uri)
            ),
            vscode.commands.registerCommand(
                'kubelingoassist.openReviewFile',
                () => this.reviewModeHandler.openReviewFile()
            ),
            vscode.commands.registerCommand(
                'kubelingoassist.toggleSyncScroll',
                () => this.toggleSyncScroll()
            ),
            vscode.commands.registerCommand(
                'kubelingoassist.changeMode',
                (mode: 'translation' | 'review') => this.changeMode(mode)
            )
        );
    }

    private async openTranslationFile(uri?: vscode.Uri): Promise<void> {
        if (this.gitService) {
            const isK8sRepo = await this.gitService.isKubernetesWebsiteRepository();
            if (!isK8sRepo) {
                getI18n().showErrorMessage('messages.notKubernetesRepo');
                return;
            }
        }

        const filePath = this.getFilePath(uri);
        if (!filePath) {
            getI18n().showErrorMessage('messages.noActiveFile');
            return;
        }

        const translationPath = await this.translationUtils.getTranslationPath(filePath);
        if (!translationPath) {
            getI18n().showErrorMessage('messages.cannotFindTranslationPath');
            return;
        }

        await this.translationUtils.openSplitView(filePath, translationPath);
        await this.statusBarManager?.updateAllStatusBarItems(filePath, translationPath);
        this.syncWebviewState();
    }

    private toggleSyncScroll(): void {
        const isEnabled = this.stateManager.toggleSyncScroll();

        if (isEnabled) {
            this.scrollSyncManager.setupSynchronizedScrolling();
            getI18n().showInformationMessage('messages.syncScrollEnabled');
        } else {
            this.scrollSyncManager.cleanupScrollListeners();
            getI18n().showInformationMessage('messages.syncScrollDisabled');
        }

        this.syncWebviewState();
    }

    private async changeMode(mode: 'translation' | 'review'): Promise<void> {
        this.stateManager.currentMode = mode;
        vscode.commands.executeCommand('setContext', 'kubelingoassist.reviewMode', mode === 'review');

        const messageKey = mode === 'review'
            ? 'messages.reviewModeEnabled'
            : 'messages.translationModeEnabled';
        getI18n().showInformationMessage(messageKey);

        this.syncWebviewState();
    }

    async openFileInReviewMode(filePath: string): Promise<void> {
        await this.reviewModeHandler.openFileInReviewMode(filePath);
    }

    private getFilePath(uri?: vscode.Uri): string | undefined {
        if (uri) {
            return uri.fsPath;
        }

        const currentEditor = vscode.window.activeTextEditor;
        return currentEditor?.document.uri.fsPath;
    }

    dispose(): void {
        this.scrollSyncManager.cleanupScrollListeners();
    }
}
