import * as vscode from 'vscode';
import { ReviewComment, CommentType, ReviewCommentSuggestion } from '../../core/types';
import { CommentStorageManager } from './CommentStorageManager';
import { v4 as uuidv4 } from 'uuid';

/**
 * 번역 리뷰 코멘트를 관리하는 컨트롤러
 */
export class TranslationCommentController implements vscode.Disposable {
    private commentController: vscode.CommentController;
    private comments: Map<string, ReviewComment[]> = new Map();
    private commentThreads: Map<string, vscode.CommentThread> = new Map();
    private storageManager: CommentStorageManager;

    constructor() {
        this.storageManager = new CommentStorageManager();

        // Comment Controller 생성
        this.commentController = vscode.comments.createCommentController(
            'kubelingoassist-review',
            'Translation Review'
        );

        // 코멘트 가능한 범위 설정
        this.commentController.commentingRangeProvider = {
            provideCommentingRanges: (document) => {
                // 마크다운 파일에서만 코멘트 가능
                if (document.languageId === 'markdown') {
                    return [new vscode.Range(0, 0, document.lineCount, 0)];
                }
                return [];
            }
        };

        // 저장된 코멘트 로드
        this.loadCommentsFromStorage();
    }

    /**
     * 저장소에서 코멘트 불러오기
     */
    private async loadCommentsFromStorage(): Promise<void> {
        try {
            this.comments = await this.storageManager.loadComments();

            // 현재 열린 에디터에 코멘트 복원
            for (const editor of vscode.window.visibleTextEditors) {
                await this.restoreCommentsForDocument(editor.document);
            }
        } catch (error) {
            console.error('Failed to load comments from storage:', error);
        }
    }

    /**
     * 문서의 코멘트 복원
     */
    private async restoreCommentsForDocument(document: vscode.TextDocument): Promise<void> {
        const filePath = document.uri.fsPath;
        const fileComments = this.comments.get(filePath) || [];

        for (const comment of fileComments) {
            if (!comment.resolved) {
                await this.createCommentThread(document, comment);
            }
        }
    }

    /**
     * 새 코멘트 추가
     */
    async addComment(
        document: vscode.TextDocument,
        range: vscode.Range,
        body: string,
        type: CommentType = CommentType.GENERAL
    ): Promise<ReviewComment> {
        const comment: ReviewComment = {
            id: uuidv4(),
            filePath: document.uri.fsPath,
            author: await this.getCurrentUser(),
            body,
            type,
            lineNumber: range.start.line + 1,
            createdAt: new Date(),
            resolved: false,
            replies: []
        };

        // Comment Thread 생성
        await this.createCommentThread(document, comment);

        // 로컬 저장
        this.addCommentToStore(document.uri.fsPath, comment);
        await this.saveComments();

        return comment;
    }

    /**
     * Suggestion 추가
     */
    async addSuggestion(
        document: vscode.TextDocument,
        range: vscode.Range,
        originalText: string,
        suggestedText: string,
        reason: string
    ): Promise<ReviewComment> {
        const comment: ReviewComment = {
            id: uuidv4(),
            filePath: document.uri.fsPath,
            author: await this.getCurrentUser(),
            body: reason,
            type: CommentType.SUGGESTION,
            lineNumber: range.start.line + 1,
            createdAt: new Date(),
            resolved: false,
            suggestion: {
                original: originalText,
                suggested: suggestedText
            },
            replies: []
        };

        // Suggestion Thread 생성
        await this.createCommentThread(document, comment);

        // 로컬 저장
        this.addCommentToStore(document.uri.fsPath, comment);
        await this.saveComments();

        return comment;
    }

    /**
     * Comment Thread 생성
     */
    private async createCommentThread(
        document: vscode.TextDocument,
        comment: ReviewComment
    ): Promise<vscode.CommentThread> {
        const range = new vscode.Range(
            comment.lineNumber - 1,
            0,
            comment.lineNumber - 1,
            Number.MAX_VALUE
        );

        const thread = this.commentController.createCommentThread(
            document.uri,
            range,
            [this.convertToVSCodeComment(comment)]
        );

        thread.canReply = true;
        thread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;
        thread.contextValue = 'resolvable';
        thread.state = vscode.CommentThreadState.Unresolved;

        // Thread 저장
        this.commentThreads.set(comment.id, thread);

        return thread;
    }

    /**
     * ReviewComment를 VS Code Comment로 변환
     */
    private convertToVSCodeComment(comment: ReviewComment): vscode.Comment {
        return {
            body: this.formatCommentBody(comment),
            mode: vscode.CommentMode.Preview,
            author: { name: comment.author },
            timestamp: comment.createdAt
        };
    }

