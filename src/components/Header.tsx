"use client";

import { Settings, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { getStatus } from "@/lib/api-client";
import { useSettings } from "@/lib/store";
import { useMounted } from "@/lib/use-mounted";
import { SettingsDialog } from "./SettingsDialog";

export function useAiStatus() {
  const [serverAi, setServerAi] = useState<boolean | null>(null);
  const userKey = useSettings((s) => s.geminiKey);
  const mounted = useMounted();
  useEffect(() => {
    getStatus().then((s) => setServerAi(s.aiEnabled));
  }, []);
  return { serverAi, aiAvailable: Boolean(serverAi) || (mounted && Boolean(userKey)), checked: serverAi !== null };
}

export function Header({ children }: { children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { serverAi, aiAvailable, checked } = useAiStatus();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-4 px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg border border-line-strong bg-surface-2">
            <Sparkles className="size-4 text-accent" />
          </span>
          <span className="font-bold tracking-tight">Lunor.AI</span>
          <span className="rounded-md bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">App Studio</span>
        </Link>
        <div className="min-w-0 flex-1">{children}</div>
        {checked && !aiAvailable && (
          <button onClick={() => setOpen(true)} className="hidden text-xs text-warn hover:underline sm:block">
            Demo mode — add a Gemini key
          </button>
        )}
        <button
          onClick={() => setOpen(true)}
          aria-label="Settings"
          className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-3 hover:text-fg"
        >
          <Settings className="size-4" />
        </button>
      </div>
      <SettingsDialog open={open} onClose={() => setOpen(false)} aiEnabled={Boolean(serverAi)} />
    </header>
  );
}
