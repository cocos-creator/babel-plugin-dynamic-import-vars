import type { CustomResolve, SpecifierParts } from './index';
import globby from 'globby';
import ps from 'path';

export interface Options {
    /**
     * For example:
     * ```js
     * {
     *   '.js': ['.js', '.ts', '.tsx'], // Specifiers ended with '.js' will resolved to, '.ts', '.tsx'.
     * }
     * ```
     */
    extMap?: Record<string, string[]>;
}

const defaultExtMap: Record<string, readonly string[]> = {
    '.js': ['.js', '.ts'],
    '.mjs': ['.mjs', '.ts'],
} as const;

export default function createDefaultResolver(options?: Options): CustomResolve {
    return (specifierParts: SpecifierParts, fileName: string) => {
        const prefix = specifierParts[0];
        if (prefix === null ||
            !(prefix.startsWith('./') || prefix.startsWith('../'))) {
            return;
        }

        const extMap = options?.extMap ?? defaultExtMap;
    
        let glob = specifierParts.map((part) => part === null ? '*' : part).join('');
        const matchedExt = Object.entries(extMap).find(([ext]) => glob.toLowerCase().endsWith(ext));
        if (matchedExt) {
            const [src, targets] = matchedExt;
            glob = `${glob.substr(0, glob.length - src.length)}${joinExtensions(targets)}`;
        }
    
        const candidates = globby.sync(glob, {
            cwd: ps.dirname(fileName),
        }).map((candidate) => {
            if (matchedExt) {
                const [src, targets] = matchedExt;
                const target = targets.find((target) => candidate.toLowerCase().endsWith(target));
                if (target) {
                    candidate = `${candidate.substr(0, candidate.length - target.length)}${src}`;
                }
            }
            return candidate.startsWith('./') || candidate.startsWith('../') ?
                candidate : `./${candidate}`;
        });
        if (candidates.length === 0) {
            return;
        }

        return candidates;
    };
}

function joinExtensions(extensions: readonly string[]) {
    return `.{${extensions.map((ext) => ext.startsWith('.') ? ext.substr(1) : ext).join(',')}}`;
}

