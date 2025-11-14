import * as cp from 'child_process';
import { promisify } from 'util';
import { ReviewComment, CommentType } from '../../core/types';
import { TranslationCommentController } from './TranslationCommentController';

const exec = promisify(cp.exec);

interface GitHubPRComment {
    id: number;
    path: string;
    line: number;
    body: string;
    user: {
        login: string;
    };
    created_at: string;
}

/**
 * GitHub PR과 VS Code 코멘트를 동기화하는 서비스
 */
export class GitHubReviewSync {
    constructor(private commentController: TranslationCommentController) {}

    /**
     * 현재 브랜치의 PR 번호 가져오기
     */
    async getCurrentPRNumber(): Promise<number | null> {
        try {
            const { stdout } = await exec('gh pr view --json number -q .number');
            const prNumber = parseInt(stdout.trim());
            return isNaN(prNumber) ? null : prNumber;
        } catch (error) {
            console.error('Failed to get current PR number:', error);
            return null;
        }
    }

    /**
     * PR 코멘트를 VS Code로 가져오기
     */
    async syncFromGitHub(prNumber: number): Promise<ReviewComment[]> {
        try {
            const comments = await this.fetchPRComments(prNumber);
            const reviewComments = comments.map(c => this.convertToReviewComment(c));

            // 각 코멘트를 Comment Controller에 추가
            // (실제 구현에서는 문서를 열어서 추가해야 함)

            return reviewComments;
        } catch (error) {
            console.error('Failed to sync comments from GitHub:', error);
            throw error;
        }
    }

    /**
     * VS Code 코멘트를 GitHub PR에 푸시
     */
    async syncToGitHub(comment: ReviewComment, prNumber?: number): Promise<void> {
        try {
            const pr = prNumber || await this.getCurrentPRNumber();
            if (!pr) {
                throw new Error('No PR found for current branch');
            }

            if (comment.type === CommentType.SUGGESTION && comment.suggestion) {
                await this.createSuggestion(pr, comment);
            } else {
                await this.createComment(pr, comment);
            }

            // PR 코멘트 ID 저장
            // (실제로는 생성된 코멘트의 ID를 반환받아 저장해야 함)
        } catch (error) {
            console.error('Failed to sync comment to GitHub:', error);
            throw error;
        }
    }

    /**
     * GitHub에서 PR 코멘트 조회
     */
    private async fetchPRComments(prNumber: number): Promise<GitHubPRComment[]> {
        try {
            const { stdout } = await exec(
                `gh api repos/:owner/:repo/pulls/${prNumber}/comments`
            );
            return JSON.parse(stdout);
        } catch (error) {
            console.error('Failed to fetch PR comments:', error);
            return [];
        }
    }

