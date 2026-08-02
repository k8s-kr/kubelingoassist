import * as fs from 'fs';
import * as path from 'path';
import { findTerminologyMatches } from '../../core/terminology-matcher';
import { TerminologyGroup, TERMINOLOGY_GROUPS } from '../../core/terminology-data';

/**
 * 워크스페이스의 content/ko/docs 전체를 스캔해서 용어 표현별 실사용 빈도를 센다.
 * 결과는 메모리에 캐시하고, 파일이 저장될 때마다 해당 파일 분량만 다시 계산한다
 * (매번 전체를 재스캔하지 않는다).
 */
export class CorpusIndexer {
  private counts: Map<string, number> = new Map();
  private fileCounts: Map<string, Map<string, number>> = new Map();

  // 테스트에서 모킹할 수 있도록 필드로 노출 (LinkValidator.fileExists와 같은 패턴)
  private listMarkdownFiles: (root: string) => Promise<string[]> = defaultListMarkdownFiles;
  private readFileText: (filePath: string) => string = defaultReadFileText;

  constructor(
    private workspaceRoot: string,
    private groups: TerminologyGroup[] = TERMINOLOGY_GROUPS
  ) {}

  /** 워크스페이스 전체를 스캔해서 인덱스를 (재)구축한다. */
  async buildIndex(): Promise<void> {
    this.counts.clear();
    this.fileCounts.clear();

    const files = await this.listMarkdownFiles(this.workspaceRoot);
    for (const file of files) {
      this.indexFile(file);
    }
  }

  /** 파일 하나만 다시 인덱싱한다 (저장 이벤트에서 사용). */
  updateFile(filePath: string): void {
    this.indexFile(filePath);
  }

  private indexFile(filePath: string): void {
    let text: string;
    try {
      text = this.readFileText(filePath);
    } catch {
      return;
    }

    // 이 파일의 기존 카운트를 전체 합계에서 제거한 뒤 다시 더한다.
    const previous = this.fileCounts.get(filePath);
    if (previous) {
      for (const [term, count] of previous) {
        this.counts.set(term, (this.counts.get(term) || 0) - count);
      }
    }

    const matches = findTerminologyMatches(text, this.groups);
    const current = new Map<string, number>();
    for (const match of matches) {
      current.set(match.term, (current.get(match.term) || 0) + 1);
    }

    for (const [term, count] of current) {
      this.counts.set(term, (this.counts.get(term) || 0) + count);
    }
    this.fileCounts.set(filePath, current);
  }

  /** 특정 표현이 corpus에서 몇 번 등장했는지 반환한다. */
  getCount(term: string): number {
    return this.counts.get(term) || 0;
  }

  /** 그룹에 속한 모든 표현의 등장 횟수를 한 번에 반환한다. */
  getGroupCounts(group: TerminologyGroup): Record<string, number> {
    const result: Record<string, number> = {};
    result[group.canonical] = this.getCount(group.canonical);
    for (const variant of group.variants) {
      result[variant] = this.getCount(variant);
    }
    return result;
  }

  /** 인덱스가 한 번이라도 구축됐는지 여부 (스캔 전엔 빈도 정보가 없음을 UI에 알리는 용도). */
  isIndexed(): boolean {
    return this.fileCounts.size > 0;
  }
}

function defaultListMarkdownFiles(root: string): Promise<string[]> {
  const contentKoDocs = path.join(root, 'content', 'ko', 'docs');
  const results: string[] = [];

  function walk(dir: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        results.push(full);
      }
    }
  }

  walk(contentKoDocs);
  return Promise.resolve(results);
}

function defaultReadFileText(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}
