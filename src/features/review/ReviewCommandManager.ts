import * as vscode from 'vscode';
import { TranslationCommentController } from './TranslationCommentController';
import { GitHubReviewSync } from './GitHubReviewSync';
import { PRInfoService } from './PRInfoService';
import { CommentType } from '../../core/types';
import { i18n } from '../i18n';

/**
 * 리뷰 관련 커맨드를 관리하는 클래스
 */
export class ReviewCommandManager {
    private commentController: TranslationCommentController;
    private githubSync: GitHubReviewSync;
    private prInfoService: PRInfoService;
    private viewProvider?: any; // TranslationViewProvider

    constructor() {
        this.commentController = new TranslationCommentController();
        this.githubSync = new GitHubReviewSync(this.commentController);
        this.prInfoService = new PRInfoService();
    }

    /**
     * ViewProvider 설정 (PR 정보를 UI로 전달하기 위함)
     */
    setViewProvider(viewProvider: any): void {
        this.viewProvider = viewProvider;
    }

    /**
     * 모든 리뷰 커맨드 등록
     */
    registerCommands(context: vscode.ExtensionContext): void {
        context.subscriptions.push(
            // 일반 코멘트 추가
            vscode.commands.registerCommand(
                'kubelingoassist.addReviewComment',
                () => this.handleAddComment()
            ),

            // Suggestion 추가
            vscode.commands.registerCommand(
                'kubelingoassist.suggestChange',
                () => this.handleSuggestChange()
            ),

            // Suggestion 적용
            vscode.commands.registerCommand(
                'kubelingoassist.applySuggestion',
                (commentId: string) => this.handleApplySuggestion(commentId)
            ),

            // Suggestion 거부
            vscode.commands.registerCommand(
                'kubelingoassist.rejectSuggestion',
                (commentId: string) => this.handleRejectSuggestion(commentId)
            ),

            // GitHub에서 코멘트 가져오기
            vscode.commands.registerCommand(
                'kubelingoassist.syncCommentsFromGitHub',
                () => this.handleSyncFromGitHub()
            ),

            // GitHub에 코멘트 푸시
            vscode.commands.registerCommand(
                'kubelingoassist.pushCommentsToGitHub',
                (reviewEvent?: 'APPROVE' | 'COMMENT' | 'REQUEST_CHANGES') => this.handlePushToGitHub(reviewEvent)
            ),

            // 용어 코멘트 추가
            vscode.commands.registerCommand(
                'kubelingoassist.addTerminologyComment',
                () => this.handleAddComment(CommentType.TERMINOLOGY)
            ),

            // 문법 코멘트 추가
            vscode.commands.registerCommand(
                'kubelingoassist.addGrammarComment',
                () => this.handleAddComment(CommentType.GRAMMAR)
            ),

            // 스타일 코멘트 추가
            vscode.commands.registerCommand(
                'kubelingoassist.addStyleComment',
                () => this.handleAddComment(CommentType.STYLE)
            ),

            // 질문 코멘트 추가
            vscode.commands.registerCommand(
                'kubelingoassist.addQuestionComment',
                () => this.handleAddComment(CommentType.QUESTION)
            ),

            // PR 정보 가져오기
            vscode.commands.registerCommand(
                'kubelingoassist.fetchPRInfo',
                (prNumber?: number) => this.handleFetchPRInfo(prNumber)
            ),

            // PR 파일 열기
            vscode.commands.registerCommand(
                'kubelingoassist.openPRFile',
                (filePath: string) => this.handleOpenPRFile(filePath)
            )
        );

        // Comment Controller 등록
        context.subscriptions.push(this.commentController);
    }

    /**
     * 일반 코멘트 추가 처리
     */
    private async handleAddComment(type: CommentType = CommentType.GENERAL): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        // 마크다운 파일인지 확인
        if (editor.document.languageId !== 'markdown') {
            vscode.window.showWarningMessage('Comments can only be added to markdown files');
            return;
        }

        const selection = editor.selection;
        if (selection.isEmpty) {
            vscode.window.showInformationMessage('Please select text to comment on');
            return;
        }

        // 코멘트 입력 받기
        const body = await vscode.window.showInputBox({
            prompt: this.getPromptForType(type),
            placeHolder: 'Enter your comment...'
        });

        if (!body) {
            return;
        }

