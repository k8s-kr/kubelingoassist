import * as cp from 'child_process';
import { promisify } from 'util';
import * as vscode from 'vscode';

const exec = promisify(cp.exec);

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

export interface GitHubUser {
    login: string;
    id: number;
    nodeId: string;
    avatarUrl: string;
    htmlUrl: string;
    type: string;
    siteAdmin: boolean;
}

export interface Reactions {
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

export interface PRReviewComment {
    id: number;
    nodeId: string;
    path: string;
    line: number | null;
    body: string;
    user: GitHubUser;
    createdAt: string;
    updatedAt: string;
    diffHunk: string;

    startLine: number | null;
    startSide: 'LEFT' | 'RIGHT' | null;
    originalLine?: number;
    originalStartLine: number | null;
    side: 'LEFT' | 'RIGHT';
    commitId: string;
    originalCommitId: string;
    position: number | null;
    originalPosition: number;
    pullRequestReviewId: number;
    subjectType: string;
    htmlUrl: string;
    url: string;
    pullRequestUrl: string;
    authorAssociation: string;
    reactions: Reactions;
}

export class PRInfoService {
    private getWorkspaceRoot(): string | undefined {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return undefined;
        }
        return workspaceFolders[0].uri.fsPath;
    }

    async isGHInstalled(): Promise<boolean> {
        try {
            await exec('gh --version');
            return true;
        } catch {
            return false;
        }
    }

    async isGHAuthenticated(): Promise<boolean> {
        try {
            const cwd = this.getWorkspaceRoot();
            await exec('gh auth status', { cwd });
            return true;
        } catch {
            return false;
        }
    }

    async getParentRepo(): Promise<string | null> {
        try {
            const cwd = this.getWorkspaceRoot();
            const { stdout } = await exec('gh repo view --json isFork,parent', { cwd });
            const data = JSON.parse(stdout);

            if (data.isFork && data.parent) {
                return `${data.parent.owner.login}/${data.parent.name}`;
            }
            return null;
        } catch (error) {
            console.error('Failed to check if repo is fork:', error);
            return null;
        }
    }

    async getTargetRepo(): Promise<string | null> {
        const parentRepo = await this.getParentRepo();
        if (parentRepo) {
            console.log(`Detected fork, using parent repo: ${parentRepo}`);
            return parentRepo;
        }
        console.log('Using current repository');
        return null;
    }

    async getPRInfo(prNumber: number, targetRepo?: string): Promise<PRInfo | null> {
        try {
            if (!targetRepo) {
                targetRepo = await this.getTargetRepo() || undefined;
            }

            const cwd = this.getWorkspaceRoot();
            const repoOption = targetRepo ? `--repo ${targetRepo}` : '';
            const command = `gh pr view ${prNumber} ${repoOption} --json number,title,state,author,createdAt,updatedAt,baseRefName,headRefName,url,body`;

            console.log(`Executing: ${command}`);

            const { stdout, stderr } = await exec(command, { cwd });

            if (stderr) {
                console.error(`gh CLI stderr:`, stderr);
            }

            const data = JSON.parse(stdout);

            return {
                number: data.number,
                title: data.title,
                state: data.state.toLowerCase() as 'open' | 'closed' | 'merged',
                author: data.author?.login || 'unknown',
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
                baseBranch: data.baseRefName,
                headBranch: data.headRefName,
                url: data.url,
                body: data.body
            };
        } catch (error: any) {
            console.error(`Failed to fetch PR #${prNumber}:`, error);
            console.error(`Error message:`, error.message);
            console.error(`stderr:`, error.stderr);
            throw error;
        }
    }

    async getPRFiles(prNumber: number, targetRepo?: string): Promise<PRFileChange[]> {
        try {
            if (!targetRepo) {
                targetRepo = await this.getTargetRepo() || undefined;
            }

            const cwd = this.getWorkspaceRoot();
            const repoOption = targetRepo ? `--repo ${targetRepo}` : '';
            const { stdout } = await exec(
                `gh pr view ${prNumber} ${repoOption} --json files`,
                { cwd }
            );

            const data = JSON.parse(stdout);

            if (!data.files || !Array.isArray(data.files)) {
                return [];
            }

            return data.files.map((file: any) => {
                const status = file.changeType?.toLowerCase() || 'modified';
                let normalizedStatus: 'added' | 'modified' | 'removed' | 'renamed' = 'modified';
                if (status.includes('add')) normalizedStatus = 'added';
                else if (status.includes('delet') || status.includes('remov')) normalizedStatus = 'removed';
                else if (status.includes('renam')) normalizedStatus = 'renamed';

                return {
                    path: file.path,
                    status: normalizedStatus,
                    additions: file.additions || 0,
                    deletions: file.deletions || 0,
                    changes: (file.additions || 0) + (file.deletions || 0),
                    previousPath: file.previousPath
                };
            });
        } catch (error) {
            console.error(`Failed to fetch files for PR #${prNumber}:`, error);
            return [];
        }
    }

