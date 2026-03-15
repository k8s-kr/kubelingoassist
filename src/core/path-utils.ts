import * as fs from 'fs';

/**
 * Kubernetes 문서 경로 관련 공유 상수 및 유틸리티
 *
 * content/{lang}/ 패턴을 다루는 로직이 여러 모듈에서 중복되지 않도록
 * 이 파일에 경로 관련 유틸리티를 집중합니다.
 */

/** content 디렉토리에서 언어 코드를 추출하는 정규식 */
export const CONTENT_LANG_REGEX = /\/content\/([^/]+)\//;

/** 번역 파일 패턴 (content/{lang}/docs/) */
export const TRANSLATION_FILE_REGEX = /\/content\/([^/]+)\/docs\//;

/**
 * 파일 경로에서 언어 코드를 추출합니다.
 * 예: '/content/ko/docs/test.md' → 'ko'
 */
export function extractLanguageCode(filePath: string): string {
  const match = filePath.match(CONTENT_LANG_REGEX);
  return match ? match[1] : 'unknown';
}

/**
 * 번역 대상 파일인지 판별합니다 (영어 제외).
 * 예: '/content/ko/docs/test.md' → true, '/content/en/docs/test.md' → false
 */
export function isTranslationFile(filePath: string): boolean {
  const match = filePath.match(TRANSLATION_FILE_REGEX);
  return match !== null && match[1] !== 'en';
}

/**
 * 파일 경로에서 content 루트 디렉토리를 추출합니다.
 * 예: '/workspace/website/content/ko/docs/test.md' → '/workspace/website/content'
 */
export function getContentRoot(filePath: string): string | null {
  const match = filePath.match(/(.*\/content)\/[^/]+\//);
  return match ? match[1] : null;
}

/**
 * 번역 파일 경로에서 영어 원본 경로를 반환합니다.
 * 예: 'content/ko/docs/test.md' → 'content/en/docs/test.md'
 */
export function getOriginalEnglishPath(translationPath: string): string | null {
  const match = translationPath.match(CONTENT_LANG_REGEX);
  if (match && match[1] !== 'en') {
    return translationPath.replace(`content/${match[1]}/`, 'content/en/');
  }
  return null;
}

/**
 * 파일 또는 디렉토리 존재 여부를 동기적으로 확인합니다.
 * 경로가 '/'로 끝나면 디렉토리 여부를, 아니면 파일 여부를 확인합니다.
 */
export function fileExistsSync(filePath: string): boolean {
  try {
    if (!fs.existsSync(filePath)) {
      return false;
    }
    const stats = fs.statSync(filePath);
    return filePath.endsWith('/') ? stats.isDirectory() : stats.isFile();
  } catch {
    return false;
  }
}
