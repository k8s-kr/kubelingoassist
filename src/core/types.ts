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

export interface ReviewComment {
  id: string;
  filePath: string;
  author: string;
  body: string;
  type: CommentType;
  lineNumber: number;
  createdAt: Date;
  resolved: boolean;
  suggestion?: ReviewCommentSuggestion;
  replies: ReviewComment[];
  prCommentId?: number;
}

export interface CommentStorage {
  version: string;
  comments: {
    [filePath: string]: ReviewComment[];
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