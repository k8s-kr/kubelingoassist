import * as assert from 'assert';
import * as vscode from 'vscode';
import { LinkValidator, LinkCodeActionProvider } from '../../validators/link';

suite('Integration Tests', () => {
    let codeActionProvider: LinkCodeActionProvider;

    setup(() => {
        codeActionProvider = new LinkCodeActionProvider();
    });

    teardown(() => {
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

        // Use constructor injection for file existence mock
        const linkValidator = new LinkValidator({
            fileExistsChecker: (path: string) => path.includes('ko/docs/concepts/overview.md')
        });

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

        const mockCancellationToken: vscode.CancellationToken = {
            isCancellationRequested: false,
            onCancellationRequested: () => ({ dispose: () => {} })
        };

        const actions = codeActionProvider.provideCodeActions(
            mockDocument,
            diagnostic.range,
            mockContext,
            mockCancellationToken
        );

        assert.strictEqual(actions.length, 1, 'Should provide one code action');

        const action = actions[0];
        assert.ok(action.edit, 'Code action should have edit');
        assert.ok(action.edit.has(mockDocument.uri), 'Edit should target correct document');

        linkValidator.dispose();
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

        // Use constructor injection for file existence mock
        const linkValidator = new LinkValidator({
            fileExistsChecker: () => true
        });

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

        linkValidator.dispose();
    });

    test('should integrate with VS Code diagnostic collection', () => {
        const mockText = '[test link](/docs/concepts/overview)';
        const mockDocument = {
            getText: () => mockText,
            positionAt: (offset: number) => new vscode.Position(0, offset),
            uri: vscode.Uri.file('/content/ko/docs/test.md')
        } as vscode.TextDocument;

        // Use constructor injection for file existence mock
        const linkValidator = new LinkValidator({
            fileExistsChecker: () => true
        });

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

        linkValidator.dispose();
    });
});

