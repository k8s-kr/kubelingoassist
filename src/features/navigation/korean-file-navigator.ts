import * as vscode from 'vscode';
import * as path from 'path';

interface LocaleFileLink {
    text: string;
    filePath: string;
    sourceFile: string;
    line: number;
    locale: string;
}

export class KoreanFileNavigator {
    static async findLocaleLinksInOpenFiles(): Promise<LocaleFileLink[]> {
        const links: LocaleFileLink[] = [];
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

        if (!workspaceFolder) {
            return links;
        }

        // 현재 열린 모든 탭의 문서들을 확인
        for (const tabGroup of vscode.window.tabGroups.all) {
            for (const tab of tabGroup.tabs) {
                const input = tab.input as vscode.TabInputText;
                if (input?.uri) {
                    const document = await vscode.workspace.openTextDocument(input.uri);
                    const fileLinks = this.extractLocaleLinks(document, workspaceFolder.uri.fsPath);
                    links.push(...fileLinks);
                }
            }
        }

        return links;
    }

    static async findLinksForCurrentFile(): Promise<LocaleFileLink[]> {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            return [];
        }

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return [];
        }

        return this.extractLocaleLinks(activeEditor.document, workspaceFolder.uri.fsPath);
    }

    private static extractLocaleLinks(document: vscode.TextDocument, workspacePath: string): LocaleFileLink[] {
        const links: LocaleFileLink[] = [];
        const text = document.getText();
        const lines = text.split('\n');

        // 다양한 locale로 시작하는 마크다운 링크 패턴: [텍스트](/locale/path/file.md)
        // 지원하는 locale: ko, en, ja, zh, fr, de, es, etc.
        const linkPattern = /\[([^\]]+)\]\(\/([a-z]{2}(?:-[A-Z]{2})?)\/([^)]+\.md)\)/g;

        lines.forEach((line, lineIndex) => {
            let match;
            while ((match = linkPattern.exec(line)) !== null) {
                const linkText = match[1];
                const locale = match[2];
                const relativePath = match[3];
                const fullPath = path.join(workspacePath, locale, relativePath);

                links.push({
                    text: linkText,
                    filePath: fullPath,
                    sourceFile: document.fileName,
                    line: lineIndex + 1,
                    locale: locale
                });
            }
        });

        return links;
    }

    static async showLocaleFileQuickPick(currentFileOnly: boolean = false): Promise<void> {
        try {
            const links = currentFileOnly
                ? await this.findLinksForCurrentFile()
                : await this.findLocaleLinksInOpenFiles();

            if (links.length === 0) {
                const message = currentFileOnly
                    ? '현재 파일에서 locale 링크를 찾을 수 없습니다.'
                    : '열린 파일에서 locale 링크를 찾을 수 없습니다.';
                vscode.window.showInformationMessage(message);
                return;
            }

            // locale별로 그룹화
            const localeGroups = new Map<string, LocaleFileLink[]>();
            links.forEach(link => {
                if (!localeGroups.has(link.locale)) {
                    localeGroups.set(link.locale, []);
                }
                localeGroups.get(link.locale)!.push(link);
            });

            const quickPickItems: vscode.QuickPickItem[] = [];

            // locale별로 섹션 나누어 표시
            for (const [locale, localeLinks] of localeGroups) {
                quickPickItems.push({
                    label: `📁 ${locale.toUpperCase()} Files`,
                    kind: vscode.QuickPickItemKind.Separator
                });

                localeLinks.forEach(link => {
                    quickPickItems.push({
                        label: `${this.getLocaleIcon(link.locale)} ${link.text}`,
                        description: path.basename(link.filePath),
                        detail: `${path.basename(link.sourceFile)}:${link.line} → ${link.filePath}`,
                        ...(link as any)
                    });
                });
            }

            const selected = await vscode.window.showQuickPick(quickPickItems, {
                placeHolder: currentFileOnly
                    ? '현재 파일의 locale 링크를 선택하세요'
                    : '열고 싶은 locale 파일을 선택하세요',
                matchOnDescription: true,
                matchOnDetail: true
            });

            if (selected && selected.kind !== vscode.QuickPickItemKind.Separator) {
                const selectedLink = selected as any as LocaleFileLink;
                await this.openFile(selectedLink.filePath);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`locale 파일 탐색 중 오류가 발생했습니다: ${error}`);
        }
    }

    private static getLocaleIcon(locale: string): string {
        const iconMap: Record<string, string> = {
            'ko': '🇰🇷',
            'en': '🇺🇸',
            'ja': '🇯🇵',
            'zh': '🇨🇳',
            'fr': '🇫🇷',
            'de': '🇩🇪',
            'es': '🇪🇸',
            'it': '🇮🇹',
            'pt': '🇵🇹',
            'ru': '🇷🇺'
        };
        return iconMap[locale] || '🌐';
    }

    private static async openFile(filePath: string): Promise<void> {
        try {
            // 파일이 존재하는지 확인
            const uri = vscode.Uri.file(filePath);
            const document = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(document);
        } catch (error) {
            // 파일이 없으면 생성할지 물어보기
            const createFile = await vscode.window.showWarningMessage(
                `파일이 존재하지 않습니다: ${filePath}`,
                '파일 생성',
                '취소'
            );

            if (createFile === '파일 생성') {
                await this.createLocaleFile(filePath);
            }
        }
    }

    private static async createLocaleFile(filePath: string): Promise<void> {
        try {
            const uri = vscode.Uri.file(filePath);

            // 디렉토리가 없으면 생성
            const dirPath = path.dirname(filePath);
            await vscode.workspace.fs.createDirectory(vscode.Uri.file(dirPath));

            // 빈 파일 생성
            await vscode.workspace.fs.writeFile(uri, new Uint8Array());

            // 파일 열기
            const document = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(document);

            vscode.window.showInformationMessage(`locale 파일이 생성되었습니다: ${filePath}`);
        } catch (error) {
            vscode.window.showErrorMessage(`파일 생성 중 오류가 발생했습니다: ${error}`);
        }
    }
}