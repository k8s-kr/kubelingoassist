export interface TranslationState {
  isSyncScrollEnabled: boolean;
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
  outdated: boolean;
  suggestion?: ReviewCommentSuggestion;
  replies: ReviewComment[];
  prCommentId?: number;
  isPending: boolean;
  isLocalOnly: boolean;
  nodeId?: string;
  updatedAt?: Date;
  diffHunk?: string;
  startLine?: number | null;
  startSide?: 'LEFT' | 'RIGHT' | null;
  originalLine?: number;
  originalStartLine?: number | null;
  side?: 'LEFT' | 'RIGHT';
  commitId?: string;
  originalCommitId?: string;
  position?: number | null;
  originalPosition?: number;
  pullRequestReviewId?: number;
  subjectType?: string;
  htmlUrl?: string;
  url?: string;
  pullRequestUrl?: string;
  userInfo?: GitHubUserInfo;
  authorAssociation?: string;
  reactions?: CommentReactions;
  userReactions?: Set<string>;
}

export interface CommentStorage {
  version: string;
  comments: {
    [filePath: string]: ReviewComment[];
  };
}

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