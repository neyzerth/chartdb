import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { LocalConfigProvider } from '@/context/local-config-context/local-config-provider';
import { ThemeProvider } from '@/context/theme-context/theme-provider';
import { ChartDBProvider } from '@/context/chartdb-context/chartdb-provider';
import { RedoUndoStackProvider } from '@/context/history-context/redo-undo-stack-provider';
import { DiffProvider } from '@/context/diff-context/diff-provider';
import { CanvasProvider } from '@/context/canvas-context/canvas-provider';
import { Canvas } from '../editor-page/canvas/canvas';
import { ReactFlowProvider } from '@xyflow/react';
import { useLocalConfig } from '@/hooks/use-local-config';
import { Spinner } from '@/components/spinner/spinner';
import type { Diagram } from '@/lib/domain/diagram';
import {
    decodeDiagramFromShareHash,
    parseEmbedTheme,
    SHARE_HASH_KEY,
} from '@/lib/share/share-utils';

const EmbedPageComponent: React.FC = () => {
    const { setTheme } = useLocalConfig();
    const [diagram, setDiagram] = useState<Diagram | undefined>();
    const [error, setError] = useState(false);

    useEffect(() => {
        const hash = window.location.hash.slice(1);
        const params = new URLSearchParams(hash);
        const data = params.get(SHARE_HASH_KEY);

        if (!data) {
            setError(true);
            return;
        }

        try {
            const decoded = decodeDiagramFromShareHash(data);
            setDiagram(decoded);
        } catch {
            setError(true);
        }
    }, []);

    useEffect(() => {
        const theme = parseEmbedTheme(window.location.search);
        if (theme) {
            setTheme(theme);
        }
    }, [setTheme]);

    if (error) {
        return (
            <section className="flex h-screen w-screen items-center justify-center bg-background p-6 text-center">
                <Helmet>
                    <title>Invalid ChartDB embed</title>
                    <meta name="robots" content="noindex" />
                </Helmet>
                <p className="text-muted-foreground">Invalid embed link.</p>
            </section>
        );
    }

    if (!diagram) {
        return (
            <section className="flex h-screen w-screen items-center justify-center bg-background">
                <Helmet>
                    <title>Loading ChartDB diagram</title>
                    <meta name="robots" content="noindex" />
                </Helmet>
                <Spinner size="large" className="text-pink-600" />
            </section>
        );
    }

    return (
        <>
            <Helmet>
                <title>{`${diagram.name} | ChartDB`}</title>
                <meta name="robots" content="noindex" />
            </Helmet>
            <section className="h-screen w-screen overflow-hidden bg-background">
                <ChartDBProvider diagram={diagram} readonly>
                    <CanvasProvider>
                        <div className="size-full">
                            <Canvas initialTables={diagram.tables ?? []} />
                        </div>
                    </CanvasProvider>
                </ChartDBProvider>
            </section>
        </>
    );
};

export const EmbedPage: React.FC = () => (
    <LocalConfigProvider>
        <ThemeProvider>
            <RedoUndoStackProvider>
                <DiffProvider>
                    <ReactFlowProvider>
                        <EmbedPageComponent />
                    </ReactFlowProvider>
                </DiffProvider>
            </RedoUndoStackProvider>
        </ThemeProvider>
    </LocalConfigProvider>
);
