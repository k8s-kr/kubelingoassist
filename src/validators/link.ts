import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import {
  isTranslationFile,
  extractLanguageCode,
  getContentRoot,
  fileExistsSync,
} from '../core/path-utils';

const CONSTANTS = {
  DIAGNOSTIC_SOURCE: 'KubeLingoAssist',
  DIAGNOSTIC_CODE: 'missing-language-path',
  LINK_REGEX: /\[([^\]]*)\]\(\/(?:([a-z]{2}(?:-[a-z]{2})?)\/)?docs\/([^)]*)\)/g,
} as const;

const MESSAGES = {
  CODE_ACTION_TITLE: (title: string) => `번역 파일 열기: ${title}`,
} as const;

function readFrontmatterTitle(filePath: string): string | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      return null;
    }
    const titleMatch = frontmatterMatch[1].match(/^title:\s*(.+)$/m);
    if (!titleMatch) {
      return null;
    }
    return titleMatch[1].replace(/^["']|["']$/g, '').trim();
  } catch {
    return null;
  }
}

export class LinkValidator {
  private diagnostics: vscode.DiagnosticCollection;
  private codeActionProvider: LinkCodeActionProvider;
  private fileExists: (filePath: string) => boolean = fileExistsSync;
  private readTitle: (filePath: string) => string | null = readFrontmatterTitle;

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

    const linkRegex = /\[([^\]]*)\]\(\/(?:([a-z]{2}(?:-[a-z]{2})?)\/)?docs\/([^)]*)\)/g;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      const linkLang = match[2]; // optional language prefix (e.g. 'ko', 'en', 'zh-cn')
      const linkPath = match[3];
      const fullMatch = match[0];

      // Skip if the link already points to the current language
      if (linkLang && linkLang.toLowerCase() === currentLanguage.toLowerCase()) {
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
        const translationFilePath = this.resolveTranslationFilePath(
          expectedTranslationPath,
          isFolder
        );
        const title = this.readTitle(translationFilePath);
        const displayTitle = title ?? linkPath;
        const message = `번역 파일이 존재합니다: ${displayTitle}`;
        const diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Warning);
        diagnostic.source = 'KubeLingoAssist';
        diagnostic.code = 'missing-language-path';
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
      const action = this.createOpenTranslationFileAction(document, diagnostic);
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

  private createOpenTranslationFileAction(
    _document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction | undefined {
    try {
      const relatedInfo = diagnostic.relatedInformation;
      if (!relatedInfo || relatedInfo.length === 0) {
        return undefined;
      }

      const translationUri = relatedInfo[0].location.uri;
      const displayTitle = diagnostic.message.replace('번역 파일이 존재합니다: ', '');
      const title = MESSAGES.CODE_ACTION_TITLE(displayTitle);

      const action = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
      action.command = {
        command: 'vscode.open',
        title,
        arguments: [translationUri],
      };
      action.diagnostics = [diagnostic];
      action.isPreferred = true;

      return action;
    } catch (error) {
      console.warn('Failed to create open translation file action:', error);
      return undefined;
    }
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
  }
}
