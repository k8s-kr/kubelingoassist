export interface TranslationState {
  isSyncScrollEnabled: boolean;
  isKubelingoEnabled: boolean;
  currentMode: 'translation' | 'review';
}

export interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  date: string;
  files: CommitFile[];
}

export interface CommitFile {
  path: string;
  status: 'M' | 'A' | 'D' | 'R' | 'C';
  originalPath?: string;
}

export interface VSCodeMessage {
  type: string;
  payload?: any;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface TranslationProgress {
  totalLines: number;
  translatedLines: number;
  completionPercentage: number;
}

// Review Comment Types
export enum CommentType {
  GENERAL = 'general',
  SUGGESTION = 'suggestion',
  QUESTION = 'question',
  TERMINOLOGY = 'terminology',
  GRAMMAR = 'grammar',
  STYLE = 'style'
}

export interface ReviewCommentSuggestion {
  original: string;
  suggested: string;
}

export interface GitHubUserInfo {
  login: string;
  id: number;
  nodeId: string;
  avatarUrl: string;
  htmlUrl: string;
  type: string;
  siteAdmin: boolean;
}

export interface CommentReactions {
  plusOne: number;
  minusOne: number;
  laugh: number;
  confused: number;
  heart: number;
  hooray: number;
  rocket: number;
  eyes: number;
  totalCount: number;
  url: string;
}

export interface ReviewComment {
  id: string;
  filePath: string;
  author: string;
  body: string;
  type: CommentType;
  lineNumber: number;
  createdAt: Date;
  resolved: boolean;
  outdated: boolean; // 댓글이 작성된 코드가 변경되어 더 이상 최신 상태가 아님
  suggestion?: ReviewCommentSuggestion;
  replies: ReviewComment[];
  prCommentId?: number;

  // Pending 상태 (로컬에서 작성했지만 아직 GitHub에 제출되지 않음)
  isPending: boolean;
  isLocalOnly: boolean; // GitHub에서 가져온 게 아닌 로컬 작성 댓글

  // GitHub 상세 정보 (선택적)
  nodeId?: string;
  updatedAt?: Date;
  diffHunk?: string;

  // 라인 범위 정보 (멀티라인 댓글)
  startLine?: number | null;
  startSide?: 'LEFT' | 'RIGHT' | null;
  originalLine?: number;
  originalStartLine?: number | null;
  side?: 'LEFT' | 'RIGHT';

  // 커밋 정보
  commitId?: string;
  originalCommitId?: string;

  // 위치 정보
  position?: number | null;
  originalPosition?: number;

  // 리뷰 정보
  pullRequestReviewId?: number;
  subjectType?: string;

  // GitHub 링크
  htmlUrl?: string;
  url?: string;
  pullRequestUrl?: string;

  // 작성자 상세 정보
  userInfo?: GitHubUserInfo;
  authorAssociation?: string;

  // 리액션
  reactions?: CommentReactions;

  // 사용자의 리액션 상태 (로컬 전용, on/off 토글 추적)
  userReactions?: Set<string>;
}

export interface CommentStorage {
  version: string;
  comments: {
    [filePath: string]: ReviewComment[];
  };
}

// Pending Review 관리
export interface PendingReview {
  prNumber: number;
  comments: ReviewComment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PendingReviewStorage {
  version: string;
  reviews: {
    [prNumber: string]: PendingReview;
  };
}

// PR Information Types
export interface PRInfo {
  number: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  author: string;
  createdAt: string;
  updatedAt: string;
  baseBranch: string;
  headBranch: string;
  url: string;
  body?: string;
}

export interface PRFileChange {
  path: string;
  status: 'added' | 'modified' | 'removed' | 'renamed';
  additions: number;
  deletions: number;
  changes: number;
  previousPath?: string;
}

export interface PRCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
}

export interface PRDetails extends PRInfo {
  files: PRFileChange[];
  commits: PRCommit[];
  stats: {
    totalFiles: number;
    totalAdditions: number;
    totalDeletions: number;
    totalCommits: number;
  };
}