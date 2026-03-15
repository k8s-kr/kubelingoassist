import * as path from 'path';
import { CommitFile } from '../../core/types';
import { getOriginalEnglishPath } from '../../core/path-utils';

export interface GitChangedFile extends CommitFile {
    absPath: string;
}

export class FilePathResolver {
    constructor(private workspaceRoot: string) {}

    resolveAbsolutePath(relativePath: string): string {
        return path.join(this.workspaceRoot, relativePath.split('/').join(path.sep));
    }

    getOriginalEnglishPath(translationPath: string): string | null {
        return getOriginalEnglishPath(translationPath);
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