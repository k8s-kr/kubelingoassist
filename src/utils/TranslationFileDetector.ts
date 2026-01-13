const TRANSLATION_FILE_PATTERN = /\/content\/([^\/]+)\/docs\//;
const ENGLISH_LANGUAGE_CODE = 'en';

export function isTranslationFile(filePath: string): boolean {
    const normalizedPath = filePath.replace(/\\/g, '/');
    const match = normalizedPath.match(TRANSLATION_FILE_PATTERN);
    return match !== null && match[1] !== ENGLISH_LANGUAGE_CODE;
}

export function isEnglishFile(filePath: string): boolean {
    const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase();
    return normalizedPath.includes('/content/en/');
}

export function isKubernetesContentFile(filePath: string): boolean {
    const normalizedPath = filePath.replace(/\\/g, '/');
    return normalizedPath.includes('/content/');
}

export function extractLanguageCode(filePath: string): string {
    const normalizedPath = filePath.replace(/\\/g, '/');
    const langMatch = normalizedPath.match(/\/content\/([^/]+)\//);
    return langMatch ? langMatch[1] : 'unknown';
}

export function getEnglishPathFromTranslation(translationPath: string): string | null {
    const normalizedPath = translationPath.replace(/\\/g, '/');
    const langMatch = normalizedPath.match(/\/content\/([^/]+)\//);

    if (langMatch && langMatch[1] !== ENGLISH_LANGUAGE_CODE) {
        return normalizedPath.replace(`/content/${langMatch[1]}/`, '/content/en/');
    }

    return null;
}
