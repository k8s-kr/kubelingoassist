import * as vscode from 'vscode';
import * as path from 'path';
import { getI18n, LANGUAGE_NAMES, SUPPORTED_LANGUAGES, LANGUAGE_OPTIONS, LanguageInfo } from '../i18n';
import {
    fileExistsAsync,
    normalizePath,
    isKubernetesContentFile,
    isEnglishFile as isEnglishFileUtil,
    extractLanguageCode as extractLanguageCodeUtil,
    getEnglishPathFromTranslation as getEnglishPathFromTranslationUtil
} from '../../utils';

const EDITOR_SCROLL_DELAY_MS = 100;

export interface FileTranslationProgress {
    originalLines: number;
    translationLines: number;
    isEqual: boolean;
    percentage: number;
}

export class TranslationUtils {

    async getTranslationPath(filePath: string): Promise<string | null> {
        if (!this.validateFilePath(filePath)) {
            return null;
        }

        const normalizedPath = this.normalizePathInternal(filePath);
        
        if (!this.isKubernetesContentPath(normalizedPath)) {
            console.warn('getTranslationPath: Path does not contain /content/ directory');
            return null;
        }
        
        if (this.isEnglishFile(normalizedPath)) {
            return await this.getTranslationPathFromEnglish(normalizedPath);
        }
        
        return this.getEnglishPathFromTranslation(normalizedPath);
    }

    async selectTargetLanguage(): Promise<string | null> {
        const selected = await getI18n().showQuickPick(LANGUAGE_OPTIONS, {
            placeholderKey: 'ui.selectTargetLanguage',
            matchOnDescription: true
        });
        
        return selected?.value || null;
    }

    async openSplitView(originalPath: string, translationPath: string): Promise<void> {
        try {
            await this.openFilesInSplitView(originalPath, translationPath);
            this.scrollEditorsToTop();
            this.showSplitViewMessage();
        } catch (error) {
            await this.handleSplitViewError(originalPath, translationPath);
        }
    }

    async createTranslationFile(originalPath: string, translationPath: string): Promise<void> {
        if (!this.validateCreateFileParams(originalPath, translationPath)) {
            return;
        }

        try {
            const canProceed = await this.checkFileCreationPreconditions(originalPath, translationPath);
            if (!canProceed) {
                return;
            }

            await this.createFileAndDirectory(translationPath);
            await this.openSplitView(originalPath, translationPath);
            
            getI18n().showInformationMessage('messages.fileCopied');
        } catch (error) {
            this.handleFileCreationError(error);
        }
    }

    extractLanguage(filePath: string): string {
        const langCode = this.extractLanguageCode(filePath);
        return LANGUAGE_NAMES[langCode] || langCode.toUpperCase();
    }

    extractLanguageCode(filePath: string): string {
        return extractLanguageCodeUtil(filePath);
    }

    async compareLineCounts(originalPath: string, translationPath: string): Promise<FileTranslationProgress | null> {
        try {
            const filesExist = await this.checkBothFilesExist(originalPath, translationPath);
            if (!filesExist) {
                return null;
            }

            const [originalContent, translationContent] = await this.readBothFiles(originalPath, translationPath);
            const [originalLines, translationLines] = this.calculateLineCounts(originalContent, translationContent);
            
            return this.createProgressResult(originalLines, translationLines);
        } catch (error) {
            console.error('Error comparing line counts:', error);
            return null;
        }
    }

    private validateFilePath(filePath: string): boolean {
        if (!filePath || typeof filePath !== 'string') {
            console.warn('Invalid file path provided');
            return false;
        }
        return true;
    }

    private normalizePathInternal(filePath: string): string {
        return normalizePath(filePath);
    }

    private isKubernetesContentPath(normalizedPath: string): boolean {
        return isKubernetesContentFile(normalizedPath);
    }

    private isEnglishFile(normalizedPath: string): boolean {
        return isEnglishFileUtil(normalizedPath);
    }

    private async getTranslationPathFromEnglish(normalizedPath: string): Promise<string | null> {
        const targetLanguage = await this.selectTargetLanguage();
        if (!targetLanguage) {
            console.log('User cancelled language selection');
            return null;
        }
        
        return normalizedPath.replace('/content/en/', `/content/${targetLanguage}/`);
    }

    private getEnglishPathFromTranslation(normalizedPath: string): string | null {
        const result = getEnglishPathFromTranslationUtil(normalizedPath);
        if (!result) {
            console.warn('Path does not match expected content structure');
        }
        return result;
    }

    private async openFilesInSplitView(originalPath: string, translationPath: string): Promise<void> {
        const originalUri = vscode.Uri.file(originalPath);
        await vscode.commands.executeCommand('vscode.open', originalUri, { viewColumn: vscode.ViewColumn.One });
        
        const translationUri = vscode.Uri.file(translationPath);
        await vscode.commands.executeCommand('vscode.open', translationUri, { viewColumn: vscode.ViewColumn.Two });
    }

