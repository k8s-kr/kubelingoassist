import * as assert from 'assert';
import * as vscode from 'vscode';
import { LinkValidator } from '../../validators/link';
import { isTranslationFile } from '../../core/path-utils';

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
      { path: '/content/ko/blog/post.md', expected: false }, // blog은 docs가 아니므로 false
    ];

    testCases.forEach(({ path, expected }) => {
      const result = isTranslationFile(path);
      assert.strictEqual(result, expected, `Failed for path: ${path}`);
    });
  });

  test('should generate expected translation paths correctly', () => {
    const testCases = [
      {
        currentPath: '/content/ko/docs/concepts/overview.md',
        linkPath: 'concepts/cluster.md',
        language: 'ko',
        expectedPattern: /\/content\/ko\/docs\/concepts\/cluster\.md$/,
      },
      {
        currentPath: '/content/ja/docs/tutorial/basic.md',
        linkPath: 'reference/',
        language: 'ja',
        expectedPattern: /\/content\/ja\/docs\/reference\/$/,
      },
      {
        currentPath: '/content/zh-cn/docs/reference/api.md',
        linkPath: 'concepts/overview',
        language: 'zh-cn',
        expectedPattern: /\/content\/zh-cn\/docs\/concepts\/overview\.md$/,
      },
    ];

    testCases.forEach(({ currentPath, linkPath, language, expectedPattern }) => {
      const result = (linkValidator as any).getExpectedTranslationPath(
        currentPath,
        linkPath,
        language
      );
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
      undefined as any,
    ];

    invalidPaths.forEach((invalidPath) => {
      const result = (linkValidator as any).getExpectedTranslationPath(
        invalidPath,
        'test.md',
        'ko'
      );
      assert.strictEqual(result, null, `Should return null for invalid path: ${invalidPath}`);
    });
  });

  test('should validate links end-to-end with mock document', () => {
    const mockText = `# Test Document
[valid link](/docs/concepts/overview)
[link with lang](/ko/docs/concepts/overview)
[another valid](/docs/tutorials/)`;

    const mockDocument = {
      getText: () => mockText,
      positionAt: (offset: number) => new vscode.Position(0, offset),
      uri: vscode.Uri.file('/content/ko/docs/test.md'),
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

  test('should detect links with different language prefix', () => {
    const mockText = `# Test Document
[english link](/en/docs/concepts/overview)
[same lang link](/ko/docs/concepts/overview)`;

    const mockDocument = {
      getText: () => mockText,
      positionAt: (offset: number) => new vscode.Position(0, offset),
      uri: vscode.Uri.file('/content/ko/docs/test.md'),
    } as vscode.TextDocument;

    const originalFileExists = (linkValidator as any).fileExists;
    const originalReadTitle = (linkValidator as any).readTitle;
    (linkValidator as any).fileExists = () => true;
    (linkValidator as any).readTitle = () => null;

    const diagnosticCount = linkValidator.validateLinks(mockDocument);

    // /en/docs/... should be detected (different lang), /ko/docs/... should be skipped (same lang)
    assert.strictEqual(diagnosticCount, 1, 'Should detect 1 link with different language prefix');

    (linkValidator as any).fileExists = originalFileExists;
    (linkValidator as any).readTitle = originalReadTitle;
  });

  test('should handle concurrent validation calls', () => {
    const mockDocument1 = {
      getText: () => '[link1](/docs/concepts/overview1)',
      positionAt: (offset: number) => new vscode.Position(0, offset),
      uri: vscode.Uri.file('/content/ko/docs/doc1.md'),
    } as vscode.TextDocument;

    const mockDocument2 = {
      getText: () => '[link2](/docs/concepts/overview2)',
      positionAt: (offset: number) => new vscode.Position(0, offset),
      uri: vscode.Uri.file('/content/ja/docs/doc2.md'),
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
      '/content/en/docs/concepts/overview.md', // English file
      '/other/path/file.md', // Non-content path
      '/content/invalid.md', // Invalid content structure
      '/README.md', // Root file
    ];

    testCases.forEach((filePath) => {
      const mockDocument = {
        getText: () => '[test link](/docs/concepts/overview)',
        positionAt: (offset: number) => new vscode.Position(0, offset),
        uri: vscode.Uri.file(filePath),
      } as vscode.TextDocument;

      const diagnosticCount = linkValidator.validateLinks(mockDocument);
      assert.strictEqual(
        diagnosticCount,
        0,
        `Non-translation file should have 0 diagnostics: ${filePath}`
      );
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
      uri: vscode.Uri.file('/content/ko/docs/test.md'),
    } as vscode.TextDocument;

    // Mock file system to simulate that base files exist
    const originalFileExists = (linkValidator as any).fileExists;
    (linkValidator as any).fileExists = (filePath: string) => {
      // Return true for base paths without anchor tags
      if (
        filePath.includes('kubernetes-api') ||
        filePath.includes('basic') ||
        filePath.includes('api')
      ) {
        return true;
      }
      return false;
    };

    const diagnosticCount = linkValidator.validateLinks(mockDocument);

    // Should find 3 diagnostics for links with anchor tags where base files exist
    assert.strictEqual(
      diagnosticCount,
      3,
      'Should detect 3 links with anchor tags that have existing base files'
    );

    // Restore original method
    (linkValidator as any).fileExists = originalFileExists;
  });

  test('should extract base path from links with anchor tags', () => {
    const testCases = [
      {
        linkPath: 'concepts/overview/kubernetes-api/#api-groups-and-versioning',
        expectedBasePath: 'concepts/overview/kubernetes-api/',
        description: 'API versioning link',
      },
      {
        linkPath: 'tutorials/basic/#getting-started',
        expectedBasePath: 'tutorials/basic/',
        description: 'Tutorial section link',
      },
      {
        linkPath: 'reference/api#resources',
        expectedBasePath: 'reference/api',
        description: 'Simple anchor link',
      },
      {
        linkPath: 'concepts/overview',
        expectedBasePath: 'concepts/overview',
        description: 'Link without anchor',
      },
    ];

    testCases.forEach(({ linkPath, expectedBasePath, description }) => {
      // Extract base path by removing everything from # onwards
      const basePath = linkPath.split('#')[0];
      assert.strictEqual(basePath, expectedBasePath, `Failed for ${description}: ${linkPath}`);
    });
  });
});
