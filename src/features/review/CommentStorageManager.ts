import * as vscode from 'vscode';
import * as path from 'path';
import { ReviewComment, CommentStorage } from '../../core/types';

/**
 * 리뷰 코멘트를 로컬 파일에 저장하고 불러오는 관리자
 */
export class CommentStorageManager {
    private readonly storageFileName = '.kubelingo-reviews.json';
    private workspaceRoot: string;

    constructor() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        this.workspaceRoot = workspaceFolders ? workspaceFolders[0].uri.fsPath : '';
    }

    /**
     * 코멘트를 로컬 파일에 저장
     */
    async saveComments(comments: Map<string, ReviewComment[]>): Promise<void> {
        if (!this.workspaceRoot) {
            console.warn('No workspace folder found, cannot save comments');
            return;
        }

        const data: CommentStorage = {
            version: '1.0',
            comments: Object.fromEntries(comments)
        };

        const storageFilePath = path.join(this.workspaceRoot, this.storageFileName);
        const content = JSON.stringify(data, null, 2);

        try {
            await vscode.workspace.fs.writeFile(
                vscode.Uri.file(storageFilePath),
                Buffer.from(content, 'utf8')
            );
        } catch (error) {
            console.error('Failed to save comments:', error);
            throw error;
        }
    }

    /**
     * 로컬 파일에서 코멘트 불러오기
     */
    async loadComments(): Promise<Map<string, ReviewComment[]>> {
        if (!this.workspaceRoot) {
            return new Map();
        }

        const storageFilePath = path.join(this.workspaceRoot, this.storageFileName);

        try {
            const content = await vscode.workspace.fs.readFile(vscode.Uri.file(storageFilePath));
            const data: CommentStorage = JSON.parse(content.toString());

            // Date 객체로 변환
            const comments = new Map<string, ReviewComment[]>();
            for (const [filePath, fileComments] of Object.entries(data.comments)) {
                const convertedComments = fileComments.map(comment => ({
                    ...comment,
                    createdAt: new Date(comment.createdAt),
                    replies: comment.replies.map(reply => ({
                        ...reply,
                        createdAt: new Date(reply.createdAt)
                    }))
                }));
                comments.set(filePath, convertedComments);
            }

            return comments;
        } catch (error) {
            // 파일이 없거나 읽기 실패 시 빈 Map 반환
            return new Map();
        }
    }

    /**
     * 특정 파일의 코멘트만 저장
     */
    async saveFileComments(filePath: string, comments: ReviewComment[]): Promise<void> {
        const allComments = await this.loadComments();
        allComments.set(filePath, comments);
        await this.saveComments(allComments);
    }

    /**
     * 특정 파일의 코멘트만 불러오기
     */
    async loadFileComments(filePath: string): Promise<ReviewComment[]> {
        const allComments = await this.loadComments();
        return allComments.get(filePath) || [];
    }

    /**
     * 저장소 파일 존재 여부 확인
     */
    async exists(): Promise<boolean> {
        if (!this.workspaceRoot) {
            return false;
        }

        const storageFilePath = path.join(this.workspaceRoot, this.storageFileName);
        try {
            await vscode.workspace.fs.stat(vscode.Uri.file(storageFilePath));
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 저장소 파일 삭제
     */
    async clear(): Promise<void> {
        if (!this.workspaceRoot) {
            return;
        }

        const storageFilePath = path.join(this.workspaceRoot, this.storageFileName);
        try {
            await vscode.workspace.fs.delete(vscode.Uri.file(storageFilePath));
        } catch (error) {
            console.error('Failed to clear comments storage:', error);
        }
    }
}