    async getPRCommits(prNumber: number, targetRepo?: string): Promise<PRCommit[]> {
        try {
            if (!targetRepo) {
                targetRepo = await this.getTargetRepo() || undefined;
            }

            const cwd = this.getWorkspaceRoot();
            const repoOption = targetRepo ? `--repo ${targetRepo}` : '';
            const { stdout } = await exec(
                `gh pr view ${prNumber} ${repoOption} --json commits`,
                { cwd }
            );

            const data = JSON.parse(stdout);

            if (!data.commits || !Array.isArray(data.commits)) {
                return [];
            }

            return data.commits.map((commit: any) => ({
                sha: commit.oid,
                message: commit.messageHeadline,
                author: commit.authors?.[0]?.login || commit.committer?.name || 'unknown',
                date: commit.committedDate
            }));
        } catch (error) {
            console.error(`Failed to fetch commits for PR #${prNumber}:`, error);
            return [];
        }
    }

    async getPRDetails(prNumber: number): Promise<PRDetails | null> {
        try {
            const targetRepo = await this.getTargetRepo() || undefined;

            const [info, files, commits] = await Promise.all([
                this.getPRInfo(prNumber, targetRepo),
                this.getPRFiles(prNumber, targetRepo),
                this.getPRCommits(prNumber, targetRepo)
            ]);

            if (!info) {
                return null;
            }

            const stats = {
                totalFiles: files.length,
                totalAdditions: files.reduce((sum, f) => sum + f.additions, 0),
                totalDeletions: files.reduce((sum, f) => sum + f.deletions, 0),
                totalCommits: commits.length
            };

            return {
                ...info,
                files,
                commits,
                stats
            };
        } catch (error) {
            console.error(`Failed to fetch PR details for #${prNumber}:`, error);
            return null;
        }
    }

    async getCurrentPRNumber(): Promise<number | null> {
        const cwd = this.getWorkspaceRoot();

        // Try current repository first
        try {
            const { stdout } = await exec('gh pr view --json number -q .number', { cwd });
            const prNumber = parseInt(stdout.trim());
            if (!isNaN(prNumber)) {
                console.log(`Found PR #${prNumber} in current repository`);
                return prNumber;
            }
        } catch {
            console.log('No PR found in current repository, checking parent...');
        }

        // Try parent repository if this is a fork
        const parentRepo = await this.getParentRepo();
        if (!parentRepo) {
            return null;
        }

        try {
            const { stdout } = await exec(`gh pr view --repo ${parentRepo} --json number -q .number`, { cwd });
            const prNumber = parseInt(stdout.trim());
            if (!isNaN(prNumber)) {
                console.log(`Found PR #${prNumber} in parent repository: ${parentRepo}`);
                return prNumber;
            }
        } catch {
            console.log('No PR found in parent repository');
        }

        return null;
    }

    async getFileDiff(prNumber: number, filePath: string, targetRepo?: string): Promise<string | null> {
        try {
            if (!targetRepo) {
                targetRepo = await this.getTargetRepo() || undefined;
            }

            const cwd = this.getWorkspaceRoot();
            const repoOption = targetRepo ? `--repo ${targetRepo}` : '';
            const { stdout } = await exec(
                `gh pr diff ${prNumber} ${repoOption} -- "${filePath}"`,
                { cwd }
            );
            return stdout;
        } catch (error) {
            console.error(`Failed to get diff for ${filePath} in PR #${prNumber}:`, error);
            return null;
        }
    }

    async getPRComments(prNumber: number, targetRepo?: string): Promise<PRReviewComment[]> {
        try {
            if (!targetRepo) {
                targetRepo = await this.getTargetRepo() || undefined;
            }

            const cwd = this.getWorkspaceRoot();
            const repoOption = targetRepo ? `--repo ${targetRepo}` : '';
            const { stdout } = await exec(
                `gh api repos/{owner}/{repo}/pulls/${prNumber}/comments ${repoOption}`,
                { cwd }
            );

            const comments = JSON.parse(stdout);

            return comments.map((comment: any) => ({
                id: comment.id,
                nodeId: comment.node_id,
                path: comment.path,
                line: comment.line,
                body: comment.body,
                user: {
                    login: comment.user?.login || 'unknown',
                    id: comment.user?.id || 0,
                    nodeId: comment.user?.node_id || '',
                    avatarUrl: comment.user?.avatar_url || '',
                    htmlUrl: comment.user?.html_url || '',
                    type: comment.user?.type || 'User',
                    siteAdmin: comment.user?.site_admin || false
                },
                createdAt: comment.created_at,
                updatedAt: comment.updated_at,
                diffHunk: comment.diff_hunk || '',
                startLine: comment.start_line,
                startSide: comment.start_side,
                originalLine: comment.original_line,
                originalStartLine: comment.original_start_line,
                side: comment.side === 'LEFT' ? 'LEFT' : 'RIGHT',
                commitId: comment.commit_id,
                originalCommitId: comment.original_commit_id,
                position: comment.position,
                originalPosition: comment.original_position,
                pullRequestReviewId: comment.pull_request_review_id,
                subjectType: comment.subject_type || 'line',
                htmlUrl: comment.html_url,
                url: comment.url,
                pullRequestUrl: comment.pull_request_url,
                authorAssociation: comment.author_association,
                reactions: {
                    plusOne: comment.reactions?.['+1'] || 0,
                    minusOne: comment.reactions?.['-1'] || 0,
                    laugh: comment.reactions?.laugh || 0,
                    confused: comment.reactions?.confused || 0,
                    heart: comment.reactions?.heart || 0,
                    hooray: comment.reactions?.hooray || 0,
                    rocket: comment.reactions?.rocket || 0,
                    eyes: comment.reactions?.eyes || 0,
                    totalCount: comment.reactions?.total_count || 0,
                    url: comment.reactions?.url || ''
                }
            }));
        } catch (error) {
            console.error(`Failed to fetch comments for PR #${prNumber}:`, error);
            return [];
        }
    }

