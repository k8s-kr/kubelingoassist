import * as cp from 'child_process';
import { promisify } from 'util';
import * as vscode from 'vscode';

const exec = promisify(cp.exec);

/**
 * PR 기본 정보
 */
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

/**
 * PR에서 변경된 파일 정보
 */
export interface PRFileChange {
    path: string;
    status: 'added' | 'modified' | 'removed' | 'renamed';
    additions: number;
    deletions: number;
    changes: number;
    previousPath?: string; // renamed일 경우 이전 경로
}

/**
 * PR의 커밋 정보
 */
export interface PRCommit {
    sha: string;
    message: string;
    author: string;
    date: string;
}

/**
 * PR 상세 정보 (파일, 커밋 포함)
 */
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

/**
 * GitHub 사용자 정보
 */
export interface GitHubUser {
    login: string;
    id: number;
    nodeId: string;
    avatarUrl: string;
    htmlUrl: string;
    type: string;
    siteAdmin: boolean;
}

/**
 * 리액션 정보
 */
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

/**
 * PR 리뷰 댓글
 */
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

    // 라인 범위 정보 (멀티라인 댓글)
    startLine: number | null;
    startSide: 'LEFT' | 'RIGHT' | null;
    originalLine?: number;
    originalStartLine: number | null;
    side: 'LEFT' | 'RIGHT';

    // 커밋 정보
    commitId: string;
    originalCommitId: string;

    // 위치 정보
    position: number | null;
    originalPosition: number;

    // 리뷰 정보
    pullRequestReviewId: number;
    subjectType: string;

    // GitHub 링크
    htmlUrl: string;
    url: string;
    pullRequestUrl: string;

    // 작성자 권한
    authorAssociation: string;

    // 리액션
    reactions: Reactions;
}

/**
 * PR 정보를 가져오는 서비스
 * gh CLI를 사용하여 PR 정보를 조회합니다
 */
