import * as assert from 'assert';
import * as vscode from 'vscode';
import { LinkCodeActionProvider } from '../../validators/link';

// Type definition for accessing private methods in tests
type CodeActionProviderPrivate = {
    filterLinkDiagnostics: (diagnostics: readonly vscode.Diagnostic[]) => vscode.Diagnostic[];
    createFixLanguagePathAction: (doc: vscode.TextDocument, diag: vscode.Diagnostic) => vscode.CodeAction | undefined;
};

suite('LinkCodeActionProvider Unit Tests', () => {
    let codeActionProvider: LinkCodeActionProvider;

    setup(() => {
        codeActionProvider = new LinkCodeActionProvider();
    });

    teardown(() => {
        codeActionProvider.dispose();
    });

    // Helper to access private methods for testing
    function getPrivate(): CodeActionProviderPrivate {
        return codeActionProvider as unknown as CodeActionProviderPrivate;
    }

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
            )
        ];

        // Set proper source and code for first diagnostic
        mockDiagnostics[0].source = 'KubeLingoAssist';
        mockDiagnostics[0].code = 'missing-language-path';

        // Second diagnostic has different source
        mockDiagnostics[1].source = 'TypeScript';
        mockDiagnostics[1].code = 'error';

        const filtered = getPrivate().filterLinkDiagnostics(mockDiagnostics);

        assert.strictEqual(filtered.length, 1);
        assert.strictEqual(filtered[0].source, 'KubeLingoAssist');
        assert.strictEqual(filtered[0].code, 'missing-language-path');
    });

    test('should create code action for valid link diagnostic', () => {
        const mockDocument = {
            getText: (_range: vscode.Range) => '[test link](/docs/concepts/overview)',
            uri: vscode.Uri.file('/content/ko/docs/test.md')
        } as vscode.TextDocument;

        const mockDiagnostic = new vscode.Diagnostic(
            new vscode.Range(0, 0, 0, 35),
            'Missing language path',
            vscode.DiagnosticSeverity.Warning
        );
        mockDiagnostic.source = 'KubeLingoAssist';
        mockDiagnostic.code = 'missing-language-path';

        const action = getPrivate().createFixLanguagePathAction(mockDocument, mockDiagnostic);

        assert.notStrictEqual(action, undefined);
        assert.ok(action!.title.includes('ko'));
        assert.strictEqual(action!.kind, vscode.CodeActionKind.QuickFix);
        assert.strictEqual(action!.isPreferred, true);
        assert.strictEqual(action!.diagnostics?.length, 1);
        assert.ok(action!.edit);
    });

    test('should return undefined for invalid diagnostic text', () => {
        const mockDocument = {
            getText: (_range: vscode.Range) => 'invalid text without link pattern',
            uri: vscode.Uri.file('/content/ko/docs/test.md')
        } as vscode.TextDocument;

        const mockDiagnostic = new vscode.Diagnostic(
            new vscode.Range(0, 0, 0, 10),
            'Invalid diagnostic',
            vscode.DiagnosticSeverity.Warning
        );

        const action = getPrivate().createFixLanguagePathAction(mockDocument, mockDiagnostic);

        assert.strictEqual(action, undefined);
    });

    test('should provide code actions for context with link diagnostics', () => {
        const mockDocument = {
            getText: (_range: vscode.Range) => '[test](/docs/overview)',
            uri: vscode.Uri.file('/content/ko/docs/test.md')
        } as vscode.TextDocument;

        const mockDiagnostic = new vscode.Diagnostic(
            new vscode.Range(0, 0, 0, 20),
            'Missing language path',
            vscode.DiagnosticSeverity.Warning
        );
        mockDiagnostic.source = 'KubeLingoAssist';
        mockDiagnostic.code = 'missing-language-path';

        const mockContext = {
            diagnostics: [mockDiagnostic],
            triggerKind: 1,
            only: undefined
        } as vscode.CodeActionContext;

        const mockCancellationToken: vscode.CancellationToken = {
            isCancellationRequested: false,
            onCancellationRequested: () => ({ dispose: () => {} })
        };

        const actions = codeActionProvider.provideCodeActions(
            mockDocument,
            new vscode.Range(0, 0, 0, 20),
            mockContext,
            mockCancellationToken
        );

        assert.strictEqual(actions.length, 1);
        assert.strictEqual(actions[0].kind, vscode.CodeActionKind.QuickFix);
    });

    test('should handle code action provider errors gracefully', () => {
        // Mock document that throws error on getText - intentionally partial for error testing
        const mockDocument = {
            getText: (): string => {
                throw new Error('Mock error in getText');
            },
            uri: vscode.Uri.file('/content/ko/docs/error.md')
        } as unknown as vscode.TextDocument;

        const mockDiagnostic = new vscode.Diagnostic(
            new vscode.Range(0, 0, 0, 10),
            'Test diagnostic',
            vscode.DiagnosticSeverity.Warning
        );
        mockDiagnostic.source = 'KubeLingoAssist';
        mockDiagnostic.code = 'missing-language-path';

        const action = getPrivate().createFixLanguagePathAction(mockDocument, mockDiagnostic);
        assert.strictEqual(action, undefined, 'Should return undefined when error occurs');
    });
});