import * as path from 'path';

export function getExpectedTranslationPath(
    currentFilePath: string,
    linkPath: string,
    language: string
): string | null {
    try {
        const normalizedPath = currentFilePath.replace(/\\/g, '/');
        const contentMatch = normalizedPath.match(/(.*\/content)\/[^/]+\/docs\//);

        if (!contentMatch) {
            return null;
        }

        const contentRoot = contentMatch[1];
        let expectedPath = path.join(contentRoot, language.toLowerCase(), 'docs', linkPath);

        if (linkPath.endsWith('/')) {
            return expectedPath;
        }

        if (!expectedPath.endsWith('.md')) {
            expectedPath += '.md';
        }

        return expectedPath;
    } catch {
        return null;
    }
}

export function normalizePath(filePath: string): string {
    return filePath.replace(/\\/g, '/');
}

export function extractContentRoot(filePath: string): string | null {
    const normalizedPath = normalizePath(filePath);
    const contentMatch = normalizedPath.match(/(.*\/content)\/[^/]+\//);
    return contentMatch ? contentMatch[1] : null;
}
