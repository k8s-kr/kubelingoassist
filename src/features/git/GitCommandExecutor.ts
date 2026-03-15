import * as cp from 'child_process';
import { promisify } from 'util';

const exec = promisify(cp.exec);

abstract class GitCommand {
  constructor(protected workspaceRoot: string) {}

  protected async executeCommand(command: string): Promise<string> {
    try {
      const { stdout } = await exec(command, { cwd: this.workspaceRoot });
      return stdout;
    } catch (error) {
      throw new Error(`Git command failed: ${command}. Error: ${error}`);
    }
  }
}

export class GitCommandExecutor extends GitCommand {
  async getCommitInfo(commitHash?: string): Promise<string> {
    const command = commitHash
      ? `git show --pretty=format:"%H|%s|%an|%ad" --date=short ${commitHash}`
      : 'git log -1 --pretty=format:"%H|%s|%an|%ad" --date=short';
    return this.executeCommand(command);
  }

  async getChangedFilesInCommit(commitHash: string): Promise<string> {
    return this.executeCommand(`git show --name-status --pretty= ${commitHash}`);
  }

  async getChangedFilesSinceCommit(commitHash: string): Promise<string> {
    return this.executeCommand(`git diff --name-status ${commitHash}..HEAD`);
  }

  async getCurrentBranch(): Promise<string> {
    return this.executeCommand('git branch --show-current');
  }

  async checkGitStatus(): Promise<boolean> {
    try {
      await this.executeCommand('git status');
      return true;
    } catch {
      return false;
    }
  }

  async getRemoteUrl(): Promise<string> {
    return this.executeCommand('git remote get-url origin');
  }

  async getRecentCommits(limit: number): Promise<string> {
    return this.executeCommand(`git log -${limit} --pretty=format:"%H|%s|%an|%ad" --date=short`);
  }
}
