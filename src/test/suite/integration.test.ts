import * as assert from 'assert';
import * as vscode from 'vscode';
import { LinkValidator, LinkCodeActionProvider } from '../../validators/link';

suite('Integration Tests', () => {
    let linkValidator: LinkValidator;
    let codeActionProvider: LinkCodeActionProvider;

    setup(() => {
        linkValidator = new LinkValidator();
        codeActionProvider = new LinkCodeActionProvider();
    });

    teardown(() => {
        linkValidator.dispose();
        codeActionProvider.dispose();
    });

    test('should work end-to-end: validation to code action', () => {
        const mockText = `# Integration Test
This is a [test link](/docs/concepts/overview) that needs fixing.
This [already fixed link](/ko/docs/concepts/overview) should be ignored.`;

        const mockDocument = {
            getText: () => mockText,
            positionAt: (offset: number) => new vscode.Position(Math.floor(offset / 50), offset % 50),
            uri: vscode.Uri.file('/content/ko/docs/integration-test.md')
        } as vscode.TextDocument;

        // Mock fileExists to return true for testing
        const originalFileExists = (linkValidator as any).fileExists;
        (linkValidator as any).fileExists = (path: string) => path.includes('ko/docs/concepts/overview.md');

        // Step 1: Validate and get diagnostics
        const diagnosticCount = linkValidator.validateLinks(mockDocument);
        assert.strictEqual(diagnosticCount, 1, 'Should find one diagnostic');

        const diagnostics = linkValidator.getDiagnostics().get(mockDocument.uri) || [];
        assert.strictEqual(diagnostics.length, 1, 'Should have one diagnostic in collection');

        // Step 2: Create code action from diagnostic
        const diagnostic = diagnostics[0];
        const mockContext = {
            diagnostics: [diagnostic],
            triggerKind: 1,
            only: undefined
        } as vscode.CodeActionContext;

        const actions = codeActionProvider.provideCodeActions(
            mockDocument,
            diagnostic.range,
            mockContext,
            { isCancellationRequested: false, onCancellationRequested: () => ({ dispose: () => {} }) } as any
        );

        assert.strictEqual(actions.length, 1, 'Should provide one code action');

        const action = actions[0];
        assert.ok(action.edit, 'Code action should have edit');
        assert.ok(action.edit.has(mockDocument.uri), 'Edit should target correct document');

        // Restore original method
        (linkValidator as any).fileExists = originalFileExists;
    });

    test('should handle multiple documents simultaneously', () => {
        const documents = [
            {
                getText: () => '[link1](/docs/concepts/overview1)',
                positionAt: (offset: number) => new vscode.Position(0, offset),
                uri: vscode.Uri.file('/content/ko/docs/doc1.md')
            },
            {
                getText: () => '[link2](/docs/concepts/overview2)',
                positionAt: (offset: number) => new vscode.Position(0, offset),
                uri: vscode.Uri.file('/content/ja/docs/doc2.md')
            },
            {
                getText: () => '[link3](/docs/concepts/overview3)',
                positionAt: (offset: number) => new vscode.Position(0, offset),
                uri: vscode.Uri.file('/content/zh-cn/docs/doc3.md')
            }
        ] as vscode.TextDocument[];

        // Mock file existence for all documents
        const originalFileExists = (linkValidator as any).fileExists;
        (linkValidator as any).fileExists = () => true;

        // Validate all documents
        const diagnosticCounts = documents.map(doc => linkValidator.validateLinks(doc));

        // Verify all validations completed
        diagnosticCounts.forEach((count, index) => {
            assert.strictEqual(count, 1, `Document ${index + 1} should have 1 diagnostic`);
        });

        // Verify diagnostics are stored separately
        documents.forEach((doc, index) => {
            const diagnostics = linkValidator.getDiagnostics().get(doc.uri);
            assert.ok(diagnostics, `Document ${index + 1} should have diagnostics`);
            assert.strictEqual(diagnostics!.length, 1, `Document ${index + 1} should have 1 diagnostic`);
        });

        // Restore original method
        (linkValidator as any).fileExists = originalFileExists;
    });

    test('should integrate with VS Code diagnostic collection', () => {
        const mockText = '[test link](/docs/concepts/overview)';
        const mockDocument = {
            getText: () => mockText,
            positionAt: (offset: number) => new vscode.Position(0, offset),
            uri: vscode.Uri.file('/content/ko/docs/test.md')
        } as vscode.TextDocument;

        // Mock file existence
        const originalFileExists = (linkValidator as any).fileExists;
        (linkValidator as any).fileExists = () => true;

        // Validate document
        const diagnosticCount = linkValidator.validateLinks(mockDocument);
        assert.strictEqual(diagnosticCount, 1, 'Should generate diagnostic');

        // Verify diagnostic collection has the diagnostic
        const diagnostics = linkValidator.getDiagnostics().get(mockDocument.uri);
        assert.ok(diagnostics, 'Should have diagnostics in collection');
        assert.strictEqual(diagnostics!.length, 1, 'Should have one diagnostic');

        const diagnostic = diagnostics![0];
        assert.strictEqual(diagnostic.source, 'KubeLingoAssist', 'Diagnostic should have correct source');
        assert.strictEqual(diagnostic.code, 'missing-language-path', 'Diagnostic should have correct code');

        // Restore original method
        (linkValidator as any).fileExists = originalFileExists;
    });
});