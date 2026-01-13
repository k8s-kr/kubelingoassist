import * as vscode from 'vscode';
import * as path from 'path';
import { getI18n, LANGUAGE_NAMES, LANGUAGE_OPTIONS } from '../i18n';
import {
    fileExistsAsync,
    normalizePath,
    isKubernetesContentFile,
    isEnglishFile,
    extractLanguageCode as extractLanguageCodeUtil,
    getEnglishPathFromTranslation
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
        if (!filePath || typeof filePath !== 'string') {
            console.warn('Invalid file path provided');
            return null;
        }

        const normalizedPath = normalizePath(filePath);

        if (!isKubernetesContentFile(normalizedPath)) {
            console.warn('getTranslationPath: Path does not contain /content/ directory');
            return null;
        }

        if (isEnglishFile(normalizedPath)) {
            const targetLanguage = await this.selectTargetLanguage();
            if (!targetLanguage) {
                console.log('User cancelled language selection');
                return null;
            }
            return normalizedPath.replace('/content/en/', `/content/${targetLanguage}/`);
        }

        const result = getEnglishPathFromTranslation(normalizedPath);
        if (!result) {
            console.warn('Path does not match expected content structure');
        }
        return result;
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
            await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(originalPath), { viewColumn: vscode.ViewColumn.One });
            await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(translationPath), { viewColumn: vscode.ViewColumn.Two });

            setTimeout(() => {
                vscode.window.visibleTextEditors.forEach(editor => {
                    const topPosition = new vscode.Position(0, 0);
                    editor.revealRange(new vscode.Range(topPosition, topPosition), vscode.TextEditorRevealType.AtTop);
                });
            }, EDITOR_SCROLL_DELAY_MS);

            getI18n().showInformationMessage('messages.splitViewOpened');
        } catch {
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
    }

    async createTranslationFile(originalPath: string, translationPath: string): Promise<void> {
        if (!originalPath || !translationPath) {
            getI18n().showErrorMessage('messages.invalidFilePath');
            return;
        }

        try {
            // Check original file exists
            if (!await fileExistsAsync(originalPath)) {
                getI18n().showErrorMessage('messages.originalFileNotFound', { path: originalPath });
                return;
            }

            // Check if translation already exists and confirm overwrite
            if (await fileExistsAsync(translationPath)) {
                const overwrite = await getI18n().showWarningMessage(
                    'messages.fileAlreadyExists',
                    { filename: path.basename(translationPath) },
                    getI18n().t('common.overwrite'),
                    getI18n().t('common.cancel')
                );
                if (overwrite !== getI18n().t('common.overwrite')) {
                    return;
                }
            }

            // Create directory and file
            await vscode.workspace.fs.createDirectory(vscode.Uri.file(path.dirname(translationPath)));
            await vscode.workspace.fs.writeFile(vscode.Uri.file(translationPath), Buffer.from('', 'utf8'));

            await this.openSplitView(originalPath, translationPath);
            getI18n().showInformationMessage('messages.fileCopied');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('createTranslationFile error:', error);
            getI18n().showErrorMessage('messages.fileCopyFailed', { error: errorMessage });
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
            const [originalExists, translationExists] = await Promise.all([
                fileExistsAsync(originalPath),
                fileExistsAsync(translationPath)
            ]);

            if (!originalExists || !translationExists) {
                return null;
            }

            const [originalContent, translationContent] = await Promise.all([
                vscode.workspace.fs.readFile(vscode.Uri.file(originalPath)),
                vscode.workspace.fs.readFile(vscode.Uri.file(translationPath))
            ]);

            const originalLines = originalContent.toString().split('\n').length;
            const translationLines = translationContent.toString().split('\n').length;

            return {
                originalLines,
                translationLines,
                isEqual: originalLines === translationLines,
                percentage: originalLines > 0 ? Math.round((translationLines / originalLines) * 100) : 0
            };
        } catch (error) {
            console.error('Error comparing line counts:', error);
            return null;
        }
    }
}

const translationUtils = new TranslationUtils();

export async function getTranslationPath(filePath: string): Promise<string | null> {
    return translationUtils.getTranslationPath(filePath);
}

export async function selectTargetLanguage(): Promise<string | null> {
    return translationUtils.selectTargetLanguage();
}

export async function openSplitView(originalPath: string, translationPath: string): Promise<void> {
    return translationUtils.openSplitView(originalPath, translationPath);
}

export async function createTranslationFile(originalPath: string, translationPath: string): Promise<void> {
    return translationUtils.createTranslationFile(originalPath, translationPath);
}

export function extractLanguage(filePath: string): string {
    return translationUtils.extractLanguage(filePath);
}

export function extractLanguageCode(filePath: string): string {
    return translationUtils.extractLanguageCode(filePath);
}

export async function compareLineCounts(originalPath: string, translationPath: string): Promise<FileTranslationProgress | null> {
    return translationUtils.compareLineCounts(originalPath, translationPath);
}
