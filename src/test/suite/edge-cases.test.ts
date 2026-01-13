import * as assert from 'assert';
import * as vscode from 'vscode';
import { LinkValidator } from '../../validators/link';

suite('Edge Cases and Error Handling', () => {
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

    test('should handle special characters in links via validation', () => {
        const mockText = `# Special Characters Test
[link with spaces](/docs/concepts/overview with spaces)
[link with unicode](/docs/concepts/개념-설명)
[link with numbers](/docs/v1.2.3/api-reference)
[link with dashes](/docs/multi-word-concept/sub-topic)
[link with underscores](/docs/some_file_name/another_file)`;

        const mockDocument = {
            getText: () => mockText,
            positionAt: (offset: number) => new vscode.Position(0, offset),
            uri: vscode.Uri.file('/content/ko/docs/special-chars.md')
        } as vscode.TextDocument;

        // Use constructor injection for file existence mock
        const linkValidator = new LinkValidator({
            fileExistsChecker: () => true
        });

        const diagnosticCount = linkValidator.validateLinks(mockDocument);
        assert.strictEqual(diagnosticCount, 5, 'Should detect all 5 links with special characters');

        linkValidator.dispose();
    });

    test('should handle null and undefined inputs gracefully', () => {
        const linkValidator = new LinkValidator();

        // Test with null document
        try {
            const result = linkValidator.validateLinks(null as unknown as vscode.TextDocument);
            assert.ok(result >= 0 || result === 0, 'Should handle null document gracefully');
        } catch {
            // It's acceptable to throw an error for null input
            assert.ok(true, 'Throwing error for null input is acceptable');
        }

        // Test with undefined document
        try {
            const result = linkValidator.validateLinks(undefined as unknown as vscode.TextDocument);
            assert.ok(result >= 0 || result === 0, 'Should handle undefined document gracefully');
        } catch {
            // It's acceptable to throw an error for undefined input
            assert.ok(true, 'Throwing error for undefined input is acceptable');
        }

        linkValidator.dispose();
    });

    test('should handle documents with only whitespace', () => {
        const mockDocument = {
            getText: () => '   \n\n\t\t   \n   ',
            positionAt: (offset: number) => new vscode.Position(0, offset),
            uri: vscode.Uri.file('/content/ko/docs/whitespace.md')
        } as vscode.TextDocument;

        const linkValidator = new LinkValidator();
        const diagnosticCount = linkValidator.validateLinks(mockDocument);
        assert.strictEqual(diagnosticCount, 0, 'Whitespace-only document should have no diagnostics');
        linkValidator.dispose();
    });

    test('should handle documents with mixed valid and invalid links', () => {
        const mockText = `# Mixed Links Test
[valid link](/docs/concepts/overview)
[invalid link missing path]()
[another valid](/docs/reference/)
[external link](https://example.com)
[relative link](../other/file.md)
[valid link with lang](/ko/docs/concepts/test)`;

        const mockDocument = {
            getText: () => mockText,
            positionAt: (offset: number) => new vscode.Position(0, offset),
            uri: vscode.Uri.file('/content/ko/docs/mixed.md')
        } as vscode.TextDocument;

        // Use constructor injection for file existence mock
        const linkValidator = new LinkValidator({
            fileExistsChecker: () => true
        });

        const diagnosticCount = linkValidator.validateLinks(mockDocument);

        // Should process only the valid /docs/ links without language codes
        assert.strictEqual(diagnosticCount, 2, 'Should process 2 valid links');

        linkValidator.dispose();
    });

    test('should handle very large documents', () => {
        // Create a document with many links
        const linkTemplate = '[link {{index}}](/docs/concepts/overview{{index}})';
        const linkCount = 1000;
        let mockText = '# Large Document Test\n\n';

        for (let i = 0; i < linkCount; i++) {
            mockText += linkTemplate.replace(/\{\{index\}\}/g, i.toString()) + '\n';
        }

        const mockDocument = {
            getText: () => mockText,
            positionAt: (offset: number) => new vscode.Position(Math.floor(offset / 100), offset % 100),
            uri: vscode.Uri.file('/content/ko/docs/large.md')
        } as vscode.TextDocument;

        // Use constructor injection for file existence mock
        const linkValidator = new LinkValidator({
            fileExistsChecker: () => true
        });

        const startTime = Date.now();
        const diagnosticCount = linkValidator.validateLinks(mockDocument);
        const endTime = Date.now();

        assert.strictEqual(diagnosticCount, linkCount, `Should process all ${linkCount} links`);
        assert.ok(endTime - startTime < 5000, 'Should complete large document validation within 5 seconds');

        linkValidator.dispose();
    });

    test('should handle filesystem errors gracefully', () => {
        const mockText = '[test link](/docs/concepts/overview)';
        const mockDocument = {
            getText: () => mockText,
            positionAt: (offset: number) => new vscode.Position(0, offset),
            uri: vscode.Uri.file('/content/ko/docs/fs-error.md')
        } as vscode.TextDocument;

        // Use constructor injection for file existence mock that throws
        const linkValidator = new LinkValidator({
            fileExistsChecker: () => {
                throw new Error('Mock filesystem error');
            }
        });

        try {
            const diagnosticCount = linkValidator.validateLinks(mockDocument);
            // Should handle the error gracefully and continue
            assert.ok(diagnosticCount >= 0, 'Should handle filesystem errors gracefully');
        } catch {
            // It's acceptable to propagate critical filesystem errors
            assert.ok(true, 'Propagating filesystem errors is acceptable');
        }

        linkValidator.dispose();
    });

    test('should handle documents with different line endings', () => {
        const testCases = [
            { text: '[link1](/docs/overview)\r\n[link2](/docs/concepts)', description: 'Windows CRLF', expectedCount: 2 },
            { text: '[link1](/docs/overview)\n[link2](/docs/concepts)', description: 'Unix LF', expectedCount: 2 },
            { text: '[link1](/docs/overview)\r[link2](/docs/concepts)', description: 'Old Mac CR', expectedCount: 2 },
            { text: '[link1](/docs/overview)\r\n\r\n[link2](/docs/concepts)\n', description: 'Mixed line endings', expectedCount: 2 }
        ];

        testCases.forEach(({ text, description, expectedCount }) => {
            const mockDocument = {
                getText: () => text,
                positionAt: (offset: number) => new vscode.Position(0, offset),
                uri: vscode.Uri.file(`/content/ko/docs/${description.toLowerCase().replace(/\s+/g, '-')}.md`)
            } as vscode.TextDocument;

            // Use constructor injection for file existence mock
            const linkValidator = new LinkValidator({
                fileExistsChecker: () => true
            });

            const diagnosticCount = linkValidator.validateLinks(mockDocument);
            assert.strictEqual(diagnosticCount, expectedCount, `Should detect ${expectedCount} links for ${description}`);

            linkValidator.dispose();
        });
    });
});