    private scrollEditorsToTop(): void {
        setTimeout(() => {
            const editors = vscode.window.visibleTextEditors;
            editors.forEach(editor => {
                const topPosition = new vscode.Position(0, 0);
                editor.revealRange(new vscode.Range(topPosition, topPosition), vscode.TextEditorRevealType.AtTop);
            });
        }, EDITOR_SCROLL_DELAY_MS);
    }

    private showSplitViewMessage(): void {
        getI18n().showInformationMessage('messages.splitViewOpened');
    }

    private async handleSplitViewError(originalPath: string, translationPath: string): Promise<void> {
        const createFile = await getI18n().showWarningMessage(
            'messages.translationFileNotExists',
            undefined,
            getI18n().t('common.create'),
            getI18n().t('common.cancel')
        );
        
        if (createFile === getI18n().t('common.create')) {
            await this.createTranslationFile(originalPath, translationPath);
        }
    }

    private validateCreateFileParams(originalPath: string, translationPath: string): boolean {
        if (!originalPath || !translationPath) {
            getI18n().showErrorMessage('messages.invalidFilePath');
            return false;
        }
        return true;
    }

    private async checkFileCreationPreconditions(originalPath: string, translationPath: string): Promise<boolean> {
        const originalExists = await this.fileExists(originalPath);
        if (!originalExists) {
            getI18n().showErrorMessage('messages.originalFileNotFound', { path: originalPath });
            return false;
        }
        
        const translationExists = await this.fileExists(translationPath);
        if (translationExists) {
            return await this.confirmOverwrite(translationPath);
        }
        
        return true;
    }

    private async fileExists(filePath: string): Promise<boolean> {
        return fileExistsAsync(filePath);
    }

    private async confirmOverwrite(translationPath: string): Promise<boolean> {
        const overwrite = await getI18n().showWarningMessage(
            'messages.fileAlreadyExists',
            { filename: path.basename(translationPath) },
            getI18n().t('common.overwrite'),
            getI18n().t('common.cancel')
        );
        
        return overwrite === getI18n().t('common.overwrite');
    }

    private async createFileAndDirectory(translationPath: string): Promise<void> {
        const dir = path.dirname(translationPath);
        await vscode.workspace.fs.createDirectory(vscode.Uri.file(dir));
        
        await vscode.workspace.fs.writeFile(
            vscode.Uri.file(translationPath),
            Buffer.from('', 'utf8')
        );
    }

    private handleFileCreationError(error: unknown): void {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('createTranslationFile error:', error);
        getI18n().showErrorMessage('messages.fileCopyFailed', { error: errorMessage });
    }

    private async checkBothFilesExist(originalPath: string, translationPath: string): Promise<boolean> {
        const originalExists = await this.fileExists(originalPath);
        const translationExists = await this.fileExists(translationPath);
        
        return originalExists && translationExists;
    }

    private async readBothFiles(originalPath: string, translationPath: string): Promise<[Uint8Array, Uint8Array]> {
        const originalContent = await vscode.workspace.fs.readFile(vscode.Uri.file(originalPath));
        const translationContent = await vscode.workspace.fs.readFile(vscode.Uri.file(translationPath));
        
        return [originalContent, translationContent];
    }

    private calculateLineCounts(originalContent: Uint8Array, translationContent: Uint8Array): [number, number] {
        const originalLines = originalContent.toString().split('\n').length;
        const translationLines = translationContent.toString().split('\n').length;
        
        return [originalLines, translationLines];
    }

    private createProgressResult(originalLines: number, translationLines: number): FileTranslationProgress {
        return {
            originalLines,
            translationLines,
            isEqual: originalLines === translationLines,
            percentage: originalLines > 0 ? Math.round((translationLines / originalLines) * 100) : 0
        };
    }
}

const translationUtils = new TranslationUtils();

export async function getTranslationPath(filePath: string): Promise<string | null> {
    return await translationUtils.getTranslationPath(filePath);
}

export async function selectTargetLanguage(): Promise<string | null> {
    return await translationUtils.selectTargetLanguage();
}

export async function openSplitView(originalPath: string, translationPath: string): Promise<void> {
    return await translationUtils.openSplitView(originalPath, translationPath);
}

export async function createTranslationFile(originalPath: string, translationPath: string): Promise<void> {
    return await translationUtils.createTranslationFile(originalPath, translationPath);
}

export function extractLanguage(filePath: string): string {
    return translationUtils.extractLanguage(filePath);
}

export function extractLanguageCode(filePath: string): string {
    return translationUtils.extractLanguageCode(filePath);
}

export async function compareLineCounts(originalPath: string, translationPath: string): Promise<FileTranslationProgress | null> {
    return await translationUtils.compareLineCounts(originalPath, translationPath);
}