    /**
     * 코멘트 본문 포맷팅
     */
    private formatCommentBody(comment: ReviewComment): vscode.MarkdownString {
        const md = new vscode.MarkdownString();
        md.isTrusted = true;
        md.supportHtml = true;

        // 타입별 아이콘
        const icon = this.getCommentIcon(comment.type);
        md.appendMarkdown(`${icon} **${comment.type.toUpperCase()}**\n\n`);

        // Suggestion 표시
        if (comment.suggestion) {
            md.appendMarkdown('```diff\n');
            md.appendMarkdown(`- ${comment.suggestion.original}\n`);
            md.appendMarkdown(`+ ${comment.suggestion.suggested}\n`);
            md.appendMarkdown('```\n\n');
        }

        md.appendMarkdown(comment.body);

        // Suggestion 적용 버튼
        if (comment.suggestion && !comment.resolved) {
            md.appendMarkdown('\n\n---\n\n');
            md.appendMarkdown(
                `[✅ Accept Suggestion](command:kubelingoassist.applySuggestion?${encodeURIComponent(JSON.stringify([comment.id]))}) ` +
                `[❌ Reject](command:kubelingoassist.rejectSuggestion?${encodeURIComponent(JSON.stringify([comment.id]))})`
            );
        }

        return md;
    }

    /**
     * 코멘트 타입별 아이콘
     */
    private getCommentIcon(type: CommentType): string {
        const icons = {
            [CommentType.GENERAL]: '💬',
            [CommentType.SUGGESTION]: '💡',
            [CommentType.QUESTION]: '❓',
            [CommentType.TERMINOLOGY]: '📖',
            [CommentType.GRAMMAR]: '✍️',
            [CommentType.STYLE]: '🎨'
        };
        return icons[type] || '💬';
    }

    /**
     * Suggestion 적용
     */
    async applySuggestion(commentId: string): Promise<void> {
        const comment = this.findComment(commentId);
        if (!comment?.suggestion) {
            vscode.window.showErrorMessage('Suggestion not found');
            return;
        }

        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        // 텍스트 교체
        const success = await editor.edit(editBuilder => {
            const line = comment.lineNumber - 1;
            const lineText = editor.document.lineAt(line).text;
            const range = new vscode.Range(line, 0, line, lineText.length);
            editBuilder.replace(range, comment.suggestion!.suggested);
        });

        if (success) {
            // 코멘트 자동 해결
            await this.resolveComment(commentId);
            vscode.window.showInformationMessage('✅ Suggestion applied successfully!');
        } else {
            vscode.window.showErrorMessage('❌ Failed to apply suggestion');
        }
    }

    /**
     * Suggestion 거부
     */
    async rejectSuggestion(commentId: string): Promise<void> {
        await this.resolveComment(commentId);
        vscode.window.showInformationMessage('Suggestion rejected');
    }

    /**
     * 코멘트 해결
     */
    async resolveComment(commentId: string): Promise<void> {
        const comment = this.findComment(commentId);
        if (!comment) {
            return;
        }

        comment.resolved = true;

        // Thread 닫기
        const thread = this.commentThreads.get(commentId);
        if (thread) {
            thread.state = vscode.CommentThreadState.Resolved;
            thread.dispose();
            this.commentThreads.delete(commentId);
        }

        await this.saveComments();
    }

    /**
     * 코멘트 찾기
     */
    private findComment(commentId: string): ReviewComment | undefined {
        for (const fileComments of this.comments.values()) {
            const comment = fileComments.find(c => c.id === commentId);
            if (comment) {
                return comment;
            }
        }
        return undefined;
    }

    /**
     * 현재 사용자 이름 가져오기
     */
    private async getCurrentUser(): Promise<string> {
        try {
            // Git 사용자 이름 시도
            const cp = require('child_process');
            const { exec } = require('util').promisify(cp.exec);
            const { stdout } = await exec('git config user.name');
            const username = stdout.trim();
            if (username) {
                return username;
            }
        } catch (error) {
            // Git 설정이 없는 경우 무시
        }
        return 'You';
    }

    /**
     * 로컬 저장소에 코멘트 추가
     */
    private addCommentToStore(filePath: string, comment: ReviewComment): void {
        const fileComments = this.comments.get(filePath) || [];
        fileComments.push(comment);
        this.comments.set(filePath, fileComments);
    }

    /**
     * 코멘트 저장
     */
    private async saveComments(): Promise<void> {
        try {
            await this.storageManager.saveComments(this.comments);
        } catch (error) {
            console.error('Failed to save comments:', error);
        }
    }

    /**
     * 모든 코멘트 가져오기
     */
    getAllComments(): Map<string, ReviewComment[]> {
        return this.comments;
    }

    /**
     * 특정 파일의 코멘트 가져오기
     */
    getFileComments(filePath: string): ReviewComment[] {
        return this.comments.get(filePath) || [];
    }

    /**
     * 미해결 코멘트 가져오기
     */
    getUnresolvedComments(): ReviewComment[] {
        const allComments: ReviewComment[] = [];
        for (const fileComments of this.comments.values()) {
            allComments.push(...fileComments.filter(c => !c.resolved));
        }
        return allComments;
    }

    /**
     * 정리
     */
    dispose(): void {
        this.commentController.dispose();
        for (const thread of this.commentThreads.values()) {
            thread.dispose();
        }
    }
}