    /**
     * GitHub PR에 일반 코멘트 작성
     */
    private async createComment(prNumber: number, comment: ReviewComment): Promise<void> {
        const escapedBody = comment.body.replace(/"/g, '\\"').replace(/\n/g, '\\n');

        try {
            await exec(
                `gh pr review ${prNumber} --comment ` +
                `--body "${escapedBody}"`
            );
        } catch (error) {
            console.error('Failed to create comment on GitHub:', error);
            throw error;
        }
    }

    /**
     * GitHub PR에 Suggestion 작성
     */
    private async createSuggestion(prNumber: number, comment: ReviewComment): Promise<void> {
        if (!comment.suggestion) {
            return;
        }

        const suggestionBody =
            `\`\`\`suggestion\n${comment.suggestion.suggested}\n\`\`\`\n\n${comment.body}`;
        const escapedBody = suggestionBody.replace(/"/g, '\\"').replace(/\n/g, '\\n');

        try {
            await exec(
                `gh pr review ${prNumber} --comment ` +
                `--body "${escapedBody}"`
            );
        } catch (error) {
            console.error('Failed to create suggestion on GitHub:', error);
            throw error;
        }
    }

    /**
     * GitHub PR 코멘트를 ReviewComment로 변환
     */
    private convertToReviewComment(ghComment: GitHubPRComment): ReviewComment {
        // Suggestion 형식인지 확인
        const suggestionMatch = ghComment.body.match(/```suggestion\n(.*?)\n```/s);
        const suggestion = suggestionMatch ? {
            original: '',  // GitHub API에서는 원본을 직접 가져올 수 없음
            suggested: suggestionMatch[1]
        } : undefined;

        const bodyWithoutSuggestion = suggestion
            ? ghComment.body.replace(/```suggestion\n.*?\n```\n\n/s, '')
            : ghComment.body;

        return {
            id: `gh-${ghComment.id}`,
            filePath: ghComment.path,
            author: ghComment.user.login,
            body: bodyWithoutSuggestion,
            type: suggestion ? CommentType.SUGGESTION : CommentType.GENERAL,
            lineNumber: ghComment.line,
            createdAt: new Date(ghComment.created_at),
            resolved: false,
            suggestion,
            replies: [],
            prCommentId: ghComment.id
        };
    }

    /**
     * GitHub에서 코멘트 해결 (실제 GitHub API는 thread resolve를 지원하지 않으므로 주석 추가)
     */
    async resolveOnGitHub(commentId: string, prNumber?: number): Promise<void> {
        // GitHub API에서는 개별 코멘트 해결 기능이 제한적이므로
        // 답글로 "Resolved" 표시를 추가하는 방식으로 구현
        try {
            const pr = prNumber || await this.getCurrentPRNumber();
            if (!pr) {
                return;
            }

            // 실제 구현에서는 코멘트에 답글을 달아 해결 표시
            console.log(`Comment ${commentId} marked as resolved (would add reply on GitHub)`);
        } catch (error) {
            console.error('Failed to resolve comment on GitHub:', error);
        }
    }

    /**
     * 동기화되지 않은 코멘트들을 GitHub에 일괄 푸시
     */
    async pushAllToGitHub(prNumber?: number, reviewEvent?: 'APPROVE' | 'COMMENT' | 'REQUEST_CHANGES'): Promise<number> {
        const unresolvedComments = this.commentController.getUnresolvedComments();
        const unsyncedComments = unresolvedComments.filter(c => !c.prCommentId);

        // 리뷰 이벤트가 있으면 gh pr review 사용
        if (reviewEvent && prNumber) {
            return await this.submitReview(prNumber, unsyncedComments, reviewEvent);
        }

        // 없으면 개별 댓글로 푸시
        let successCount = 0;
        for (const comment of unsyncedComments) {
            try {
                await this.syncToGitHub(comment, prNumber);
                successCount++;
            } catch (error) {
                console.error(`Failed to sync comment ${comment.id}:`, error);
            }
        }

        return successCount;
    }

    /**
     * gh pr review로 리뷰 제출 (approve/comment/request-changes)
     */
    private async submitReview(
        prNumber: number,
        comments: any[],
        event: 'APPROVE' | 'COMMENT' | 'REQUEST_CHANGES'
    ): Promise<number> {
        try {
            const vscode = await import('vscode');
            const cp = await import('child_process');
            const { promisify } = await import('util');
            const exec = promisify(cp.exec);

            // workspace 루트 가져오기
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                throw new Error('No workspace folder found');
            }

            const cwd = workspaceFolder.uri.fsPath;

            // gh pr review 명령어 구성
            const eventFlag = event === 'APPROVE' ? '--approve' :
                            event === 'REQUEST_CHANGES' ? '--request-changes' :
                            '--comment';

            // 댓글이 있으면 파일별로 정리
            const commentArgs: string[] = [];
            for (const comment of comments) {
                if (comment.filePath && comment.lineNumber) {
                    commentArgs.push(`--body-file`, `/dev/stdin`);
                    // TODO: 실제로는 임시 파일을 만들어서 댓글 내용 저장해야 함
                }
            }

            // 일단 간단하게 리뷰만 제출
            await exec(`gh pr review ${prNumber} ${eventFlag}`, { cwd });

            return comments.length;
        } catch (error) {
            console.error('Failed to submit review:', error);
            throw error;
        }
    }
}
