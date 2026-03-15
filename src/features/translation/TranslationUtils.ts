import * as vscode from 'vscode';
import * as path from 'path';
import { i18n, LANGUAGE_NAMES, SUPPORTED_LANGUAGES, LANGUAGE_OPTIONS, LanguageInfo } from '../i18n';
import { extractLanguageCode as _extractLanguageCode, getOriginalEnglishPath, CONTENT_LANG_REGEX } from '../../core/path-utils';

/**
 * 번역 진행률 정보를 나타내는 인터페이스입니다.
 */
export interface FileTranslationProgress {
    /** 원본 파일의 총 라인 수 */
    originalLines: number;
    /** 번역 파일의 총 라인 수 */
    translationLines: number;
    /** 원본과 번역 파일의 라인 수가 동일한지 여부 */
    isEqual: boolean;
    /** 번역 진행률 (번역 라인 수 / 원본 라인 수 * 100, 반올림) */
    percentage: number;
}

/**
 * 쿠버네티스 문서 번역을 위한 유틸리티 클래스입니다.
 * 파일 경로 변환, Split View 관리, 언어 처리 등의 기능을 제공합니다.
 */
export class TranslationUtils {

    /**
     * 주어진 파일 경로에서 번역 파일의 경로를 생성합니다.
     * 영어 파일의 경우 대상 언어의 번역 파일 경로를 반환하고,
     * 번역 파일의 경우 원본 영어 파일 경로를 반환합니다.
     * 
     * @param filePath - 변환할 파일의 절대 경로
     * @returns 번역 파일 경로 또는 null (변환할 수 없는 경우)
     */
    async getTranslationPath(filePath: string): Promise<string | null> {
        if (!this.validateFilePath(filePath)) {
            return null;
        }

        const normalizedPath = this.normalizePath(filePath);
        
        if (!this.isKubernetesContentPath(normalizedPath)) {
            console.warn('getTranslationPath: Path does not contain /content/ directory');
            return null;
        }
        
        if (this.isEnglishFile(normalizedPath)) {
            return await this.getTranslationPathFromEnglish(normalizedPath);
        }
        
        return this.getEnglishPathFromTranslation(normalizedPath);
    }

    /**
     * 사용자에게 번역 대상 언어를 선택하도록 하는 VS Code Quick Pick을 표시합니다.
     * 
     * @returns 선택된 언어 코드 또는 null (취소된 경우)
     */
    async selectTargetLanguage(): Promise<string | null> {
        const selected = await i18n.showQuickPick(LANGUAGE_OPTIONS, {
            placeholderKey: 'ui.selectTargetLanguage',
            matchOnDescription: true
        });
        
        return selected?.value || null;
    }

    /**
     * 원본 파일과 번역 파일을 Split View로 엽니다.
     * 
     * @param originalPath - 원본 파일의 절대 경로
     * @param translationPath - 번역 파일의 절대 경로
     */
    async openSplitView(originalPath: string, translationPath: string): Promise<void> {
        try {
            await this.openFilesInSplitView(originalPath, translationPath);
            this.scrollEditorsToTop();
            this.showSplitViewMessage();
        } catch (error) {
            await this.handleSplitViewError(originalPath, translationPath);
        }
    }

    /**
     * 원본 파일을 복사하여 새로운 번역 파일을 생성합니다.
     * 
     * @param originalPath - 복사할 원본 파일의 절대 경로
     * @param translationPath - 생성할 번역 파일의 절대 경로
     */
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
            
            i18n.showInformationMessage('messages.fileCopied');
        } catch (error) {
            this.handleFileCreationError(error);
        }
    }

    /**
     * 파일 경로에서 언어명을 추출합니다.
     * 
     * @param filePath - 언어를 추출할 파일의 절대 경로
     * @returns 언어명 또는 'Unknown'
     */
    extractLanguage(filePath: string): string {
        const langCode = this.extractLanguageCode(filePath);
        return LANGUAGE_NAMES[langCode] || langCode.toUpperCase();
    }

    /**
     * 파일 경로에서 언어 코드를 추출합니다.
     * 
     * @param filePath - 언어 코드를 추출할 파일의 절대 경로
     * @returns 언어 코드 또는 'unknown'
     */
    extractLanguageCode(filePath: string): string {
        return _extractLanguageCode(filePath);
    }

    /**
     * 원본 파일과 번역 파일의 라인 수를 비교하여 번역 진행률을 계산합니다.
     * 
     * @param originalPath - 원본 파일의 절대 경로
     * @param translationPath - 번역 파일의 절대 경로
     * @returns 번역 진행률 정보 또는 null
     */
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

    // Private helper methods

    private validateFilePath(filePath: string): boolean {
        if (!filePath || typeof filePath !== 'string') {
            console.warn('Invalid file path provided');
            return false;
        }
        return true;
    }

    private normalizePath(filePath: string): string {
        return filePath.replace(/\\\\/g, '/');
    }

    private isKubernetesContentPath(normalizedPath: string): boolean {
        return normalizedPath.includes('/content/');
    }

    private isEnglishFile(normalizedPath: string): boolean {
        return normalizedPath.includes('/content/en/');
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
        const langCode = _extractLanguageCode(normalizedPath);
        if (langCode === 'unknown' || langCode === 'en') {
            console.warn('Path does not match expected content structure');
            return null;
        }

        if (!SUPPORTED_LANGUAGES.includes(langCode as any)) {
            console.warn(`Unsupported language code: ${langCode}`);
            return null;
        }

        return getOriginalEnglishPath(normalizedPath);
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
        }, 100);
    }

    private showSplitViewMessage(): void {
        i18n.showInformationMessage('messages.splitViewOpened');
    }

    private async handleSplitViewError(originalPath: string, translationPath: string): Promise<void> {
        const createFile = await i18n.showWarningMessage(
            'messages.translationFileNotExists',
            undefined,
            i18n.t('common.create'),
            i18n.t('common.cancel')
        );
        
        if (createFile === i18n.t('common.create')) {
            await this.createTranslationFile(originalPath, translationPath);
        }
    }

    private validateCreateFileParams(originalPath: string, translationPath: string): boolean {
        if (!originalPath || !translationPath) {
            i18n.showErrorMessage('messages.invalidFilePath');
            return false;
        }
        return true;
    }

    private async checkFileCreationPreconditions(originalPath: string, translationPath: string): Promise<boolean> {
        const originalExists = await this.fileExists(originalPath);
        if (!originalExists) {
            i18n.showErrorMessage('messages.originalFileNotFound', { path: originalPath });
            return false;
        }
        
        const translationExists = await this.fileExists(translationPath);
        if (translationExists) {
            return await this.confirmOverwrite(translationPath);
        }
        
        return true;
    }

    private async fileExists(filePath: string): Promise<boolean> {
        try {
            await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
            return true;
        } catch {
            return false;
        }
    }

    private async confirmOverwrite(translationPath: string): Promise<boolean> {
        const overwrite = await i18n.showWarningMessage(
            'messages.fileAlreadyExists',
            { filename: path.basename(translationPath) },
            i18n.t('common.overwrite'),
            i18n.t('common.cancel')
        );
        
        return overwrite === i18n.t('common.overwrite');
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
        i18n.showErrorMessage('messages.fileCopyFailed', { error: errorMessage });
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