    filterTranslationFiles(files: PRFileChange[], lang: string = 'all'): PRFileChange[] {
        if (lang === 'all') {
            return files.filter(file => {
                const path = file.path.toLowerCase();
                const langMatch = path.match(/\/content\/([^/]+)\//);
                if (langMatch) {
                    const detectedLang = langMatch[1];
                    return detectedLang !== 'en' && (
                        path.includes(`content/${detectedLang}/`) ||
                        path.includes(`i18n/${detectedLang}/`)
                    );
                }
                const i18nMatch = path.match(/\/i18n\/([^/]+)\//);
                if (i18nMatch) {
                    const detectedLang = i18nMatch[1];
                    return detectedLang !== 'en';
                }
                return false;
            });
        }

        return files.filter(file => {
            const path = file.path.toLowerCase();
            return path.includes(`content/${lang}/`) ||
                   path.includes(`i18n/${lang}/`) ||
                   path.includes(`/${lang}/`) ||
                   path.match(new RegExp(`[/_]${lang}[/_]`));
        });
    }

    filterMarkdownFiles(files: PRFileChange[]): PRFileChange[] {
        return files.filter(file => file.path.endsWith('.md'));
    }

    getReviewableFiles(files: PRFileChange[], lang: string = 'all'): PRFileChange[] {
        return this.filterMarkdownFiles(
            this.filterTranslationFiles(files, lang)
        );
    }

    async prExists(prNumber: number): Promise<boolean> {
        const info = await this.getPRInfo(prNumber);
        return info !== null;
    }

    async checkoutPR(prNumber: number, prTitle: string, targetRepo?: string): Promise<void> {
        try {
            const cwd = this.getWorkspaceRoot();

            if (!targetRepo) {
                targetRepo = await this.getTargetRepo() || undefined;
            }

            const titleSlug = prTitle.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
            const branchName = `pr-${prNumber}/${titleSlug}`;
            const repoOption = targetRepo ? `--repo ${targetRepo}` : '';

            let branchExists = false;
            try {
                await exec(`git rev-parse --verify ${branchName}`, { cwd });
                branchExists = true;
            } catch {
                branchExists = false;
            }

            if (branchExists) {
                console.log(`Branch ${branchName} already exists, checking out and pulling latest changes...`);
                await exec(`git checkout ${branchName}`, { cwd });
                await exec(`git pull`, { cwd });
            } else {
                await exec(`gh pr checkout ${prNumber} ${repoOption} -b ${branchName}`, { cwd });
            }
        } catch (error) {
            console.error(`Failed to checkout PR #${prNumber}:`, error);
            throw error;
        }
    }

    async listRecentPRs(limit: number = 10, state: 'open' | 'closed' | 'merged' | 'all' = 'all', targetRepo?: string): Promise<PRInfo[]> {
        try {
            if (!targetRepo) {
                targetRepo = await this.getTargetRepo() || undefined;
            }

            const cwd = this.getWorkspaceRoot();
            const repoOption = targetRepo ? `--repo ${targetRepo}` : '';
            const { stdout } = await exec(
                `gh pr list --limit ${limit} --state ${state} ${repoOption} --json number,title,state,author,createdAt,updatedAt,baseRefName,headRefName,url`,
                { cwd }
            );

            const data = JSON.parse(stdout);

            return data.map((pr: any) => ({
                number: pr.number,
                title: pr.title,
                state: pr.state.toLowerCase(),
                author: pr.author?.login || 'unknown',
                createdAt: pr.createdAt,
                updatedAt: pr.updatedAt,
                baseBranch: pr.baseRefName,
                headBranch: pr.headRefName,
                url: pr.url
            }));
        } catch (error) {
            console.error('Failed to list PRs:', error);
            return [];
        }
    }
}
