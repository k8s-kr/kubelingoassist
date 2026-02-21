import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { TranslationUtils } from '../features/translation/TranslationUtils';

interface LinkInfo {
    text: string;
    path: string;
    fullMatch: string;
    range: vscode.Range;
}

interface ValidationResult {
    translationExists: boolean;
    expectedPath: string | null;
    isFolder: boolean;
}

const CONSTANTS = {
    DIAGNOSTICS_COLLECTION_NAME: 'kubelingoassist-links',
    DIAGNOSTIC_SOURCE: 'KubeLingoAssist',
    DIAGNOSTIC_CODE: 'missing-language-path',
    LINK_REGEX: /\[([^\]]*)\]\(\/docs\/([^)]*)\)/g,
    LANGUAGE_CODE_REGEX: /^[a-z]{2}\/|^en\//,
    TRANSLATION_FILE_PATTERN: /\/content\/([^\/]+)\/docs\//,
    EXCLUDED_LANGUAGE: 'en'
} as const;

const MESSAGES = {
    WARNING_TEMPLATE: (resourceType: string) =>
        `⚠️ 번역 ${resourceType}이 존재합니다.`,
    CODE_ACTION_TITLE: (language: string) => `언어 경로 추가: /${language}/docs/...`
} as const;

export class LinkValidator {
    private diagnostics: vscode.DiagnosticCollection;
    private codeActionProvider: LinkCodeActionProvider;
    private translationUtils = new TranslationUtils();

    constructor() {
        this.diagnostics = vscode.languages.createDiagnosticCollection('kubelingoassist-links');
        this.codeActionProvider = new LinkCodeActionProvider();
    }

    public validateLinks(document: vscode.TextDocument): number {
        if (!this.isTranslationFile(document.uri.fsPath)) {
            this.diagnostics.delete(document.uri);
            return 0;
        }

        const currentLanguage = this.translationUtils.extractLanguageCode(document.uri.fsPath);
        const diagnostics: vscode.Diagnostic[] = [];
        const text = document.getText();

        const linkRegex = /\[([^\]]*)\]\(\/docs\/([^)]*)\)/g;
        let match;

        while ((match = linkRegex.exec(text)) !== null) {
            const linkText = match[1];
            const linkPath = match[2];
            const fullMatch = match[0];
            
            if (linkPath.match(/^[a-z]{2}\//) || linkPath.match(/^en\//)) {
                continue;
            }
            
            const startPos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + fullMatch.length);
            const range = new vscode.Range(startPos, endPos);

            // Extract base path for links with anchor tags
            const baseLinkPath = linkPath.split('#')[0];
            const expectedTranslationPath = this.getExpectedTranslationPath(document.uri.fsPath, baseLinkPath, currentLanguage);
            let translationExists = false;
            
            if (expectedTranslationPath) {
                if (baseLinkPath.endsWith('/')) {
                    const folderExists = this.fileExists(expectedTranslationPath);
                    const fileName = path.basename(baseLinkPath.replace(/\/$/, '')) + '.md';
                    const filePath = path.join(path.dirname(expectedTranslationPath), fileName);
                    const fileExists = this.fileExists(filePath);
                    translationExists = folderExists || fileExists;
                } else {
                    translationExists = this.fileExists(expectedTranslationPath);
                }
            }

            if (translationExists && expectedTranslationPath) {
                const isFolder = baseLinkPath.endsWith('/');
                const resourceType = isFolder ? '폴더' : '파일';
                const message = `⚠️ 번역 ${resourceType}이 존재합니다.`;
                const diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Warning);
                diagnostic.source = 'KubeLingoAssist';
                diagnostic.code = 'missing-language-path';
                const translationFilePath = this.resolveTranslationFilePath(expectedTranslationPath, isFolder);
                const translationUri = vscode.Uri.file(translationFilePath);
                diagnostic.relatedInformation = [
                    new vscode.DiagnosticRelatedInformation(
                        new vscode.Location(translationUri, new vscode.Position(0, 0)),
                        `/${currentLanguage.toLowerCase()}/docs/${linkPath}`
                    )
                ];
                diagnostics.push(diagnostic);
            }
        }

        this.diagnostics.set(document.uri, diagnostics);
        return diagnostics.length;
    }

    private isTranslationFile(filePath: string): boolean {
        const match = filePath.match(CONSTANTS.TRANSLATION_FILE_PATTERN);
        return match !== null && match[1] !== CONSTANTS.EXCLUDED_LANGUAGE;
    }

    private extractLinks(document: vscode.TextDocument): LinkInfo[] {
        const text = document.getText();
        const links: LinkInfo[] = [];
        const regex = new RegExp(CONSTANTS.LINK_REGEX.source, 'g');
        let match;

        while ((match = regex.exec(text)) !== null) {
            const linkText = match[1];
            const linkPath = match[2];
            const fullMatch = match[0];
            const startPos = document.positionAt(match.index!);
            const endPos = document.positionAt(match.index! + fullMatch.length);
            const range = new vscode.Range(startPos, endPos);

            links.push({
                text: linkText,
                path: linkPath,
                fullMatch,
                range
            });
        }

        return links;
    }

    private shouldSkipLink(linkPath: string): boolean {
        return CONSTANTS.LANGUAGE_CODE_REGEX.test(linkPath);
    }

    private validateLink(currentFilePath: string, linkPath: string, currentLanguage: string): ValidationResult {
        const expectedTranslationPath = this.getExpectedTranslationPath(currentFilePath, linkPath, currentLanguage);
        const translationExists = expectedTranslationPath ? this.fileExists(expectedTranslationPath) : false;
        const isFolder = linkPath.endsWith('/');

        return {
            translationExists,
            expectedPath: expectedTranslationPath,
            isFolder
        };
    }

    private createDiagnostic(linkInfo: LinkInfo, validationResult: ValidationResult, currentLanguage: string): vscode.Diagnostic {
        const resourceType = validationResult.isFolder ? '폴더' : '파일';
        const message = MESSAGES.WARNING_TEMPLATE(resourceType);

        const diagnostic = new vscode.Diagnostic(linkInfo.range, message, vscode.DiagnosticSeverity.Warning);
        diagnostic.source = CONSTANTS.DIAGNOSTIC_SOURCE;
        diagnostic.code = CONSTANTS.DIAGNOSTIC_CODE;

        if (validationResult.expectedPath) {
            const translationFilePath = this.resolveTranslationFilePath(validationResult.expectedPath, validationResult.isFolder);
            const translationUri = vscode.Uri.file(translationFilePath);
            diagnostic.relatedInformation = [
                new vscode.DiagnosticRelatedInformation(
                    new vscode.Location(translationUri, new vscode.Position(0, 0)),
                    `/${currentLanguage.toLowerCase()}/docs/${linkInfo.path}`
                )
            ];
        }

        return diagnostic;
    }

    public dispose() {
        this.diagnostics.dispose();
        this.codeActionProvider.dispose();
    }

    public getDiagnostics(): vscode.DiagnosticCollection {
        return this.diagnostics;
    }

    public getCodeActionProvider(): LinkCodeActionProvider {
        return this.codeActionProvider;
    }


    private resolveTranslationFilePath(expectedPath: string, isFolder: boolean): string {
        if (!isFolder) {
            return expectedPath;
        }

        const indexPath = path.join(expectedPath, '_index.md');
        if (this.fileExists(indexPath)) {
            return indexPath;
        }

        const folderName = path.basename(expectedPath);
        const parentFilePath = path.join(path.dirname(expectedPath), folderName + '.md');
        if (this.fileExists(parentFilePath)) {
            return parentFilePath;
        }

        return expectedPath;
    }

    private getExpectedTranslationPath(currentFilePath: string, linkPath: string, language: string): string | null {
        try {
            const contentMatch = currentFilePath.match(/(.*\/content)\/[^/]+\/docs\//);
            if (!contentMatch) {
                return null;
            }

            const contentRoot = contentMatch[1];
            let expectedPath = path.join(contentRoot, language.toLowerCase(), 'docs', linkPath);
            
            if (linkPath.endsWith('/')) {
                return expectedPath;
            }
            
            if (!expectedPath.endsWith('.md')) {
                expectedPath += '.md';
            }
            
            return expectedPath;
        } catch (error) {
            console.warn('Failed to generate expected translation path:', error);
            return null;
        }
    }

    private fileExists(filePath: string): boolean {
        try {
            if (!fs.existsSync(filePath)) {
                return false;
            }
            
            const stats = fs.statSync(filePath);
            
            if (filePath.endsWith('/')) {
                return stats.isDirectory();
            }
            
            return stats.isFile();
        } catch (error) {
            console.warn(`Failed to check file existence for ${filePath}:`, error);
            return false;
        }
    }
}

