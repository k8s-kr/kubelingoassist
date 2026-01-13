import * as fs from 'fs';
import * as vscode from 'vscode';

export function fileExistsSync(filePath: string): boolean {
    try {
        if (!fs.existsSync(filePath)) {
            return false;
        }

        const stats = fs.statSync(filePath);

        if (filePath.endsWith('/')) {
            return stats.isDirectory();
        }

        return stats.isFile();
    } catch {
        return false;
    }
}

export async function fileExistsAsync(filePath: string): Promise<boolean> {
    try {
        await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
        return true;
    } catch {
        return false;
    }
}

export function directoryExistsSync(dirPath: string): boolean {
    try {
        const stats = fs.statSync(dirPath);
        return stats.isDirectory();
    } catch {
        return false;
    }
}
