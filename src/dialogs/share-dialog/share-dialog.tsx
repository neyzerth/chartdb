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
import { Toggle } from '@/components/toggle/toggle';
import type { BaseDialogProps } from '../common/base-dialog-props';
import { useTranslation } from 'react-i18next';
import { useChartDB } from '@/hooks/use-chartdb';
import { useToast } from '@/components/toast/use-toast';
import { Copy, CopyCheck } from 'lucide-react';
import { Input } from '@/components/input/input';
import { Label } from '@/components/label/label';
import { buildEmbedURL, buildShareURL } from '@/lib/share/share-utils';

export interface ShareDialogProps extends BaseDialogProps {}

export const ShareDialog: React.FC<ShareDialogProps> = ({ dialog }) => {
    const { t } = useTranslation();
    const { currentDiagram } = useChartDB();
    const { closeShareDialog } = useDialog();
    const { toast } = useToast();
    const [isCopied, setIsCopied] = useState(false);
    const [isEmbed, setIsEmbed] = useState(false);

    const shareURL = useMemo(
        () => (currentDiagram ? buildShareURL(currentDiagram) : ''),
        [currentDiagram]
    );

    const embedURL = useMemo(
        () => (currentDiagram ? buildEmbedURL(currentDiagram) : ''),
        [currentDiagram]
    );

    const displayedURL = isEmbed ? embedURL : shareURL;

    useEffect(() => {
        if (!dialog.open) return;
        setIsCopied(false);
        setIsEmbed(false);
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
                <div className="grid w-full gap-4 py-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="share-url">
                            {isEmbed
                                ? t('share_dialog.embed_url_label')
                                : t('share_dialog.share_link_label')}
                        </Label>
                        <Toggle
                            id="embed-toggle"
                            pressed={isEmbed}
                            onPressedChange={setIsEmbed}
                            size="sm"
                            variant="outline"
                            aria-label={t('share_dialog.embed_label')}
                        >
                            {t('share_dialog.embed_label')}
                        </Toggle>
                    </div>
                    <div className="flex items-center gap-2">
                        <Input
                            id="share-url"
                            readOnly
                            value={displayedURL}
                            className="font-mono text-xs"
                        />
                        <CopyButton text={displayedURL} />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={closeShareDialog} variant="secondary">
                        {t('export_diagram_dialog.cancel')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