export class LinkCodeActionProvider implements vscode.CodeActionProvider {
    private disposables: vscode.Disposable[] = [];
    private translationUtils = new TranslationUtils();

    constructor() {
        // Register the code action provider for markdown files
        this.disposables.push(
            vscode.languages.registerCodeActionsProvider('markdown', this, {
                providedCodeActionKinds: [vscode.CodeActionKind.QuickFix]
            })
        );
    }

    provideCodeActions(
        document: vscode.TextDocument,
        _range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext,
        _token: vscode.CancellationToken
    ): vscode.CodeAction[] {
        const linkDiagnostics = this.filterLinkDiagnostics(context.diagnostics);
        const codeActions: vscode.CodeAction[] = [];

        for (const diagnostic of linkDiagnostics) {
            const action = this.createFixLanguagePathAction(document, diagnostic);
            if (action) {
                codeActions.push(action);
            }
        }

        return codeActions;
    }

    private filterLinkDiagnostics(diagnostics: readonly vscode.Diagnostic[]): vscode.Diagnostic[] {
        return diagnostics.filter(
            d => d.source === CONSTANTS.DIAGNOSTIC_SOURCE && d.code === CONSTANTS.DIAGNOSTIC_CODE
        );
    }

    private createFixLanguagePathAction(
        document: vscode.TextDocument,
        diagnostic: vscode.Diagnostic
    ): vscode.CodeAction | undefined {
        try {
            const text = document.getText(diagnostic.range);
            const regex = new RegExp(CONSTANTS.LINK_REGEX.source);
            const match = text.match(regex);

            if (!match || match.length < 3) {
                return undefined;
            }

            const linkText = match[1];
            const linkPath = match[2];
            const currentLanguage = this.translationUtils.extractLanguageCode(document.uri.fsPath);

            if (currentLanguage === 'unknown') {
                return undefined;
            }

            const suggestedPath = `/${currentLanguage.toLowerCase()}/docs/${linkPath}`;
            const newLinkText = `[${linkText}](${suggestedPath})`;
            const title = MESSAGES.CODE_ACTION_TITLE(currentLanguage);

            const action = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
            action.edit = new vscode.WorkspaceEdit();
            action.edit.replace(document.uri, diagnostic.range, newLinkText);
            action.diagnostics = [diagnostic];
            action.isPreferred = true;

            return action;
        } catch (error) {
            console.warn('Failed to create fix language path action:', error);
            return undefined;
        }
    }

    dispose() {
        this.disposables.forEach(d => d.dispose());
    }
}