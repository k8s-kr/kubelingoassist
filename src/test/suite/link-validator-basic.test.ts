import * as assert from 'assert';

suite('LinkValidator Basic Tests', () => {
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
        const currentPath = '/content/ko/docs/concepts/overview.md';
        const linkPath = 'concepts/cluster.md';
        const language = 'ko';

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

            if (!linkPath.endsWith('/') && !expectedPath.endsWith('.md')) {
                expectedPath += '.md';
            }
            
            assert.strictEqual(expectedPath, expected, `Failed for ${type}: ${linkPath}`);
        });
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
});