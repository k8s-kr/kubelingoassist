import * as assert from 'assert';
import * as vscode from 'vscode';
import { LinkCodeActionProvider } from '../../validators/link';

suite('LinkCodeActionProvider Unit Tests', () => {
  let codeActionProvider: LinkCodeActionProvider;

  setup(() => {
    codeActionProvider = new LinkCodeActionProvider();
  });

  teardown(() => {
    codeActionProvider.dispose();
  });

  test('should filter link diagnostics correctly', () => {
    const mockDiagnostics = [
      new vscode.Diagnostic(
        new vscode.Range(0, 0, 0, 10),
        'Link validation warning',
        vscode.DiagnosticSeverity.Warning
      ),
      new vscode.Diagnostic(
        new vscode.Range(1, 0, 1, 10),
        'Other diagnostic',
        vscode.DiagnosticSeverity.Error
      ),
    ];

    // Set proper source and code for first diagnostic
    mockDiagnostics[0].source = 'KubeLingoAssist';
    mockDiagnostics[0].code = 'missing-language-path';

    // Second diagnostic has different source
    mockDiagnostics[1].source = 'TypeScript';
    mockDiagnostics[1].code = 'error';

    const filtered = (codeActionProvider as any).filterLinkDiagnostics(mockDiagnostics);

    assert.strictEqual(filtered.length, 1);
    assert.strictEqual(filtered[0].source, 'KubeLingoAssist');
    assert.strictEqual(filtered[0].code, 'missing-language-path');
  });

  test('should create code action for valid link diagnostic', () => {
    const mockDocument = {
      getText: (_range: vscode.Range) => '[test link](/docs/concepts/overview)',
      uri: vscode.Uri.file('/content/ko/docs/test.md'),
    } as vscode.TextDocument;

    const translationUri = vscode.Uri.file('/content/ko/docs/concepts/overview.md');
    const mockDiagnostic = new vscode.Diagnostic(
      new vscode.Range(0, 0, 0, 35),
      '번역 파일이 존재합니다: 개요',
      vscode.DiagnosticSeverity.Warning
    );
    mockDiagnostic.source = 'KubeLingoAssist';
    mockDiagnostic.code = 'missing-language-path';
    mockDiagnostic.relatedInformation = [
      new vscode.DiagnosticRelatedInformation(
        new vscode.Location(translationUri, new vscode.Position(0, 0)),
        '/ko/docs/concepts/overview'
      ),
    ];

    const action = (codeActionProvider as any).createOpenTranslationFileAction(
      mockDocument,
      mockDiagnostic
    );

    assert.notStrictEqual(action, undefined);
    assert.ok(action.title.includes('개요'));
    assert.strictEqual(action.kind, vscode.CodeActionKind.QuickFix);
    assert.strictEqual(action.isPreferred, true);
    assert.strictEqual(action.diagnostics?.length, 1);
    assert.ok(action.command);
    assert.strictEqual(action.command.command, 'vscode.open');
  });

  test('should return undefined for diagnostic without relatedInformation', () => {
    const mockDocument = {
      getText: (_range: vscode.Range) => 'invalid text without link pattern',
      uri: vscode.Uri.file('/content/ko/docs/test.md'),
    } as vscode.TextDocument;

    const mockDiagnostic = new vscode.Diagnostic(
      new vscode.Range(0, 0, 0, 10),
      'Invalid diagnostic',
      vscode.DiagnosticSeverity.Warning
    );

    const action = (codeActionProvider as any).createOpenTranslationFileAction(
      mockDocument,
      mockDiagnostic
    );

    assert.strictEqual(action, undefined);
  });

  test('should provide code actions for context with link diagnostics', () => {
    const mockDocument = {
      getText: (_range: vscode.Range) => '[test](/docs/overview)',
      uri: vscode.Uri.file('/content/ko/docs/test.md'),
    } as vscode.TextDocument;

    const translationUri = vscode.Uri.file('/content/ko/docs/overview.md');
    const mockDiagnostic = new vscode.Diagnostic(
      new vscode.Range(0, 0, 0, 20),
      '번역 파일이 존재합니다: overview',
      vscode.DiagnosticSeverity.Warning
    );
    mockDiagnostic.source = 'KubeLingoAssist';
    mockDiagnostic.code = 'missing-language-path';
    mockDiagnostic.relatedInformation = [
      new vscode.DiagnosticRelatedInformation(
        new vscode.Location(translationUri, new vscode.Position(0, 0)),
        '/ko/docs/overview'
      ),
    ];

    const mockContext = {
      diagnostics: [mockDiagnostic],
      triggerKind: 1,
      only: undefined,
    } as vscode.CodeActionContext;

    const actions = codeActionProvider.provideCodeActions(
      mockDocument,
      new vscode.Range(0, 0, 0, 20),
      mockContext,
      {
        isCancellationRequested: false,
        onCancellationRequested: () => ({ dispose: () => {} }),
      } as any
    );

    assert.strictEqual(actions.length, 1);
    assert.strictEqual(actions[0].kind, vscode.CodeActionKind.QuickFix);
  });

  test('should handle code action provider errors gracefully', () => {
    const mockDocument = {
      getText: (_range: vscode.Range) => {
        throw new Error('Mock error in getText');
      },
      uri: vscode.Uri.file('/content/ko/docs/error.md'),
    } as any;

    const mockDiagnostic = new vscode.Diagnostic(
      new vscode.Range(0, 0, 0, 10),
      'Test diagnostic',
      vscode.DiagnosticSeverity.Warning
    );
    mockDiagnostic.source = 'KubeLingoAssist';
    mockDiagnostic.code = 'missing-language-path';
    // No relatedInformation → should return undefined

    const action = (codeActionProvider as any).createOpenTranslationFileAction(
      mockDocument,
      mockDiagnostic
    );
    assert.strictEqual(action, undefined, 'Should return undefined when no relatedInformation');
  });
});
