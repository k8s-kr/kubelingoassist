import * as vscode from 'vscode';
import * as path from 'path';
import { TranslationUtils } from './TranslationUtils';
import { StatusBarManager } from '../ui/StatusBarManager';
import { GitService, GitChangedFile } from '../git';
import { getI18n } from '../i18n';

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
            const commits = await this.gitService.findCommitsWithTranslationFiles(1);
            if (commits.length === 0) {
                getI18n().showErrorMessage('messages.noRecentCommits');
                return;
            }

            const commitInfo = commits[0];
            const translationFiles = this.gitService.filterTranslationFiles(commitInfo.files);
            if (translationFiles.length === 0) {
                getI18n().showErrorMessage('messages.noTranslationFilesFound');
                return;
            }

            if (translationFiles.length === 1) {
                await this.openFileInReviewMode(translationFiles[0].absPath);
                return;
            }

            const selectedFiles = await this.showFileSelectionQuickPick(translationFiles);
            if (selectedFiles.length === 0) {
                return;
            }

            await this.openAllFilesInReviewMode(selectedFiles);
        } catch (error) {
            getI18n().showErrorMessage('messages.failedToOpenReviewFile', {
                error: String(error)
            });
        }
    }

    private async showFileSelectionQuickPick(files: GitChangedFile[]): Promise<GitChangedFile[]> {
        const items = files.map(file => ({
            label: path.basename(file.path),
            description: file.path,
            file
        }));

        const selected = await vscode.window.showQuickPick(items, {
            canPickMany: true,
            placeHolder: getI18n().t('ui.selectFileToReview')
        });

        if (!selected) {
            return [];
        }

        return selected.map(item => item.file);
    }

    private async openAllFilesInReviewMode(files: GitChangedFile[]): Promise<void> {
        for (const file of files) {
            await this.openFileInReviewMode(file.absPath);
        }

        getI18n().showInformationMessage('messages.openedForReview', {
            path: `${files.length} files`
        });
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
