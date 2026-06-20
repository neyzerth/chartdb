import { describe, expect, it } from 'vitest';
import { DatabaseType } from '@/lib/domain/database-type';
import type { Diagram } from '@/lib/domain/diagram';
import {
    buildEmbedURL,
    buildShareURL,
    cloneDiagramFromShareHash,
    decodeDiagramFromShareHash,
    encodeDiagramToShareHash,
    parseEmbedTheme,
} from '../share-utils';

const createTestDiagram = (): Diagram => ({
    id: 'test-diagram-id',
    name: 'Test Diagram',
    databaseType: DatabaseType.POSTGRESQL,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    tables: [
        {
            id: '0',
            name: 'users',
            schema: 'public',
            x: 0,
            y: 0,
            fields: [
                {
                    id: '0',
                    name: 'id',
                    type: { id: 'uuid', name: 'uuid' },
                    primaryKey: true,
                    nullable: false,
                    unique: true,
                    createdAt: 1704067200000,
                },
            ],
            indexes: [],
            color: '#000000',
            isView: false,
            createdAt: 1704067200000,
            width: 200,
        },
    ],
    relationships: [],
    dependencies: [],
    areas: [],
    customTypes: [],
    notes: [],
});

describe('share-utils', () => {
    it('should round-trip encode and decode a diagram', () => {
        const diagram = createTestDiagram();
        const hash = encodeDiagramToShareHash(diagram);
        const decoded = decodeDiagramFromShareHash(hash);

        expect(decoded.name).toBe(diagram.name);
        expect(decoded.databaseType).toBe(diagram.databaseType);
        expect(decoded.tables).toHaveLength(1);
        expect(decoded.tables?.[0].name).toBe('users');
        expect(decoded.tables?.[0].fields[0].name).toBe('id');
    });

    it('should produce a valid share URL containing the hash key', () => {
        const diagram = createTestDiagram();
        const url = buildShareURL(diagram);

        expect(url).toContain('/share#data=');
        expect(url.length).toBeLessThan(2048);
    });

    it('should produce an embed URL with theme query param when requested', () => {
        const diagram = createTestDiagram();
        const url = buildEmbedURL(diagram, { theme: 'dark' });

        expect(url).toContain('/embed?theme=dark#data=');
    });

    it('should parse the theme from embed URL search params', () => {
        expect(parseEmbedTheme('?theme=dark')).toBe('dark');
        expect(parseEmbedTheme('?theme=light')).toBe('light');
        expect(parseEmbedTheme('?theme=invalid')).toBeUndefined();
        expect(parseEmbedTheme('')).toBeUndefined();
    });

    it('should throw on invalid encoded data', () => {
        expect(() => decodeDiagramFromShareHash('!!!invalid!!!')).toThrow();
    });

    it('should clone a diagram with fresh ids', () => {
        const diagram = createTestDiagram();
        const hash = encodeDiagramToShareHash(diagram);
        const cloned = cloneDiagramFromShareHash(hash);

        expect(cloned.id).not.toBe(diagram.id);
        expect(cloned.name).toBe(diagram.name);
        expect(cloned.tables?.[0].id).not.toBe(diagram.tables?.[0].id);
        expect(cloned.tables?.[0].fields[0].id).not.toBe(
            diagram.tables?.[0].fields[0].id
        );
    });
});
