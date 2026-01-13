import * as vscode from 'vscode';
import * as path from 'path';
import { TranslationUtils } from '../features/translation/TranslationUtils';
import {
    isTranslationFile,
    fileExistsSync,
    getExpectedTranslationPath
} from '../utils';

const CONSTANTS = {
    DIAGNOSTICS_COLLECTION_NAME: 'kubelingoassist-links',
    DIAGNOSTIC_SOURCE: 'KubeLingoAssist',
    DIAGNOSTIC_CODE: 'missing-language-path',
    LINK_REGEX_SOURCE: /\[([^\]]*)\]\(\/docs\/([^)]*)\)/,
    LANGUAGE_CODE_REGEX: /^[a-z]{2}\/|^en\//,
    TRANSLATION_FILE_PATTERN: /\/content\/([^\/]+)\/docs\//,
    EXCLUDED_LANGUAGE: 'en'
} as const;

function createLinkRegex(): RegExp {
    return new RegExp(CONSTANTS.LINK_REGEX_SOURCE.source, 'g');
}

const MESSAGES = {
    WARNING_TEMPLATE: (resourceType: string, linkText: string, currentPath: string, suggestedPath: string) =>
        `⚠️ Translation ${resourceType} exists but language path is missing.\n` +
        `Current: [${linkText}](/docs/${currentPath})\n` +
        `Suggested: [${linkText}](${suggestedPath})`,
    CODE_ACTION_TITLE: (language: string) => `Add language path: /${language}/docs/...`
} as const;

export type FileExistsChecker = (filePath: string) => boolean;

export interface LinkValidatorOptions {
    fileExistsChecker?: FileExistsChecker;
}

export class LinkValidator {
    private diagnostics: vscode.DiagnosticCollection;
    private codeActionProvider: LinkCodeActionProvider;
    private translationUtils = new TranslationUtils();
    private fileExists: FileExistsChecker;

    constructor(options: LinkValidatorOptions = {}) {
        this.diagnostics = vscode.languages.createDiagnosticCollection('kubelingoassist-links');
        this.codeActionProvider = new LinkCodeActionProvider();
        this.fileExists = options.fileExistsChecker ?? fileExistsSync;
    }

    public validateLinks(document: vscode.TextDocument): number {
        if (!isTranslationFile(document.uri.fsPath)) {
            this.diagnostics.delete(document.uri);
            return 0;
        }

        const currentLanguage = this.translationUtils.extractLanguageCode(document.uri.fsPath);
        const diagnostics: vscode.Diagnostic[] = [];
        const text = document.getText();

        const linkRegex = createLinkRegex();
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

            const baseLinkPath = linkPath.split('#')[0];
            const expectedTranslationPath = getExpectedTranslationPath(document.uri.fsPath, baseLinkPath, currentLanguage);
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

            if (translationExists) {
                const isFolder = baseLinkPath.endsWith('/');
                const resourceType = isFolder ? 'folder' : 'file';
                const suggestedPath = `/${currentLanguage.toLowerCase()}/docs/${linkPath}`;
                const message = `⚠️ Translation ${resourceType} exists but language path is missing.\n` +
                              `Current: [${linkText}](/docs/${linkPath})\n` +
                              `Suggested: [${linkText}](${suggestedPath})`;
                const diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Warning);
                diagnostic.source = 'KubeLingoAssist';
                diagnostic.code = 'missing-language-path';
                diagnostics.push(diagnostic);
            }
        }

        this.diagnostics.set(document.uri, diagnostics);
        return diagnostics.length;
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
}

export class LinkCodeActionProvider implements vscode.CodeActionProvider {
    private disposables: vscode.Disposable[] = [];
    private translationUtils = new TranslationUtils();

    constructor() {
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
            const regex = CONSTANTS.LINK_REGEX_SOURCE;
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