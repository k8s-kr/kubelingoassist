import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import { GitCommandExecutor } from './GitCommandExecutor';

export class GitRepositoryDetector {
  constructor(
    private workspaceRoot: string,
    private commandExecutor: GitCommandExecutor
  ) {}

  findGitRepository(): string {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      throw new Error('No workspace folder found');
    }

    for (const workspace of workspaceFolders) {
      try {
        cp.execSync('git status', {
          cwd: workspace.uri.fsPath,
          stdio: 'ignore',
        });
        return workspace.uri.fsPath;
      } catch (error) {
        continue;
      }
    }

    return workspaceFolders[0].uri.fsPath;
  }

  async isGitRepository(): Promise<boolean> {
    return this.commandExecutor.checkGitStatus();
  }

  async isKubernetesWebsiteRepository(): Promise<boolean> {
    try {
      if (await this.checkRemoteUrl()) {
        return true;
      }
      if (await this.checkDistinctiveFiles()) {
        return true;
      }
      if (await this.checkContentStructure()) {
        return true;
      }
      if (await this.checkPackageJson()) {
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking if repository is kubernetes/website:', error);
      return false;
    }
  }

  private async checkRemoteUrl(): Promise<boolean> {
    try {
      const remoteUrl = await this.commandExecutor.getRemoteUrl();
      return remoteUrl.includes('kubernetes/website');
    } catch {
      return false;
    }
  }

  private async checkDistinctiveFiles(): Promise<boolean> {
    const distinctiveFiles = [
      'hugo.toml',
      'netlify.toml',
      'api-ref-assets',
      'update-imported-docs',
    ];

    for (const file of distinctiveFiles) {
      try {
        await fs.access(path.join(this.workspaceRoot, file));
        return true;
      } catch {
        continue;
      }
    }
    return false;
  }

  private async checkContentStructure(): Promise<boolean> {
    try {
      const contentDir = path.join(this.workspaceRoot, 'content');
      await fs.access(contentDir);

      const contentItems = await fs.readdir(contentDir);
      const langDirs = contentItems.filter(
        (item) => item.length === 2 || item === 'en' || item === 'zh-cn' || item === 'pt-br'
      );

      return langDirs.length >= 2;
    } catch {
      return false;
    }
  }

  private async checkPackageJson(): Promise<boolean> {
    try {
      const packageJsonPath = path.join(this.workspaceRoot, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

      if (packageJson.name?.includes('kubernetes')) {
        return true;
      }

      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      return !!(dependencies['@docsy/hugo-base'] || dependencies['hugo-extended']);
    } catch {
      return false;
    }
  }
}
