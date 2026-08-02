/**
 * 번역 시 표기가 흔들리는 용어 그룹.
 *
 * canonical은 두 가지 방식으로 결정된다.
 * - source: 'glossary' — 공식 용어집에 등록된 표현. 아래 두 소스 중 하나 이상에서 확인됨.
 *   신뢰도가 높으므로 Warning으로 표시한다.
 *     1) 독자용 용어집(content/ko/docs/reference/glossary/*.md)의 title
 *     2) 한글화팀의 자체 결정 표(content/ko/docs/contribute/localization_ko.md의 "한글화 용어집" 섹션)
 * - source: 'corpus' — 위 두 용어집 어디에도 없지만 content/ko/docs 전체에서 다수를 차지하는
 *   표현. 집단 관례일 뿐 규범은 아니므로 Hint로 표시한다.
 *
 * 새 그룹을 추가할 때는 반드시 사람이 실제 corpus 빈도와 두 용어집을 확인한 뒤 등록한다.
 * (예: "네트워킹"과 "네트워크"는 표기 차이가 아니라 서로 다른 단어이므로 그룹으로 묶으면 안 된다.
 *  "로드 밸런서"/"로드밸런서"처럼 corpus에서 거의 반반으로 쓰이고 어느 용어집에도 없는 경우는
 *  canonical을 단정할 근거가 없으므로 그룹으로 등록하지 않는다.)
 */
export interface TerminologyGroup {
  /** 권장 표현 */
  canonical: string;
  /** 권장하지 않는(흔들리는) 표현들 */
  variants: string[];
  /** canonical을 결정한 근거 */
  source: 'glossary' | 'corpus';
}

export const TERMINOLOGY_GROUPS: TerminologyGroup[] = [
  // shell | 셸 (한글화 용어집)
  { canonical: '셸', variants: ['쉘'], source: 'glossary' },
  // proxy | 프록시 (한글화 용어집 + 독자용 용어집 proxy.md)
  { canonical: '프록시', variants: ['프락시'], source: 'glossary' },
  // label | 레이블 (한글화 용어집 + 독자용 용어집 label.md)
  { canonical: '레이블', variants: ['라벨'], source: 'glossary' },
  // 독자용 용어집 garbage-collection.md
  { canonical: '가비지 수집', variants: ['가비지 컬렉션', '가비지 콜렉션'], source: 'glossary' },
  // canary | 카나리(canary) — 릴리스 방식 용어인 경우에 한함 (한글화 용어집)
  { canonical: '카나리', variants: ['카나리아'], source: 'glossary' },
  // application | 애플리케이션 (한글화 용어집)
  { canonical: '애플리케이션', variants: ['어플리케이션'], source: 'glossary' },
  // DaemonSet | 데몬셋(DaemonSet), 붙여쓰기 (한글화 용어집)
  { canonical: '데몬셋', variants: ['데몬 셋'], source: 'glossary' },
  // ResourceQuota | 리소스쿼터(ResourceQuota), 붙여쓰기 (한글화 용어집)
  { canonical: '리소스쿼터', variants: ['리소스 쿼터'], source: 'glossary' },
  // 두 용어집 어디에도 없지만 corpus에서 압도적 다수 (scheduler)
  { canonical: '스케줄러', variants: ['스케쥴러'], source: 'corpus' },
];

/** 그룹에 속한 모든 표현(canonical + variants) 목록 */
export function getAllTerms(groups: TerminologyGroup[] = TERMINOLOGY_GROUPS): string[] {
  return groups.flatMap((g) => [g.canonical, ...g.variants]);
}
