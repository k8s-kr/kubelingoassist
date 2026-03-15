import { CommitInfo, CommitFile } from '../../core/types';
import { GitCommandExecutor } from './GitCommandExecutor';
import { GitRepositoryDetector } from './GitRepositoryDetector';
import { CommitParser } from './CommitParser';
import { FilePathResolver, GitChangedFile } from './FilePathResolver';

export class GitService {
  private workspaceRoot: string;
  private commandExecutor: GitCommandExecutor;
  private repositoryDetector: GitRepositoryDetector;
  private commitParser: CommitParser;
  private filePathResolver: FilePathResolver;

  constructor() {
    this.workspaceRoot = this.initializeWorkspaceRoot();
    this.commandExecutor = new GitCommandExecutor(this.workspaceRoot);
    this.repositoryDetector = new GitRepositoryDetector(this.workspaceRoot, this.commandExecutor);
    this.commitParser = new CommitParser();
    this.filePathResolver = new FilePathResolver(this.workspaceRoot);
  }

  private initializeWorkspaceRoot(): string {
    const tempDetector = new GitRepositoryDetector('', new GitCommandExecutor(''));
    return tempDetector.findGitRepository();
  }

  async getRecentCommit(): Promise<CommitInfo | null> {
    return this.getCommitInfo();
  }

  async getCommitInfo(commitHash?: string): Promise<CommitInfo | null> {
    try {
      const stdout = await this.commandExecutor.getCommitInfo(commitHash);
      const parsedInfo = this.commitParser.parseCommitInfo(stdout);

      if (!parsedInfo) {
        return null;
      }

      const files = await this.getChangedFilesInCommit(parsedInfo.hash);

      return {
        hash: parsedInfo.hash,
        message: parsedInfo.message,
        author: parsedInfo.author,
        date: parsedInfo.date,
        files,
      };
    } catch (error) {
      console.error(`Failed to get commit info${commitHash ? ` for ${commitHash}` : ''}:`, error);
      return null;
    }
  }

  async getChangedFilesInCommit(commitHash: string) {
    try {
      const stdout = await this.commandExecutor.getChangedFilesInCommit(commitHash);
      return this.commitParser.parseChangedFiles(stdout);
    } catch (error) {
      console.error(`Failed to get changed files for commit ${commitHash}:`, error);
      return [];
    }
  }

  async getChangedFilesSinceCommit(commitHash: string) {
    try {
      const stdout = await this.commandExecutor.getChangedFilesSinceCommit(commitHash);
      return this.commitParser.parseChangedFiles(stdout);
    } catch (error) {
      console.error(`Failed to get changed files since commit ${commitHash}:`, error);
      return [];
    }
  }

  async getCurrentBranch(): Promise<string> {
    try {
      const stdout = await this.commandExecutor.getCurrentBranch();
      return stdout.trim();
    } catch (error) {
      console.error('Failed to get current branch:', error);
      return 'unknown';
    }
  }

  async isGitRepository(): Promise<boolean> {
    return this.repositoryDetector.isGitRepository();
  }

  async isKubernetesWebsiteRepository(): Promise<boolean> {
    return this.repositoryDetector.isKubernetesWebsiteRepository();
  }

  async findCommitsWithTranslationFiles(limit: number = 10): Promise<CommitInfo[]> {
    try {
      const stdout = await this.commandExecutor.getRecentCommits(limit);
      const parsedCommits = this.commitParser.parseMultipleCommits(stdout);

      const commits: CommitInfo[] = [];

      for (const commitData of parsedCommits) {
        const files = await this.getChangedFilesInCommit(commitData.hash);

        if (files.length > 0) {
          commits.push({
            hash: commitData.hash,
            message: commitData.message,
            author: commitData.author,
            date: commitData.date,
            files: files,
          });
        }
      }

      return commits;
    } catch (error) {
      console.error('Failed to find commits with translation files:', error);
      return [];
    }
  }

  filterTranslationFiles(files: CommitFile[]): GitChangedFile[] {
    return this.filePathResolver.filterTranslationFiles(files);
  }

  getOriginalEnglishPath(translationPath: string): string | null {
    return this.filePathResolver.getOriginalEnglishPath(translationPath);
  }
}