        try {
            await this.commentController.addComment(editor.document, selection, body, type);
            vscode.window.showInformationMessage('✅ Comment added successfully!');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to add comment: ${error}`);
        }
    }

    /**
     * 번역 제안 처리
     */
    private async handleSuggestChange(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        const selection = editor.selection;
        if (selection.isEmpty) {
            vscode.window.showInformationMessage('Please select text to suggest a change');
            return;
        }

        const originalText = editor.document.getText(selection);

        // 수정된 텍스트 입력 받기
        const suggestedText = await vscode.window.showInputBox({
            prompt: 'Enter your suggested text',
            value: originalText
        });

        if (!suggestedText || suggestedText === originalText) {
            return;
        }

        // 제안 이유 입력 받기
        const reason = await vscode.window.showInputBox({
            prompt: 'Why do you suggest this change? (optional)',
            placeHolder: 'Explain your reasoning...'
        });

        try {
            await this.commentController.addSuggestion(
                editor.document,
                selection,
                originalText,
                suggestedText,
                reason || ''
            );
            vscode.window.showInformationMessage('✅ Suggestion added successfully!');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to add suggestion: ${error}`);
        }
    }

    /**
     * Suggestion 적용 처리
     */
    private async handleApplySuggestion(commentId: string): Promise<void> {
        try {
            await this.commentController.applySuggestion(commentId);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to apply suggestion: ${error}`);
        }
    }

    /**
     * Suggestion 거부 처리
     */
    private async handleRejectSuggestion(commentId: string): Promise<void> {
        try {
            await this.commentController.rejectSuggestion(commentId);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to reject suggestion: ${error}`);
        }
    }

    /**
     * GitHub에서 코멘트 가져오기 처리
     */
    private async handleSyncFromGitHub(): Promise<void> {
        try {
            // PR 번호 입력 받기 (또는 자동 감지)
            const prInput = await vscode.window.showInputBox({
                prompt: 'Enter PR number (leave empty to detect current PR)',
                placeHolder: '123'
            });

            let prNumber: number | null;
            if (prInput) {
                prNumber = parseInt(prInput);
                if (isNaN(prNumber)) {
                    vscode.window.showErrorMessage('Invalid PR number');
                    return;
                }
            } else {
                prNumber = await this.githubSync.getCurrentPRNumber();
                if (!prNumber) {
                    vscode.window.showErrorMessage('No PR found for current branch');
                    return;
                }
            }

            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: `Syncing comments from PR #${prNumber}...`,
                    cancellable: false
                },
                async () => {
                    await this.githubSync.syncFromGitHub(prNumber!);
                }
            );

            vscode.window.showInformationMessage(`✅ Synced comments from PR #${prNumber}`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to sync from GitHub: ${error}`);
        }
    }

    /**
     * GitHub에 코멘트 푸시 처리
     */
    private async handlePushToGitHub(reviewEvent?: 'APPROVE' | 'COMMENT' | 'REQUEST_CHANGES'): Promise<void> {
        try {
            const prNumber = await this.githubSync.getCurrentPRNumber();
            if (!prNumber) {
                vscode.window.showErrorMessage('No PR found for current branch');
                return;
            }

            const eventLabel = reviewEvent === 'APPROVE' ? 'Approving' :
                              reviewEvent === 'REQUEST_CHANGES' ? 'Requesting changes on' :
                              'Commenting on';

            const count = await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: `${eventLabel} PR #${prNumber}...`,
                    cancellable: false
                },
                async () => {
                    return await this.githubSync.pushAllToGitHub(prNumber, reviewEvent);
                }
            );

            const successLabel = reviewEvent === 'APPROVE' ? 'Approved' :
                                reviewEvent === 'REQUEST_CHANGES' ? 'Requested changes on' :
                                'Commented on';

            vscode.window.showInformationMessage(
                `✅ ${successLabel} PR #${prNumber} with ${count} comment(s)`
            );
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to push to GitHub: ${error}`);
        }
    }

    /**
     * 코멘트 타입별 프롬프트
     */
    private getPromptForType(type: CommentType): string {
        switch (type) {
            case CommentType.TERMINOLOGY:
                return 'Comment on terminology:';
            case CommentType.GRAMMAR:
                return 'Comment on grammar:';
            case CommentType.STYLE:
                return 'Comment on style:';
            case CommentType.QUESTION:
                return 'Ask a question:';
            default:
                return 'Enter your review comment:';
        }
    }

    /**
     * Comment Controller 가져오기
     */
    getCommentController(): TranslationCommentController {
        return this.commentController;
    }

    /**
     * GitHub Sync 서비스 가져오기
     */
    getGitHubSync(): GitHubReviewSync {
        return this.githubSync;
    }

    /**
     * PR 정보 가져오기 처리
     */
    private async handleFetchPRInfo(prNumber?: number): Promise<void> {
        try {
            // gh CLI 설치 확인
            const ghInstalled = await this.prInfoService.isGHInstalled();
            if (!ghInstalled) {
                const action = await vscode.window.showErrorMessage(
                    '⚠️ GitHub CLI (gh) is not installed. Install it to use PR features.',
                    'Install Guide',
                    'Cancel'
                );

                if (action === 'Install Guide') {
                    vscode.env.openExternal(vscode.Uri.parse('https://cli.github.com/'));
                }
                return;
            }

            // gh CLI 인증 확인
            const ghAuthenticated = await this.prInfoService.isGHAuthenticated();
            if (!ghAuthenticated) {
                const action = await vscode.window.showErrorMessage(
                    '⚠️ GitHub CLI is not authenticated. Please login to use PR features.',
                    'Login Guide',
                    'Open Terminal',
                    'Cancel'
                );

                if (action === 'Login Guide') {
                    vscode.env.openExternal(vscode.Uri.parse('https://cli.github.com/manual/gh_auth_login'));
                } else if (action === 'Open Terminal') {
                    const terminal = vscode.window.createTerminal('GitHub CLI Login');
                    terminal.show();
                    terminal.sendText('gh auth login');
                }
                return;
            }

            let pr = prNumber;

            // PR 번호가 제공되지 않은 경우 사용자 입력 받기
            if (!pr) {
                const input = await vscode.window.showInputBox({
                    prompt: 'Enter PR number',
                    placeHolder: '123',
                    validateInput: (value) => {
                        const num = parseInt(value);
                        if (isNaN(num) || num <= 0) {
                            return 'Please enter a valid PR number';
                        }
                        return null;
                    }
                });

                if (!input) {
                    return;
                }

                pr = parseInt(input);
            }

            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: `Fetching PR #${pr} information...`,
                    cancellable: false
                },
                async () => {
                    try {
                        const prDetails = await this.prInfoService.getPRDetails(pr!);

                        if (!prDetails) {
                            const action = await vscode.window.showErrorMessage(
                                `Failed to fetch PR #${pr}. Make sure:\n- The PR exists\n- You have access to the repository\n- You're authenticated with gh CLI`,
                                'Check Authentication',
                                'Cancel'
                            );

                            if (action === 'Check Authentication') {
                                const terminal = vscode.window.createTerminal('GitHub CLI Status');
                                terminal.show();
                                terminal.sendText('gh auth status');
                            }
                            return;
                        }

                        // WebView로 PR 정보 전송
                        if (this.viewProvider) {
                            this.viewProvider.sendPRInfo(prDetails);
                        }

                        // 디버깅: 전체 파일 목록 출력
                        console.log('All files in PR:', prDetails.files.map(f => f.path));

                        // 번역 파일 필터링
                        const translationFiles = this.prInfoService.getReviewableFiles(prDetails.files);
                        console.log('Filtered translation files:', translationFiles.map(f => f.path));

                        // PR 브랜치로 자동 checkout 및 리뷰 댓글 동기화
                        await vscode.window.withProgress(
                            {
                                location: vscode.ProgressLocation.Notification,
                                title: `Checking out PR #${pr} and syncing reviews...`,
                                cancellable: false
                            },
                            async () => {
                                try {
                                    // Checkout
                                    await this.prInfoService.checkoutPR(pr!, prDetails.title);

                                    // GitHub 리뷰 댓글 가져오기
                                    const comments = await this.prInfoService.getPRComments(pr!);
                                    console.log(`Fetched ${comments.length} review comments from GitHub`);

                                    // 댓글을 VS Code에 표시
                                    if (comments.length > 0) {
                                        await this.syncReviewComments(comments);
                                        vscode.window.showInformationMessage(
                                            `✅ PR #${pr}: ${prDetails.title}\n🔀 Checked out successfully\n💬 Synced ${comments.length} review comment(s)`
                                        );
                                    } else {
                                        vscode.window.showInformationMessage(
                                            `✅ PR #${pr}: ${prDetails.title}\n🔀 Checked out successfully\n💬 No review comments found`
                                        );
                                    }
                                } catch (error: any) {
                                    vscode.window.showErrorMessage(`Failed to checkout PR #${pr}: ${error.message || error}`);
                                    return;
                                }
                            }
                        );

                        // 번역 파일 목록 표시 및 선택
                        if (translationFiles.length > 0) {
                            // removed 상태가 아닌 파일만 필터링
                            const existingFiles = translationFiles.filter(f => f.status !== 'removed');

                            if (existingFiles.length === 0) {
                                vscode.window.showWarningMessage(
                                    `All translation files in PR #${pr} were removed`
                                );
                                return;
                            }

                            const items = existingFiles.map(file => ({
                                label: `$(file) ${file.path}`,
                                description: `+${file.additions} -${file.deletions}`,
                                detail: `${file.status}`,
                                filePath: file.path
                            }));

                            const selected = await vscode.window.showQuickPick(items, {
                                placeHolder: `Select a file to review (${existingFiles.length} file(s) found)`,
                                matchOnDescription: true,
                                matchOnDetail: true
                            });

                            if (selected) {
                                const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                                if (workspaceFolder) {
                                    const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, selected.filePath);

                                    try {
                                        const document = await vscode.workspace.openTextDocument(fileUri);
                                        await vscode.window.showTextDocument(document);
                                    } catch (error: any) {
                                        vscode.window.showErrorMessage(
                                            `Failed to open file: ${selected.filePath}\n\nThe file may not exist in the checked out branch. Try running 'git pull' or check if the file path is correct.`
                                        );
                                    }
                                }
                            }
                        } else {
                            vscode.window.showWarningMessage(
                                `No translation files found in PR #${pr}`
                            );
                        }
                    } catch (error: any) {
                        // 더 자세한 에러 메시지
                        let errorMsg = `Failed to fetch PR #${pr}`;
                        if (error.message) {
                            errorMsg += `\n\nError: ${error.message}`;
                        }
                        if (error.stderr) {
                            errorMsg += `\n\nDetails: ${error.stderr}`;
                        }

                        const action = await vscode.window.showErrorMessage(
                            errorMsg,
                            'Test gh Command',
                            'Check Repository',
                            'Cancel'
                        );

                        if (action === 'Test gh Command') {
                            const terminal = vscode.window.createTerminal('Test gh CLI');
                            terminal.show();
                            terminal.sendText(`gh pr view ${pr}`);
                        } else if (action === 'Check Repository') {
                            const terminal = vscode.window.createTerminal('Check Git Remote');
                            terminal.show();
                            terminal.sendText('git remote -v');
                        }
                    }
                }
            );
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to fetch PR info: ${error.message || error}`);
        }
    }


    /**
     * PR 파일 열기
     */
    private async handleOpenPRFile(filePath: string): Promise<void> {
        try {
            const uri = vscode.Uri.file(filePath);
            const document = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(document);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to open file: ${error}`);
        }
    }


    /**
     * PR Info Service 가져오기
     */
    getPRInfoService(): PRInfoService {
        return this.prInfoService;
    }

    /**
     * GitHub 리뷰 댓글을 VS Code에 동기화
     */
    private async syncReviewComments(comments: any[]): Promise<void> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return;
        }

        for (const comment of comments) {
            try {
                const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, comment.path);

                // 파일이 존재하는지 확인
                try {
                    await vscode.workspace.fs.stat(fileUri);
                } catch {
                    console.log(`File not found, skipping comment: ${comment.path}`);
                    continue;
                }

                // 파일 열기
                const document = await vscode.workspace.openTextDocument(fileUri);

                // 라인 번호 (0-based index)
                const lineNumber = Math.max(0, (comment.line || 1) - 1);
                const range = new vscode.Range(lineNumber, 0, lineNumber, document.lineAt(lineNumber).text.length);

                // 댓글 추가
                const commentBody = `**${comment.user}** (GitHub Review)\n\n${comment.body}`;
                await this.commentController.addComment(
                    document,
                    new vscode.Selection(range.start, range.end),
                    commentBody
                );

                console.log(`Added comment from ${comment.user} on ${comment.path}:${comment.line}`);
            } catch (error) {
                console.error(`Failed to add comment for ${comment.path}:`, error);
            }
        }
    }
}