suite('Edge Cases and Error Handling', () => {
    let codeActionProvider: LinkCodeActionProvider;

    setup(() => {
        codeActionProvider = new LinkCodeActionProvider();
    });

    teardown(() => {
        codeActionProvider.dispose();
    });

    test('should handle empty document gracefully', () => {
        const mockDocument = {
            getText: () => '',
            positionAt: (_offset: number) => new vscode.Position(0, 0),
            uri: vscode.Uri.file('/content/ko/docs/empty.md')
        } as vscode.TextDocument;

        const linkValidator = new LinkValidator();
        const diagnosticCount = linkValidator.validateLinks(mockDocument);
        assert.strictEqual(diagnosticCount, 0, 'Empty document should have no diagnostics');
        linkValidator.dispose();
    });

    test('should handle document with malformed links', () => {
        const mockText = `# Malformed Links Test
This is a [broken link(/docs/concepts/overview) - missing closing bracket
This is another [broken](/docs/concepts incomplete - missing closing paren
This is a ]wrong bracket[(/docs/concepts/overview) - wrong bracket order
This is a [valid link](/docs/concepts/overview) - should work
Another [valid link too](/docs/reference/guide) - should also work`;

        const mockDocument = {
            getText: () => mockText,
            positionAt: (offset: number) => new vscode.Position(0, offset),
            uri: vscode.Uri.file('/content/ko/docs/malformed.md')
        } as vscode.TextDocument;

        // Use constructor injection for file existence mock
        const linkValidator = new LinkValidator({
            fileExistsChecker: () => true
        });

        const diagnosticCount = linkValidator.validateLinks(mockDocument);
        assert.strictEqual(diagnosticCount, 3, 'Should find three valid links (including the malformed one that was partially matched)');

        linkValidator.dispose();
    });

    test('should handle very long file paths', () => {
        const longPath = '/content/ko/docs/' + 'very-long-path-segment/'.repeat(20) + 'final-file.md';
        const mockDocument = {
            getText: () => '[long path link](/docs/very-long/path)',
            positionAt: (offset: number) => new vscode.Position(0, offset),
            uri: vscode.Uri.file(longPath)
        } as vscode.TextDocument;

        const linkValidator = new LinkValidator();
        const diagnosticCount = linkValidator.validateLinks(mockDocument);
        // Should not crash, result depends on fileExists mock
        assert.ok(diagnosticCount >= 0, 'Should handle long paths without crashing');
        linkValidator.dispose();
    });

    test('should handle concurrent validation calls', () => {
        const mockDocument1 = {
            getText: () => '[link1](/docs/concepts/overview1)',
            positionAt: (offset: number) => new vscode.Position(0, offset),
            uri: vscode.Uri.file('/content/ko/docs/doc1.md')
        } as vscode.TextDocument;

        const mockDocument2 = {
            getText: () => '[link2](/docs/concepts/overview2)',
            positionAt: (offset: number) => new vscode.Position(0, offset),
            uri: vscode.Uri.file('/content/ja/docs/doc2.md')
        } as vscode.TextDocument;

        const linkValidator = new LinkValidator();

        // Simulate concurrent calls
        const count1 = linkValidator.validateLinks(mockDocument1);
        const count2 = linkValidator.validateLinks(mockDocument2);

        assert.ok(count1 >= 0, 'First validation should complete successfully');
        assert.ok(count2 >= 0, 'Second validation should complete successfully');

        // Verify diagnostics are stored separately
        const diag1 = linkValidator.getDiagnostics().get(mockDocument1.uri);
        const diag2 = linkValidator.getDiagnostics().get(mockDocument2.uri);

        assert.ok(diag1 !== diag2, 'Diagnostics should be stored separately per document');

        linkValidator.dispose();
    });

    test('should handle non-translation files correctly', () => {
        const testCases = [
            '/content/en/docs/concepts/overview.md',  // English file
            '/other/path/file.md',                    // Non-content path
            '/content/invalid.md',                    // Invalid content structure
            '/README.md'                              // Root file
        ];

        const linkValidator = new LinkValidator();

        testCases.forEach(filePath => {
            const mockDocument = {
                getText: () => '[test link](/docs/concepts/overview)',
                positionAt: (offset: number) => new vscode.Position(0, offset),
                uri: vscode.Uri.file(filePath)
            } as vscode.TextDocument;

            const diagnosticCount = linkValidator.validateLinks(mockDocument);
            assert.strictEqual(diagnosticCount, 0, `Non-translation file should have 0 diagnostics: ${filePath}`);
        });

        linkValidator.dispose();
    });

    test('should validate regex patterns correctly', () => {
        const testCases = [
            { text: '[test](/docs/overview)', shouldMatch: true },
            { text: '[test](/docs/overview/)', shouldMatch: true },
            { text: '[test](/docs/overview.md)', shouldMatch: true },
            { text: '[test](/docs/sub/path/file)', shouldMatch: true },
            { text: '[test](/ko/docs/overview)', shouldMatch: false },  // Has language code
            { text: '[test](https://example.com)', shouldMatch: false },  // External link
            { text: '[test](/other/path)', shouldMatch: false },          // Not /docs/
            { text: 'plain text', shouldMatch: false },                   // No link
            { text: '[test]', shouldMatch: false },                       // No URL
            { text: '(/docs/overview)', shouldMatch: false }               // No link text
        ];

        testCases.forEach(({ text, shouldMatch }) => {
            // Create new regex for each test to avoid global state issues
            const LINK_REGEX = /\[([^\]]*)\]\(\/docs\/([^)]*)\)/;
            const matches = LINK_REGEX.test(text);
            assert.strictEqual(matches, shouldMatch, `Regex test failed for: "${text}"`);
        });
    });

    test('should handle specific common-labels link case', () => {
        const mockText = '[일반적으로 사용하는 레이블](/docs/concepts/overview/working-with-objects/common-labels/)이며';
        const mockDocument = {
            getText: () => mockText,
            positionAt: (offset: number) => new vscode.Position(0, offset),
            uri: vscode.Uri.file('/content/ko/docs/test.md')
        } as vscode.TextDocument;

        // Use constructor injection for file existence mock
        const linkValidator = new LinkValidator({
            fileExistsChecker: (path: string) => path.includes('common-labels')
        });

        const diagnosticCount = linkValidator.validateLinks(mockDocument);

        assert.strictEqual(diagnosticCount, 1, 'Should find one diagnostic for common-labels link');

        linkValidator.dispose();
    });
});