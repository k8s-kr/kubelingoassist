import * as vscode from 'vscode';
import * as path from 'path';
import { TranslationUtils } from './TranslationUtils';
import { StatusBarManager } from '../ui/StatusBarManager';
import { GitService } from '../git';
import { getI18n } from '../i18n';
import {
    isTranslationFile,
    isEnglishFile,
    getEnglishPathFromTranslation,
    fileExistsAsync
} from '../../utils';

export class ReviewModeHandler {
    private gitService: GitService | null = null;
    private statusBarManager: StatusBarManager | null = null;
    private translationUtils: TranslationUtils;

    constructor() {
        this.translationUtils = new TranslationUtils();
    }

    setDependencies(
        gitService: GitService | null,
        statusBarManager: StatusBarManager | null
    ): void {
        this.gitService = gitService;
        this.statusBarManager = statusBarManager;
    }

    async openReviewFile(): Promise<void> {
        if (!this.gitService) {
            getI18n().showErrorMessage('messages.gitUtilitiesNotAvailable');
            return;
        }

        const isK8sRepo = await this.gitService.isKubernetesWebsiteRepository();
        if (!isK8sRepo) {
            getI18n().showErrorMessage('messages.kubernetesRepoOnly');
            return;
        }

        try {
            const currentEditor = vscode.window.activeTextEditor;
            if (!currentEditor) {
                getI18n().showInformationMessage('messages.noActiveFile');
                return;
            }

            const currentFilePath = currentEditor.document.uri.fsPath;
            const currentFileRelativePath = vscode.workspace.asRelativePath(currentFilePath);

            const isTransFile = isTranslationFile(currentFileRelativePath) || isTranslationFile(currentFilePath);
            const isEngFile = isEnglishFile(currentFileRelativePath) || isEnglishFile(currentFilePath);

            if (isEngFile || !isTransFile) {
                getI18n().showInformationMessage('messages.reviewFileNotTranslationFile');
                return;
            }

            const originalEnglishPath = getEnglishPathFromTranslation(currentFileRelativePath);
            if (!originalEnglishPath) {
                getI18n().showInformationMessage('messages.couldNotFindEnglishFile');
                return;
            }

            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                getI18n().showErrorMessage('messages.noActiveFile');
                return;
            }

            const workspaceRoot = workspaceFolders[0].uri.fsPath;
            const absoluteEnglishPath = path.join(workspaceRoot, originalEnglishPath);

            const englishFileExists = await fileExistsAsync(absoluteEnglishPath);
            if (!englishFileExists) {
                getI18n().showInformationMessage('messages.englishFileNotFound', { path: originalEnglishPath });
                return;
            }

            await this.openFileInReviewMode(currentFilePath);
            getI18n().showInformationMessage('messages.openedForReview', { path: currentFileRelativePath });
        } catch (error) {
            getI18n().showErrorMessage('messages.failedToOpenReviewFile', {
                error: String(error)
            });
        }
    }

    async openFileInReviewMode(filePath: string): Promise<void> {
        if (!this.gitService) {
            getI18n().showErrorMessage('messages.gitUtilitiesNotAvailable');
            return;
        }

        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            const workspaceRoot = workspaceFolders?.[0]?.uri.fsPath;

            const originalEnglishPath = this.gitService.getOriginalEnglishPath(filePath);
            if (!originalEnglishPath) {
                getI18n().showErrorMessage('messages.couldNotDetermineOriginalPath');
                return;
            }

            let absoluteEnglishPath = originalEnglishPath;
            if (!path.isAbsolute(originalEnglishPath) && workspaceRoot) {
                absoluteEnglishPath = path.join(workspaceRoot, originalEnglishPath);
            }

            await this.translationUtils.openSplitView(absoluteEnglishPath, filePath);
            await this.statusBarManager?.updateAllStatusBarItems(absoluteEnglishPath, filePath);

            getI18n().showInformationMessage('messages.openedForReview', { path: filePath });
        } catch (error) {
            getI18n().showErrorMessage('messages.failedToOpenReviewMode', {
                error: String(error)
            });
        }
    }
}
