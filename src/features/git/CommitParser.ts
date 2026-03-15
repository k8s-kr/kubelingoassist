import { CommitFile } from '../../core/types';

export class CommitParser {
  parseCommitInfo(
    stdout: string
  ): { hash: string; message: string; author: string; date: string } | null {
    if (!stdout.trim()) {
      return null;
    }

    const lines = stdout.split('\n');
    const [hash, message, author, date] = lines[0].split('|');
    return { hash, message, author, date };
  }

  parseChangedFiles(stdout: string): CommitFile[] {
    const lines = stdout.split('\n').filter((line) => line.trim());
    const files: CommitFile[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) {
        continue;
      }

      const parts = trimmedLine.split('\t');
      if (parts.length >= 2) {
        const status = parts[0].charAt(0) as 'M' | 'A' | 'D' | 'R' | 'C';
        const path = parts[1];
        const originalPath = parts[2];

        files.push({ path, status, originalPath });
      }
    }

    return files;
  }

  parseMultipleCommits(
    stdout: string
  ): Array<{ hash: string; message: string; author: string; date: string }> {
    if (!stdout.trim()) {
      return [];
    }

    return stdout
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => {
        const [hash, message, author, date] = line.split('|');
        return { hash, message, author, date };
      });
  }
}
