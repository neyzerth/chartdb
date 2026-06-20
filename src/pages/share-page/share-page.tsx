import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import ChartDBLogo from '@/assets/logo-light.png';
import ChartDBDarkLogo from '@/assets/logo-dark.png';
import { Button } from '@/components/button/button';
import { Spinner } from '@/components/spinner/spinner';
import { LocalConfigProvider } from '@/context/local-config-context/local-config-provider';
import { StorageProvider } from '@/context/storage-context/storage-provider';
import { ThemeProvider } from '@/context/theme-context/theme-provider';
import { ChartDBProvider } from '@/context/chartdb-context/chartdb-provider';
import { DiffProvider } from '@/context/diff-context/diff-provider';
import { RedoUndoStackProvider } from '@/context/history-context/redo-undo-stack-provider';
import { CanvasProvider } from '@/context/canvas-context/canvas-provider';
import { Canvas } from '../editor-page/canvas/canvas';
import { ReactFlowProvider } from '@xyflow/react';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from 'react-i18next';
import { useStorage } from '@/hooks/use-storage';
import type { Diagram } from '@/lib/domain/diagram';
import {
    cloneDiagramFromShareHash,
    decodeDiagramFromShareHash,
    SHARE_HASH_KEY,
} from '@/lib/share/share-utils';
import { HOST_URL } from '@/lib/env';
import { Copy } from 'lucide-react';

const SharePageComponent: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { effectiveTheme } = useTheme();
    const { addDiagram, deleteDiagram } = useStorage();
    const [diagram, setDiagram] = useState<Diagram | undefined>();
    const [error, setError] = useState(false);
    const [isCloning, setIsCloning] = useState(false);

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

    const cloneToEdit = useCallback(async () => {
        const hash = window.location.hash.slice(1);
        const params = new URLSearchParams(hash);
        const data = params.get(SHARE_HASH_KEY);

        if (!data) {
            return;
        }

        setIsCloning(true);

        try {
            const cloned = cloneDiagramFromShareHash(data);
            await deleteDiagram(cloned.id);
            await addDiagram({ diagram: cloned });
            navigate(`/diagrams/${cloned.id}`);
        } catch {
            setIsCloning(false);
        }
    }, [addDiagram, deleteDiagram, navigate]);

    const pageTitle = useMemo(
        () =>
            diagram
                ? `${diagram.name} | ChartDB`
                : t('share_dialog.invalid_link_title'),
        [diagram, t]
    );

    if (error) {
        return (
            <section className="flex h-screen w-screen flex-col items-center justify-center bg-background p-6 text-center">
                <Helmet>
                    <title>{t('share_dialog.invalid_link_title')}</title>
                    <meta name="robots" content="noindex" />
                </Helmet>
                <h1 className="font-primary text-2xl font-bold">
                    {t('share_dialog.invalid_link_title')}
                </h1>
                <p className="mt-2 text-muted-foreground">
                    {t('share_dialog.invalid_link_description')}
                </p>
                <Button className="mt-6" onClick={() => navigate('/')}>
                    {t('share_dialog.go_to_editor')}
                </Button>
            </section>
        );
    }

    if (!diagram) {
        return (
            <section className="flex h-screen w-screen items-center justify-center bg-background">
                <Helmet>
                    <title>{t('loading_diagram')}</title>
                    <meta name="robots" content="noindex" />
                </Helmet>
                <Spinner size="large" className="text-pink-600" />
            </section>
        );
    }

    return (
        <>
            <Helmet>
                <title>{pageTitle}</title>
                <meta name="robots" content="noindex" />
                <meta
                    name="description"
                    content={`View the ${diagram.name} database schema diagram on ChartDB`}
                />
                <meta property="og:title" content={pageTitle} />
                <meta
                    property="og:description"
                    content={`View the ${diagram.name} database schema diagram on ChartDB`}
                />
                <meta property="og:type" content="website" />
                <meta property="og:site_name" content="ChartDB" />
                <meta property="og:url" content={`${HOST_URL}/share`} />
            </Helmet>
            <section className="flex h-screen w-screen flex-col overflow-hidden bg-background">
                <nav className="flex h-12 shrink-0 flex-row items-center justify-between border-b px-4">
                    <div className="flex items-center gap-3">
                        <a
                            href="https://chartdb.io"
                            className="cursor-pointer"
                            rel="noreferrer"
                        >
                            <img
                                src={
                                    effectiveTheme === 'light'
                                        ? ChartDBLogo
                                        : ChartDBDarkLogo
                                }
                                alt="chartDB"
                                className="h-4 max-w-fit"
                            />
                        </a>
                        <span className="text-sm font-medium text-muted-foreground">
                            {diagram.name}
                        </span>
                    </div>
                    <Button
                        onClick={cloneToEdit}
                        disabled={isCloning}
                        size="sm"
                    >
                        {isCloning ? (
                            <Spinner className="mr-2 size-4 text-primary-foreground" />
                        ) : (
                            <Copy className="mr-2 size-4" />
                        )}
                        {t('share_dialog.clone_to_edit')}
                    </Button>
                </nav>
                <div className="flex min-h-0 flex-1">
                    <ChartDBProvider diagram={diagram} readonly>
                        <CanvasProvider>
                            <div className="size-full">
                                <Canvas initialTables={diagram.tables ?? []} />
                            </div>
                        </CanvasProvider>
                    </ChartDBProvider>
                </div>
            </section>
        </>
    );
};

export const SharePage: React.FC = () => (
    <LocalConfigProvider>
        <ThemeProvider>
            <StorageProvider>
                <RedoUndoStackProvider>
                    <DiffProvider>
                        <ReactFlowProvider>
                            <SharePageComponent />
                        </ReactFlowProvider>
                    </DiffProvider>
                </RedoUndoStackProvider>
            </StorageProvider>
        </ThemeProvider>
    </LocalConfigProvider>
);