export class PRInfoService {
    /**
     * workspace 루트 경로 가져오기
     */
    private getWorkspaceRoot(): string | undefined {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return undefined;
        }
        return workspaceFolders[0].uri.fsPath;
    }

    /**
     * gh CLI가 설치되어 있는지 확인
     */
    async isGHInstalled(): Promise<boolean> {
        try {
            await exec('gh --version');
            return true;
        } catch {
            return false;
        }
    }

    /**
     * gh CLI 인증 상태 확인
     */
    async isGHAuthenticated(): Promise<boolean> {
        try {
            const cwd = this.getWorkspaceRoot();
            await exec('gh auth status', { cwd });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 현재 저장소가 fork인지 확인하고 parent 저장소 정보 반환
     */
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

    /**
     * PR을 가져올 저장소 결정 (fork인 경우 parent 저장소)
     */
    async getTargetRepo(): Promise<string | null> {
        // gh CLI로 fork 감지 및 parent 저장소 확인
        const parentRepo = await this.getParentRepo();
        if (parentRepo) {
            console.log(`Detected fork, using parent repo: ${parentRepo}`);
            return parentRepo;
        }

        // 현재 저장소 사용 (null 반환 = --repo 옵션 없음)
        console.log('Using current repository');
        return null;
    }

    /**
     * PR 기본 정보 가져오기
     */
    async getPRInfo(prNumber: number, targetRepo?: string): Promise<PRInfo | null> {
        try {
            // 저장소 자동 감지
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
            throw error; // 에러를 다시 throw해서 상위에서 처리
        }
    }

    /**
     * PR에서 변경된 파일 목록 가져오기
     */
    async getPRFiles(prNumber: number, targetRepo?: string): Promise<PRFileChange[]> {
        try {
            // 저장소 자동 감지
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

            return data.files.map((file: any) => ({
                path: file.path,
                status: this._normalizeStatus(file.changeType || 'modified'),
                additions: file.additions || 0,
                deletions: file.deletions || 0,
                changes: (file.additions || 0) + (file.deletions || 0),
                previousPath: file.previousPath
            }));
        } catch (error) {
            console.error(`Failed to fetch files for PR #${prNumber}:`, error);
            return [];
        }
    }

    /**
     * PR의 커밋 목록 가져오기
     */
    async getPRCommits(prNumber: number, targetRepo?: string): Promise<PRCommit[]> {
        try {
            // 저장소 자동 감지
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

    /**
     * PR 상세 정보 가져오기 (파일, 커밋, 통계 모두 포함)
     */
    async getPRDetails(prNumber: number): Promise<PRDetails | null> {
        try {
            // 저장소를 한 번만 감지해서 재사용
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

    /**
     * 현재 브랜치의 PR 번호 가져오기
     * fork 저장소의 경우 parent 저장소에서도 PR을 검색합니다
     */
    async getCurrentPRNumber(): Promise<number | null> {
        try {
            const cwd = this.getWorkspaceRoot();

            // 먼저 현재 저장소에서 PR 검색
            try {
                const { stdout } = await exec('gh pr view --json number -q .number', { cwd });
                const prNumber = parseInt(stdout.trim());
                if (!isNaN(prNumber)) {
                    console.log(`Found PR #${prNumber} in current repository`);
                    return prNumber;
                }
            } catch (error) {
                console.log('No PR found in current repository, checking parent...');
            }

            // fork인 경우 parent 저장소에서 검색
            const parentRepo = await this.getParentRepo();
            if (parentRepo) {
                try {
                    const { stdout } = await exec(
                        `gh pr view --repo ${parentRepo} --json number -q .number`,
                        { cwd }
                    );
                    const prNumber = parseInt(stdout.trim());
                    if (!isNaN(prNumber)) {
                        console.log(`Found PR #${prNumber} in parent repository: ${parentRepo}`);
                        return prNumber;
                    }
                } catch (error) {
                    console.error('No PR found in parent repository:', error);
                }
            }

            return null;
        } catch (error) {
            console.error('Failed to get current PR number:', error);
            return null;
        }
    }

    /**
     * 특정 파일의 변경 내용 가져오기 (diff)
     */
    async getFileDiff(prNumber: number, filePath: string, targetRepo?: string): Promise<string | null> {
        try {
            // 저장소 자동 감지
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

    /**
     * PR 리뷰 댓글 가져오기
     */
    async getPRComments(prNumber: number, targetRepo?: string): Promise<PRReviewComment[]> {
        try {
            // 저장소 자동 감지
            if (!targetRepo) {
                targetRepo = await this.getTargetRepo() || undefined;
            }

            const cwd = this.getWorkspaceRoot();
            const repoOption = targetRepo ? `--repo ${targetRepo}` : '';

            // gh pr view로 리뷰 댓글 가져오기
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

                // 라인 범위 정보
                startLine: comment.start_line,
                startSide: comment.start_side,
                originalLine: comment.original_line,
                originalStartLine: comment.original_start_line,
                side: comment.side === 'LEFT' ? 'LEFT' : 'RIGHT',

                // 커밋 정보
                commitId: comment.commit_id,
                originalCommitId: comment.original_commit_id,

                // 위치 정보
                position: comment.position,
                originalPosition: comment.original_position,

                // 리뷰 정보
                pullRequestReviewId: comment.pull_request_review_id,
                subjectType: comment.subject_type || 'line',

                // GitHub 링크
                htmlUrl: comment.html_url,
                url: comment.url,
                pullRequestUrl: comment.pull_request_url,

                // 작성자 권한
                authorAssociation: comment.author_association,

                // 리액션
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

    /**
     * PR의 번역 파일만 필터링
     */
    filterTranslationFiles(files: PRFileChange[], lang: string = 'ko'): PRFileChange[] {
        return files.filter(file => {
            const path = file.path.toLowerCase();
            // content/ko/ 또는 /content/ko/ 패턴
            return path.includes(`content/${lang}/`) ||
                   path.includes(`i18n/${lang}/`) ||
                   path.includes(`/${lang}/`) || // 더 넓은 범위
                   path.match(new RegExp(`[/_]${lang}[/_]`)); // _ko_ 또는 /ko/ 패턴
        });
    }

    /**
     * 마크다운 파일만 필터링
     */
    filterMarkdownFiles(files: PRFileChange[]): PRFileChange[] {
        return files.filter(file => file.path.endsWith('.md'));
    }

    /**
     * PR에서 리뷰가 필요한 파일 추천
     * (번역 파일 중 마크다운만)
     */
    getReviewableFiles(files: PRFileChange[], lang: string = 'ko'): PRFileChange[] {
        return this.filterMarkdownFiles(
            this.filterTranslationFiles(files, lang)
        );
    }

    /**
     * GitHub 파일 상태를 표준 상태로 변환
     */
    private _normalizeStatus(status: string): 'added' | 'modified' | 'removed' | 'renamed' {
        const lowerStatus = status.toLowerCase();

        if (lowerStatus.includes('add')) return 'added';
        if (lowerStatus.includes('modif') || lowerStatus.includes('change')) return 'modified';
        if (lowerStatus.includes('delet') || lowerStatus.includes('remov')) return 'removed';
        if (lowerStatus.includes('renam')) return 'renamed';

        return 'modified'; // default
    }

    /**
     * PR이 존재하는지 확인
     */
    async prExists(prNumber: number): Promise<boolean> {
        const info = await this.getPRInfo(prNumber);
        return info !== null;
    }

    /**
     * PR 제목을 slug로 변환
     */
    private titleToSlug(title: string): string {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9가-힣]+/g, '-') // 영문, 숫자, 한글 외 문자를 하이픈으로
            .replace(/^-+|-+$/g, '') // 앞뒤 하이픈 제거
            .replace(/-+/g, '-') // 연속된 하이픈을 하나로
            .slice(0, 50); // 최대 50자로 제한
    }

    /**
     * PR 브랜치로 checkout (브랜치명: pr-<number>/<title-slug>)
     */
    async checkoutPR(prNumber: number, prTitle: string, targetRepo?: string): Promise<void> {
        try {
            const cwd = this.getWorkspaceRoot();

            // 저장소 자동 감지
            if (!targetRepo) {
                targetRepo = await this.getTargetRepo() || undefined;
            }

            const titleSlug = this.titleToSlug(prTitle);
            const branchName = `pr-${prNumber}/${titleSlug}`;

            const repoOption = targetRepo ? `--repo ${targetRepo}` : '';

            // 로컬에 브랜치가 이미 있는지 확인
            let branchExists = false;
            try {
                await exec(`git rev-parse --verify ${branchName}`, { cwd });
                branchExists = true;
            } catch {
                branchExists = false;
            }

            if (branchExists) {
                // 이미 있으면 checkout하고 최신 업데이트
                console.log(`Branch ${branchName} already exists, checking out and pulling latest changes...`);
                await exec(`git checkout ${branchName}`, { cwd });
                await exec(`git pull`, { cwd });
            } else {
                // 없으면 새로 생성
                await exec(`gh pr checkout ${prNumber} ${repoOption} -b ${branchName}`, { cwd });
            }
        } catch (error) {
            console.error(`Failed to checkout PR #${prNumber}:`, error);
            throw error;
        }
    }

    /**
     * PR 목록 가져오기 (최근 N개)
     */
    async listRecentPRs(limit: number = 10, state: 'open' | 'closed' | 'merged' | 'all' = 'all', targetRepo?: string): Promise<PRInfo[]> {
        try {
            // 저장소 자동 감지
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
