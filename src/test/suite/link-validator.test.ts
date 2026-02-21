import * as assert from 'assert';
import * as vscode from 'vscode';
import { LinkValidator, LinkCodeActionProvider } from '../../validators/link';

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
            { linkPath: 'concepts/', expected: 'concepts/' }
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
            { linkPath: 'tasks/install/', isFolder: true, resourceType: '폴더' }
        ];
        
        testCases.forEach(({ linkPath, isFolder, resourceType }) => {
            const actualIsFolder = linkPath.endsWith('/');
            const actualResourceType = actualIsFolder ? '폴더' : '파일';
            
            assert.strictEqual(actualIsFolder, isFolder);
            assert.strictEqual(actualResourceType, resourceType);
        });
    });

    test('should generate correct translation paths for files and folders', () => {
        const currentPath = '/content/ko/docs/concepts/overview.md';
        const language = 'ko';
        const contentRoot = '/content';
        
        const testCases = [
            {
                linkPath: 'concepts/cluster.md',
                expected: '/content/ko/docs/concepts/cluster.md',
                type: 'file'
            },
            {
                linkPath: 'concepts/',
                expected: '/content/ko/docs/concepts/',
                type: 'folder'
            },
            {
                linkPath: 'tasks/install',
                expected: '/content/ko/docs/tasks/install.md',
                type: 'file with auto .md'
            }
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
            { path: '/content/ko/blog/post.md', expected: false } // blog은 docs가 아니므로 false
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
        assert.ok(diagnostic.message.includes('존재합니다'));
        assert.ok(diagnostic.relatedInformation);
        assert.ok(diagnostic.relatedInformation[0].message.includes('/ko/'));
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
            )
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
            getText: (range: vscode.Range) => '[test link](/docs/concepts/overview)',
            uri: vscode.Uri.file('/content/ko/docs/test.md')
        } as vscode.TextDocument;

        const mockDiagnostic = new vscode.Diagnostic(
            new vscode.Range(0, 0, 0, 35),
            'Missing language path',
            vscode.DiagnosticSeverity.Warning
        );
        mockDiagnostic.source = 'KubeLingoAssist';
        mockDiagnostic.code = 'missing-language-path';

        const action = (codeActionProvider as any).createFixLanguagePathAction(mockDocument, mockDiagnostic);
        
        assert.notStrictEqual(action, undefined);
        assert.ok(action.title.includes('ko'));
        assert.strictEqual(action.kind, vscode.CodeActionKind.QuickFix);
        assert.strictEqual(action.isPreferred, true);
        assert.strictEqual(action.diagnostics?.length, 1);
        assert.ok(action.edit);
    });

    test('should return undefined for invalid diagnostic text', () => {
        const mockDocument = {
            getText: (range: vscode.Range) => 'invalid text without link pattern',
            uri: vscode.Uri.file('/content/ko/docs/test.md')
        } as vscode.TextDocument;

        const mockDiagnostic = new vscode.Diagnostic(
            new vscode.Range(0, 0, 0, 10),
            'Invalid diagnostic',
            vscode.DiagnosticSeverity.Warning
        );

        const action = (codeActionProvider as any).createFixLanguagePathAction(mockDocument, mockDiagnostic);
        
        assert.strictEqual(action, undefined);
    });

    test('should provide code actions for context with link diagnostics', () => {
        const mockDocument = {
            getText: (range: vscode.Range) => '[test](/docs/overview)',
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

        const actions = codeActionProvider.provideCodeActions(
            mockDocument,
            new vscode.Range(0, 0, 0, 20),
            mockContext,
{ isCancellationRequested: false, onCancellationRequested: () => ({ dispose: () => {} }) } as any
        );
        
        assert.strictEqual(actions.length, 1);
        assert.strictEqual(actions[0].kind, vscode.CodeActionKind.QuickFix);
    });
});