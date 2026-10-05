"use client";

import { ExternalLink, Loader2, QrCode, RefreshCw, Smartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import type { SnackInfo } from "@/lib/snack-urls";
import { Button } from "./ui";

/**
 * The Snack embed renders a code pane plus a fixed ~285px device preview on the
 * right, framed by a 48px title bar and a 36px platform toggle. We size the
 * iframe wide and crop to just the device preview so it reads as a phone.
 */
const PREVIEW_WIDTH = 285;
const PREVIEW_HEIGHT = 560;
const EMBED_TOP_BAR = 48;
const EMBED_BOTTOM_BAR = 36;

export function PhonePreview({
  snack,
  stale,
  loading,
  error,
  onRefresh,
  hasFiles,
}: {
  snack?: SnackInfo;
  stale: boolean;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  hasFiles: boolean;
}) {
  const [showQr, setShowQr] = useState(false);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const frameLoading = Boolean(snack) && loadedSrc !== snack?.embedUrl;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative rounded-[42px] border-[10px] border-[#1f1f1f] bg-black shadow-2xl ring-1 ring-line-strong">
        <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-black" aria-hidden />
        <div className="relative overflow-hidden rounded-[32px] bg-white" style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }}>
          {snack && !showQr && (
            <iframe
              key={snack.embedUrl}
              src={snack.embedUrl}
              title="Live app preview"
              onLoad={() => setTimeout(() => setLoadedSrc(snack.embedUrl), 2500)}
              className="absolute right-0 border-0"
              style={{ top: -EMBED_TOP_BAR, width: 1100, height: PREVIEW_HEIGHT + EMBED_TOP_BAR + EMBED_BOTTOM_BAR }}
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          )}
          {snack && showQr && (
            <div className="flex h-full flex-col items-center justify-center gap-4 bg-white p-6 text-center text-black">
              <QRCodeSVG value={snack.expoUrl} size={180} />
              <p className="text-sm font-semibold">Run it on your phone</p>
              <p className="text-xs text-neutral-600">Install <b>Expo Go</b>, then scan this code (Android: in Expo Go · iOS: with the Camera app).</p>
            </div>
          )}
          {(!snack || frameLoading || loading) && !showQr && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface-2 p-6 text-center">
              {loading || frameLoading ? (
                <>
                  <Loader2 className="size-6 animate-spin text-accent" />
                  <p className="text-sm font-medium text-fg">{loading ? "Publishing to Expo Snack…" : "Booting your app…"}</p>
                  <p className="text-xs text-muted">Bundling React Native for the web preview</p>
                </>
              ) : (
                <>
                  <Smartphone className="size-8 text-faint" />
                  <p className="text-sm text-muted">{hasFiles ? "Preview not published yet." : "Your app appears here after the first milestone."}</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {error && <p className="max-w-[305px] text-center text-xs text-accent">{error}</p>}

      <div className="flex flex-wrap justify-center gap-2">
        {hasFiles && (
          <Button size="sm" variant={stale ? "primary" : "secondary"} onClick={onRefresh} loading={loading} icon={<RefreshCw className="size-3.5" />}>
            {stale ? "Update preview" : "Reload"}
          </Button>
        )}
        {snack && (
          <>
            <Button size="sm" variant="secondary" onClick={() => setShowQr((v) => !v)} icon={showQr ? <Smartphone className="size-3.5" /> : <QrCode className="size-3.5" />}>
              {showQr ? "Preview" : "On my phone"}
            </Button>
            <a href={snack.webUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-sm text-muted hover:bg-surface-3 hover:text-fg">
              Snack <ExternalLink className="size-3" />
            </a>
          </>
        )}
      </div>
      {stale && snack && !loading && <p className="text-xs text-warn">Code changed since this preview.</p>}
    </div>
  );
}
