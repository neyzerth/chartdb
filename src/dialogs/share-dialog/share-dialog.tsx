import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDialog } from '@/hooks/use-dialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/dialog/dialog';
import { Button } from '@/components/button/button';
import type { BaseDialogProps } from '../common/base-dialog-props';
import { useTranslation } from 'react-i18next';
import { useChartDB } from '@/hooks/use-chartdb';
import { useToast } from '@/components/toast/use-toast';
import { Copy, CopyCheck } from 'lucide-react';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/tabs/tabs';
import { Input } from '@/components/input/input';
import { Textarea } from '@/components/textarea/textarea';
import { Label } from '@/components/label/label';
import { buildEmbedURL, buildShareURL } from '@/lib/share/share-utils';

export interface ShareDialogProps extends BaseDialogProps {}

const DEFAULT_EMBED_WIDTH = 800;
const DEFAULT_EMBED_HEIGHT = 600;

export const ShareDialog: React.FC<ShareDialogProps> = ({ dialog }) => {
    const { t } = useTranslation();
    const { currentDiagram } = useChartDB();
    const { closeShareDialog } = useDialog();
    const { toast } = useToast();
    const [isCopied, setIsCopied] = useState(false);
    const [embedWidth, setEmbedWidth] = useState(DEFAULT_EMBED_WIDTH);
    const [embedHeight, setEmbedHeight] = useState(DEFAULT_EMBED_HEIGHT);

    const shareURL = useMemo(
        () => (currentDiagram ? buildShareURL(currentDiagram) : ''),
        [currentDiagram]
    );

    const embedURL = useMemo(
        () => (currentDiagram ? buildEmbedURL(currentDiagram) : ''),
        [currentDiagram]
    );

    const embedCode = useMemo(() => {
        return `<iframe src="${embedURL}" width="${embedWidth}" height="${embedHeight}" frameborder="0" title="ChartDB diagram"></iframe>`;
    }, [embedURL, embedWidth, embedHeight]);

    useEffect(() => {
        if (!dialog.open) return;
        setIsCopied(false);
        setEmbedWidth(DEFAULT_EMBED_WIDTH);
        setEmbedHeight(DEFAULT_EMBED_HEIGHT);
    }, [dialog.open]);

    useEffect(() => {
        if (!isCopied) return;
        const timeout = setTimeout(() => {
            setIsCopied(false);
        }, 1500);
        return () => clearTimeout(timeout);
    }, [isCopied]);

    const copyToClipboard = useCallback(
        async (text: string) => {
            if (!navigator?.clipboard) {
                toast({
                    title: t('copy_to_clipboard_toast.unsupported.title'),
                    variant: 'destructive',
                    description: t(
                        'copy_to_clipboard_toast.unsupported.description'
                    ),
                });
                return;
            }

            try {
                await navigator.clipboard.writeText(text);
                setIsCopied(true);
            } catch {
                setIsCopied(false);
                toast({
                    title: t('copy_to_clipboard_toast.failed.title'),
                    variant: 'destructive',
                    description: t(
                        'copy_to_clipboard_toast.failed.description'
                    ),
                });
            }
        },
        [t, toast]
    );

    const CopyButton = useCallback(
        ({ text }: { text: string }) => (
            <Button
                variant="secondary"
                size="sm"
                onClick={() => copyToClipboard(text)}
                className="shrink-0"
            >
                {isCopied ? (
                    <CopyCheck className="mr-2 size-4" />
                ) : (
                    <Copy className="mr-2 size-4" />
                )}
                {isCopied ? t('copied') : t('copy_to_clipboard')}
            </Button>
        ),
        [copyToClipboard, isCopied, t]
    );

    return (
        <Dialog
            {...dialog}
            onOpenChange={(open) => {
                if (!open) {
                    closeShareDialog();
                }
            }}
        >
            <DialogContent className="flex flex-col" showClose>
                <DialogHeader>
                    <DialogTitle>{t('share_dialog.title')}</DialogTitle>
                    <DialogDescription>
                        {t('share_dialog.description')}
                    </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="share" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="share">
                            {t('share_dialog.tab_share_link')}
                        </TabsTrigger>
                        <TabsTrigger value="embed">
                            {t('share_dialog.tab_embed')}
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="share" className="grid gap-4 py-2">
                        <div className="grid w-full items-center gap-2">
                            <Label htmlFor="share-url">
                                {t('share_dialog.share_link_label')}
                            </Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    id="share-url"
                                    readOnly
                                    value={shareURL}
                                    className="font-mono text-xs"
                                />
                                <CopyButton text={shareURL} />
                            </div>
                        </div>
                    </TabsContent>
                    <TabsContent value="embed" className="grid gap-4 py-2">
                        <div className="grid w-full grid-cols-2 items-center gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="embed-width">
                                    {t('share_dialog.embed_width')}
                                </Label>
                                <Input
                                    id="embed-width"
                                    type="number"
                                    min={1}
                                    value={embedWidth}
                                    onChange={(e) =>
                                        setEmbedWidth(
                                            Number(e.target.value) ||
                                                DEFAULT_EMBED_WIDTH
                                        )
                                    }
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="embed-height">
                                    {t('share_dialog.embed_height')}
                                </Label>
                                <Input
                                    id="embed-height"
                                    type="number"
                                    min={1}
                                    value={embedHeight}
                                    onChange={(e) =>
                                        setEmbedHeight(
                                            Number(e.target.value) ||
                                                DEFAULT_EMBED_HEIGHT
                                        )
                                    }
                                />
                            </div>
                        </div>
                        <div className="grid w-full items-center gap-2">
                            <Label htmlFor="embed-code">
                                {t('share_dialog.embed_code_label')}
                            </Label>
                            <Textarea
                                id="embed-code"
                                readOnly
                                value={embedCode}
                                className="min-h-[120px] font-mono text-xs"
                            />
                            <div className="flex justify-end">
                                <CopyButton text={embedCode} />
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
                <DialogFooter>
                    <Button onClick={closeShareDialog} variant="secondary">
                        {t('export_diagram_dialog.cancel')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
