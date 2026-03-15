import * as vscode from 'vscode';
import * as path from 'path';
import {
  isTranslationFile,
  extractLanguageCode,
  getContentRoot,
  fileExistsSync,
} from '../core/path-utils';

const CONSTANTS = {
  DIAGNOSTIC_SOURCE: 'KubeLingoAssist',
  DIAGNOSTIC_CODE: 'missing-language-path',
  LINK_REGEX: /\[([^\]]*)\]\(\/docs\/([^)]*)\)/g,
} as const;

const MESSAGES = {
  CODE_ACTION_TITLE: (language: string) => `언어 경로 추가: /${language}/docs/...`,
} as const;

export class LinkValidator {
  private diagnostics: vscode.DiagnosticCollection;
  private codeActionProvider: LinkCodeActionProvider;
  private fileExists: (filePath: string) => boolean = fileExistsSync;

  constructor() {
    this.diagnostics = vscode.languages.createDiagnosticCollection('kubelingoassist-links');
    this.codeActionProvider = new LinkCodeActionProvider();
  }

  public validateLinks(document: vscode.TextDocument): number {
    if (!isTranslationFile(document.uri.fsPath)) {
      this.diagnostics.delete(document.uri);
      return 0;
    }

    const currentLanguage = extractLanguageCode(document.uri.fsPath);
    const diagnostics: vscode.Diagnostic[] = [];
    const text = document.getText();

    const linkRegex = /\[([^\]]*)\]\(\/docs\/([^)]*)\)/g;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
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
      const expectedTranslationPath = this.getExpectedTranslationPath(
        document.uri.fsPath,
        baseLinkPath,
        currentLanguage
      );
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
        const translationFilePath = this.resolveTranslationFilePath(
          expectedTranslationPath,
          isFolder
        );
        const translationUri = vscode.Uri.file(translationFilePath);
        diagnostic.relatedInformation = [
          new vscode.DiagnosticRelatedInformation(
            new vscode.Location(translationUri, new vscode.Position(0, 0)),
            `/${currentLanguage.toLowerCase()}/docs/${linkPath}`
          ),
        ];
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

  private getExpectedTranslationPath(
    currentFilePath: string,
    linkPath: string,
    language: string
  ): string | null {
    try {
      const contentRoot = getContentRoot(currentFilePath);
      if (!contentRoot) {
        return null;
      }
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
}

export class LinkCodeActionProvider implements vscode.CodeActionProvider {
  private disposables: vscode.Disposable[] = [];

  constructor() {
    // Register the code action provider for markdown files
    this.disposables.push(
      vscode.languages.registerCodeActionsProvider('markdown', this, {
        providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
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
      (d) => d.source === CONSTANTS.DIAGNOSTIC_SOURCE && d.code === CONSTANTS.DIAGNOSTIC_CODE
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
      const currentLanguage = extractLanguageCode(document.uri.fsPath);

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
    this.disposables.forEach((d) => d.dispose());
  }
}
