import * as vscode from 'vscode';
import { findTerminologyMatches, TerminologyMatch } from '../core/terminology-matcher';
import { extractLanguageCode } from '../core/path-utils';
import { CorpusIndexer } from '../features/terminology/CorpusIndexer';

// Terminology data (synonyms.json equivalent) is Korean-only, so this validator only
// runs for the ko translation of kubernetes/website. isTranslationFile() from
// path-utils is intentionally not reused here since it accepts every non-en language.
const TARGET_LANGUAGE = 'ko';

const CONSTANTS = {
  DIAGNOSTIC_SOURCE: 'KubeLingoAssist',
  DIAGNOSTIC_CODE: 'terminology-suggestion',
} as const;

interface TerminologyDiagnosticCode {
  codeName: typeof CONSTANTS.DIAGNOSTIC_CODE;
  canonical: string;
  original: string;
}

function isTerminologyDiagnosticCode(code: unknown): code is TerminologyDiagnosticCode {
  if (typeof code !== 'string') {
    return false;
  }
  try {
    const parsed = JSON.parse(code);
    return parsed && parsed.codeName === CONSTANTS.DIAGNOSTIC_CODE;
  } catch {
    return false;
  }
}

export class TerminologyValidator {
  private diagnostics: vscode.DiagnosticCollection;
  private codeActionProvider: TerminologyCodeActionProvider;

  constructor(private indexer?: CorpusIndexer) {
    this.diagnostics = vscode.languages.createDiagnosticCollection('kubelingoassist-terminology');
    this.codeActionProvider = new TerminologyCodeActionProvider();
  }

  public validateTerminology(document: vscode.TextDocument): number {
    // uri.path (not fsPath) is used here: it is always POSIX-style, so the
    // content/{lang}/ regex in path-utils.ts matches correctly on Windows too.
    if (extractLanguageCode(document.uri.path) !== TARGET_LANGUAGE) {
      this.diagnostics.delete(document.uri);
      return 0;
    }

    const text = document.getText();
    // Only non-canonical (variant) matches are worth flagging
    const matches = findTerminologyMatches(text).filter((match) => !match.isCanonical);

    const diagnostics = matches.map((match) => this.createDiagnostic(document, match));

    this.diagnostics.set(document.uri, diagnostics);
    return diagnostics.length;
  }

  private createDiagnostic(
    document: vscode.TextDocument,
    match: TerminologyMatch
  ): vscode.Diagnostic {
    const startPos = document.positionAt(match.index);
    const endPos = document.positionAt(match.index + match.length);
    const range = new vscode.Range(startPos, endPos);

    // Glossary-backed suggestions are a stronger signal than corpus-only majority usage
    const severity =
      match.group.source === 'glossary'
        ? vscode.DiagnosticSeverity.Warning
        : vscode.DiagnosticSeverity.Hint;

    const diagnostic = new vscode.Diagnostic(range, this.buildMessage(match), severity);
    diagnostic.source = CONSTANTS.DIAGNOSTIC_SOURCE;

    const code: TerminologyDiagnosticCode = {
      codeName: CONSTANTS.DIAGNOSTIC_CODE,
      canonical: match.group.canonical,
      original: match.term,
    };
    diagnostic.code = JSON.stringify(code);

    return diagnostic;
  }

  private buildMessage(match: TerminologyMatch): string {
    const { group } = match;

    if (group.source === 'glossary') {
      return `공식 용어집 권장 표현: "${group.canonical}" (현재: "${match.term}")`;
    }

    if (this.indexer && this.indexer.isIndexed()) {
      const counts = this.indexer.getGroupCounts(group);
      const canonicalCount = counts[group.canonical] ?? 0;
      const variantCount = counts[match.term] ?? 0;
      return `이 저장소 번역 문서에서 "${group.canonical}"(${canonicalCount}회)가 "${match.term}"(${variantCount}회)보다 많이 쓰입니다`;
    }

    return `"${group.canonical}"가 더 널리 쓰이는 표현입니다 (현재: "${match.term}")`;
  }

  public dispose(): void {
    this.diagnostics.dispose();
    this.codeActionProvider.dispose();
  }

  public getDiagnostics(): vscode.DiagnosticCollection {
    return this.diagnostics;
  }

  public getCodeActionProvider(): TerminologyCodeActionProvider {
    return this.codeActionProvider;
  }
}

export class TerminologyCodeActionProvider implements vscode.CodeActionProvider {
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
    context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    const termDiagnostics = context.diagnostics.filter(
      (d) => d.source === CONSTANTS.DIAGNOSTIC_SOURCE && isTerminologyDiagnosticCode(d.code)
    );

    const actions: vscode.CodeAction[] = [];
    for (const diagnostic of termDiagnostics) {
      const action = this.createReplaceAction(document, diagnostic);
      if (action) {
        actions.push(action);
      }
    }
    return actions;
  }

  private createReplaceAction(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction | undefined {
    if (!isTerminologyDiagnosticCode(diagnostic.code)) {
      return undefined;
    }
    const code: TerminologyDiagnosticCode = JSON.parse(diagnostic.code as string);

    const action = new vscode.CodeAction(
      `"${code.original}" → "${code.canonical}"로 바꾸기`,
      vscode.CodeActionKind.QuickFix
    );
    action.diagnostics = [diagnostic];
    action.isPreferred = true;
    action.edit = new vscode.WorkspaceEdit();
    action.edit.replace(document.uri, diagnostic.range, code.canonical);

    return action;
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
  }
}
