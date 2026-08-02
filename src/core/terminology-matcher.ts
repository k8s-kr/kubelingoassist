import { TerminologyGroup, TERMINOLOGY_GROUPS } from './terminology-data';

export interface TerminologyMatch {
  /** 매치된 문자열의 시작 offset */
  index: number;
  /** 매치된 문자열의 길이 */
  length: number;
  /** 매치된 실제 표현 (예: '쉘') */
  term: string;
  /** 소속 그룹 */
  group: TerminologyGroup;
  /** term이 group.canonical과 같은지 여부 */
  isCanonical: boolean;
}

/**
 * 텍스트에서 용어 그룹에 속한 표현을 찾는다.
 *
 * "카나리"가 "카나리아"의 부분 문자열이듯, 그룹 내 표현들은 서로 겹칠 수 있다.
 * 짧은 표현을 먼저 매치하면 "카나리아" 안의 "카나리"를 잘못 집어내게 되므로,
 * 반드시 긴 표현부터 우선 매치하는 최장 일치(longest-match-first) 방식을 쓴다.
 */
export function findTerminologyMatches(
  text: string,
  groups: TerminologyGroup[] = TERMINOLOGY_GROUPS
): TerminologyMatch[] {
  // (표현, 그룹) 쌍을 길이 내림차순으로 정렬해 최장 일치를 우선한다.
  const candidates: Array<{ term: string; group: TerminologyGroup; isCanonical: boolean }> = [];
  for (const group of groups) {
    candidates.push({ term: group.canonical, group, isCanonical: true });
    for (const variant of group.variants) {
      candidates.push({ term: variant, group, isCanonical: false });
    }
  }
  candidates.sort((a, b) => b.term.length - a.term.length);

  const matches: TerminologyMatch[] = [];
  let i = 0;

  while (i < text.length) {
    let matched = false;

    for (const candidate of candidates) {
      const { term } = candidate;
      if (term.length === 0) {
        continue;
      }
      if (text.startsWith(term, i)) {
        matches.push({
          index: i,
          length: term.length,
          term,
          group: candidate.group,
          isCanonical: candidate.isCanonical,
        });
        i += term.length;
        matched = true;
        break;
      }
    }

    if (!matched) {
      i += 1;
    }
  }

  return matches;
}
