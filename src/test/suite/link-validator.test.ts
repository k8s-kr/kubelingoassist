import * as assert from 'assert';
import * as vscode from 'vscode';
import { LinkCodeActionProvider } from '../../validators/link';

suite('LinkValidator Tests', () => {
  test('should detect links without language code', () => {
    // This would require creating a mock document
    // For now, we'll test the regex pattern
    const linkPattern = /\[([^\]]*)\]\(\/docs\/([^)]*)\)/g;
    const testText = '[example](/docs/concepts/overview)';
    const matches = [...testText.matchAll(linkPattern)];

    assert.strictEqual(matches.length, 1);
    assert.strictEqual(matches[0][1], 'example');
    assert.strictEqual(matches[0][2], 'concepts/overview');
  });

  test('should not match links with language code', () => {
    const linkPattern = /\[([^\]]*)\]\(\/docs\/([^)]*)\)/g;
    const testText = '[example](/ko/docs/concepts/overview)';
    const matches = [...testText.matchAll(linkPattern)];

    assert.strictEqual(matches.length, 0);
  });

  test('should validate expected translation path generation', () => {
    // getExpectedTranslationPath 로직 테스트
    const currentPath = '/content/ko/docs/concepts/overview.md';
    const linkPath = 'concepts/cluster.md';
    const language = 'ko';

    // 기대되는 경로: /content/ko/docs/concepts/cluster.md
    const contentMatch = currentPath.match(/(.*\/content)\//);
    assert.strictEqual(contentMatch![1], '/content');

    const expectedPath = `/content/${language.toLowerCase()}/docs/${linkPath}`;
    assert.strictEqual(expectedPath, '/content/ko/docs/concepts/cluster.md');
  });

  test('should handle different link path formats', () => {
    const testCases = [
      { linkPath: 'concepts/overview', expected: 'concepts/overview.md' },
      { linkPath: 'concepts/overview.md', expected: 'concepts/overview.md' },
      { linkPath: 'concepts/', expected: 'concepts/' },
    ];

    testCases.forEach(({ linkPath, expected }) => {
      let processedPath = linkPath;
      if (!processedPath.endsWith('.md') && !processedPath.endsWith('/')) {
        processedPath += '.md';
      }
      assert.strictEqual(processedPath, expected);
    });
  });

  test('should distinguish between file and folder links', () => {
    const testCases = [
      { linkPath: 'concepts/overview', isFolder: false, resourceType: '파일' },
      { linkPath: 'concepts/overview.md', isFolder: false, resourceType: '파일' },
      { linkPath: 'concepts/', isFolder: true, resourceType: '폴더' },
      { linkPath: 'tasks/install/', isFolder: true, resourceType: '폴더' },
    ];

    testCases.forEach(({ linkPath, isFolder, resourceType }) => {
      const actualIsFolder = linkPath.endsWith('/');
      const actualResourceType = actualIsFolder ? '폴더' : '파일';

      assert.strictEqual(actualIsFolder, isFolder);
      assert.strictEqual(actualResourceType, resourceType);
    });
  });

  test('should generate correct translation paths for files and folders', () => {
    const language = 'ko';
    const contentRoot = '/content';

    const testCases = [
      {
        linkPath: 'concepts/cluster.md',
        expected: '/content/ko/docs/concepts/cluster.md',
        type: 'file',
      },
      {
        linkPath: 'concepts/',
        expected: '/content/ko/docs/concepts/',
        type: 'folder',
      },
      {
        linkPath: 'tasks/install',
        expected: '/content/ko/docs/tasks/install.md',
        type: 'file with auto .md',
      },
    ];

    testCases.forEach(({ linkPath, expected, type }) => {
      let expectedPath = `${contentRoot}/${language.toLowerCase()}/docs/${linkPath}`;

      // 폴더가 아니고 .md가 없으면 .md 추가
      if (!linkPath.endsWith('/') && !expectedPath.endsWith('.md')) {
        expectedPath += '.md';
      }

      assert.strictEqual(expectedPath, expected, `Failed for ${type}: ${linkPath}`);
    });
  });
});

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
});
