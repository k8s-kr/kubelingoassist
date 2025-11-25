import * as path from 'path';
import { CommitFile } from '../../core/types';

export interface GitChangedFile extends CommitFile {
    absPath: string;
}

export class FilePathResolver {
    constructor(private workspaceRoot: string) {}

    resolveAbsolutePath(relativePath: string): string {
        return path.join(this.workspaceRoot, relativePath.split('/').join(path.sep));
    }

    getOriginalEnglishPath(translationPath: string): string | null {
        // 절대 경로 또는 상대 경로 모두 처리
        const langMatch = translationPath.match(/content\/([^/]+)\//);
        if (langMatch && langMatch[1] !== 'en') {
            return translationPath.replace(`content/${langMatch[1]}/`, 'content/en/');
        }
        return null;
    }

    filterTranslationFiles(files: CommitFile[]): GitChangedFile[] {
        return files
            .filter(file => file.path.endsWith('.md'))
            .map(file => ({
                ...file,
                absPath: this.resolveAbsolutePath(file.path)
            }));
    }
}