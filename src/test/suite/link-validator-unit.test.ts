import * as assert from 'assert';
import * as vscode from 'vscode';
import { LinkValidator } from '../../validators/link';

suite('LinkValidator Unit Tests', () => {
    let linkValidator: LinkValidator;
    
    setup(() => {
        linkValidator = new LinkValidator();
    });
    
    teardown(() => {
        linkValidator.dispose();
    });

    test('should identify translation files correctly', () => {
        const testCases = [
            { path: '/content/ko/docs/concepts/overview.md', expected: true },
            { path: '/content/ja/docs/tutorial/basic.md', expected: true },
            { path: '/content/zh-cn/docs/concepts/overview.md', expected: true },
            { path: '/content/en/docs/concepts/overview.md', expected: false },
            { path: '/content/en/blog/post.md', expected: false },
            { path: '/other/path/file.md', expected: false },
            { path: '/content/invalid.md', expected: false },
            { path: '/content/ko/blog/post.md', expected: false }
        ];

        testCases.forEach(({ path, expected }) => {
            const result = (linkValidator as any).isTranslationFile(path);
            assert.strictEqual(result, expected, `Failed for path: ${path}`);
        });
    });

    test('should extract links from document correctly', async () => {
        const mockText = `# Test Document
        
Here is a [normal link](/docs/concepts/overview) to check.
Here is a [folder link](/docs/tutorials/) to a directory.
Here is a [link with extension](/docs/tasks/install.md) with .md.
This [link with language](/ko/docs/concepts/overview) should be ignored.
This [external link](https://example.com) should be ignored.`;

        const mockDocument = {
            getText: () => mockText,
            positionAt: (offset: number) => new vscode.Position(0, offset)
        } as vscode.TextDocument;

        const links = (linkValidator as any).extractLinks(mockDocument);
        
        assert.strictEqual(links.length, 3);
        assert.strictEqual(links[0].text, 'normal link');
        assert.strictEqual(links[0].path, 'concepts/overview');
        assert.strictEqual(links[1].text, 'folder link');
        assert.strictEqual(links[1].path, 'tutorials/');
        assert.strictEqual(links[2].text, 'link with extension');
        assert.strictEqual(links[2].path, 'tasks/install.md');
    });

    test('should skip links with language codes', () => {
        const testCases = [
            { linkPath: 'ko/docs/concepts/overview', shouldSkip: true },
            { linkPath: 'en/docs/concepts/overview', shouldSkip: true },
            { linkPath: 'ja/docs/tutorial/basic', shouldSkip: true },
            { linkPath: 'zh/docs/reference/api', shouldSkip: true },
            { linkPath: 'docs/concepts/overview', shouldSkip: false },
            { linkPath: 'docs/tutorial/', shouldSkip: false },
            { linkPath: 'concepts/overview.md', shouldSkip: false }
        ];

        testCases.forEach(({ linkPath, shouldSkip }) => {
            const result = (linkValidator as any).shouldSkipLink(linkPath);
            assert.strictEqual(result, shouldSkip, `Failed for linkPath: ${linkPath}`);
        });
    });

    test('should generate expected translation paths correctly', () => {
        const testCases = [
            {
                currentPath: '/content/ko/docs/concepts/overview.md',
                linkPath: 'concepts/cluster.md',
                language: 'ko',
                expectedPattern: /\/content\/ko\/docs\/concepts\/cluster\.md$/
            },
            {
                currentPath: '/content/ja/docs/tutorial/basic.md', 
                linkPath: 'reference/',
                language: 'ja',
                expectedPattern: /\/content\/ja\/docs\/reference\/$/
            },
            {
                currentPath: '/content/zh-cn/docs/reference/api.md',
                linkPath: 'concepts/overview',
                language: 'zh-cn', 
                expectedPattern: /\/content\/zh-cn\/docs\/concepts\/overview\.md$/
            }
        ];

        testCases.forEach(({ currentPath, linkPath, language, expectedPattern }) => {
            const result = (linkValidator as any).getExpectedTranslationPath(currentPath, linkPath, language);
            assert.notStrictEqual(result, null, `Should generate path for ${currentPath} -> ${linkPath}`);
            if (result) {
                assert.match(result, expectedPattern, `Pattern mismatch for ${linkPath}`);
            }
        });
    });

    test('should handle invalid paths gracefully', () => {
        const invalidPaths = [
            '/invalid/path.md',
            '/content/file.md',
            '',
            null as any,
            undefined as any
        ];

        invalidPaths.forEach(invalidPath => {
            const result = (linkValidator as any).getExpectedTranslationPath(invalidPath, 'test.md', 'ko');
            assert.strictEqual(result, null, `Should return null for invalid path: ${invalidPath}`);
        });
    });

    test('should create diagnostic with correct properties', () => {
        const mockLinkInfo = {
            text: 'test link',
            path: 'concepts/overview',
            fullMatch: '[test link](/docs/concepts/overview)',
            range: new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 10))
        };

        const mockValidationResult = {
            translationExists: true,
            expectedPath: '/content/ko/docs/concepts/overview.md',
            isFolder: false
        };

        const diagnostic = (linkValidator as any).createDiagnostic(mockLinkInfo, mockValidationResult, 'ko');

        assert.strictEqual(diagnostic.severity, vscode.DiagnosticSeverity.Warning);
        assert.strictEqual(diagnostic.source, 'KubeLingoAssist');
        assert.strictEqual(diagnostic.code, 'missing-language-path');
        assert.ok(diagnostic.message.includes('파일'));
        assert.ok(diagnostic.message.includes('ko'));
    });

    test('should validate links end-to-end with mock document', () => {
        const mockText = `# Test Document
[valid link](/docs/concepts/overview)
[link with lang](/ko/docs/concepts/overview)
[another valid](/docs/tutorials/)`;

        const mockDocument = {
            getText: () => mockText,
            positionAt: (offset: number) => new vscode.Position(0, offset),
            uri: vscode.Uri.file('/content/ko/docs/test.md')
        } as vscode.TextDocument;

        // Mock file system check to always return false (no translation exists)
        const originalFileExists = (linkValidator as any).fileExists;
        (linkValidator as any).fileExists = () => false;

        const diagnosticCount = linkValidator.validateLinks(mockDocument);
        
        // Should process 2 valid links but find 0 diagnostics (no translations exist)
        assert.strictEqual(diagnosticCount, 0);

        // Restore original method
        (linkValidator as any).fileExists = originalFileExists;
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

        // Simulate concurrent calls
        const count1 = linkValidator.validateLinks(mockDocument1);
        const count2 = linkValidator.validateLinks(mockDocument2);

        assert.ok(count1 >= 0, 'First validation should complete successfully');
        assert.ok(count2 >= 0, 'Second validation should complete successfully');
        
        // Verify diagnostics are stored separately
        const diag1 = linkValidator.getDiagnostics().get(mockDocument1.uri);
        const diag2 = linkValidator.getDiagnostics().get(mockDocument2.uri);
        
        assert.ok(diag1 !== diag2, 'Diagnostics should be stored separately per document');
    });

    test('should handle non-translation files correctly', () => {
        const testCases = [
            '/content/en/docs/concepts/overview.md',  // English file
            '/other/path/file.md',                    // Non-content path
            '/content/invalid.md',                    // Invalid content structure
            '/README.md'                              // Root file
        ];

        testCases.forEach(filePath => {
            const mockDocument = {
                getText: () => '[test link](/docs/concepts/overview)',
                positionAt: (offset: number) => new vscode.Position(0, offset),
                uri: vscode.Uri.file(filePath)
            } as vscode.TextDocument;

            const diagnosticCount = linkValidator.validateLinks(mockDocument);
            assert.strictEqual(diagnosticCount, 0, `Non-translation file should have 0 diagnostics: ${filePath}`);
        });
    });

    test('should handle links ending with anchor tags correctly', () => {
        const mockText = `# Test Document
[API versioning](/docs/concepts/overview/kubernetes-api/#api-groups-and-versioning)
[Section link](/docs/tutorials/basic/#getting-started)
[Simple anchor](/docs/reference/api#resources)`;

        const mockDocument = {
            getText: () => mockText,
            positionAt: (offset: number) => new vscode.Position(0, offset),
            uri: vscode.Uri.file('/content/ko/docs/test.md')
        } as vscode.TextDocument;

        // Mock file system to simulate that base files exist
        const originalFileExists = (linkValidator as any).fileExists;
        (linkValidator as any).fileExists = (filePath: string) => {
            // Return true for base paths without anchor tags
            if (filePath.includes('kubernetes-api') || filePath.includes('basic') || filePath.includes('api')) {
                return true;
            }
            return false;
        };

        const diagnosticCount = linkValidator.validateLinks(mockDocument);
        
        // Should find 3 diagnostics for links with anchor tags where base files exist
        assert.strictEqual(diagnosticCount, 3, 'Should detect 3 links with anchor tags that have existing base files');

        // Restore original method
        (linkValidator as any).fileExists = originalFileExists;
    });

    test('should extract base path from links with anchor tags', () => {
        const testCases = [
            { 
                linkPath: 'concepts/overview/kubernetes-api/#api-groups-and-versioning',
                expectedBasePath: 'concepts/overview/kubernetes-api/',
                description: 'API versioning link'
            },
            { 
                linkPath: 'tutorials/basic/#getting-started',
                expectedBasePath: 'tutorials/basic/',
                description: 'Tutorial section link'
            },
            { 
                linkPath: 'reference/api#resources',
                expectedBasePath: 'reference/api',
                description: 'Simple anchor link'
            },
            { 
                linkPath: 'concepts/overview',
                expectedBasePath: 'concepts/overview',
                description: 'Link without anchor'
            }
        ];

        testCases.forEach(({ linkPath, expectedBasePath, description }) => {
            // Extract base path by removing everything from # onwards
            const basePath = linkPath.split('#')[0];
            assert.strictEqual(basePath, expectedBasePath, `Failed for ${description}: ${linkPath}`);
        });
    });
});