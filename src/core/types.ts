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
