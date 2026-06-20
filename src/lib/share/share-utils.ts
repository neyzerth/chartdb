import LZString from 'lz-string';
import type { Diagram } from '@/lib/domain/diagram';
import { diagramSchema } from '@/lib/domain/diagram';
import {
    diagramFromJSONInput,
    diagramToJSONOutput,
} from '@/lib/export-import-utils';
import { HOST_URL } from '@/lib/env';

export const SHARE_HASH_KEY = 'data';
export const THEME_QUERY_KEY = 'theme';

export type ShareTheme = 'light' | 'dark';

const getBaseOrigin = (): string => {
    if (typeof window === 'undefined') {
        return HOST_URL || '';
    }

    return window.location.origin;
};

export const encodeDiagramToShareHash = (diagram: Diagram): string => {
    const json = diagramToJSONOutput(diagram);
    return LZString.compressToEncodedURIComponent(json);
};

export const decodeDiagramFromShareHash = (encoded: string): Diagram => {
    const json = LZString.decompressFromEncodedURIComponent(encoded);

    if (!json) {
        throw new Error('Invalid share data');
    }

    const parsed = JSON.parse(json);
    const diagram = diagramSchema.parse({
        ...parsed,
        createdAt: new Date(parsed.createdAt),
        updatedAt: new Date(parsed.updatedAt),
    });

    return diagram;
};

export const cloneDiagramFromShareHash = (encoded: string): Diagram => {
    const json = LZString.decompressFromEncodedURIComponent(encoded);

    if (!json) {
        throw new Error('Invalid share data');
    }

    return diagramFromJSONInput(json);
};

export const buildShareURL = (diagram: Diagram): string => {
    const origin = getBaseOrigin();
    const hash = encodeDiagramToShareHash(diagram);

    return `${origin}/share#${SHARE_HASH_KEY}=${hash}`;
};

export const buildEmbedURL = (
    diagram: Diagram,
    options?: { theme?: ShareTheme }
): string => {
    const origin = getBaseOrigin();
    const hash = encodeDiagramToShareHash(diagram);
    const params = new URLSearchParams();

    if (options?.theme) {
        params.set(THEME_QUERY_KEY, options.theme);
    }

    const query = params.toString();

    return `${origin}/embed${query ? `?${query}` : ''}#${SHARE_HASH_KEY}=${hash}`;
};

export const parseEmbedTheme = (search: string): ShareTheme | undefined => {
    const params = new URLSearchParams(search);
    const theme = params.get(THEME_QUERY_KEY);

    if (theme === 'light' || theme === 'dark') {
        return theme;
    }

    return undefined;
};
