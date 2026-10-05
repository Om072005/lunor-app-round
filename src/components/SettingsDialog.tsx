"use client";

import { ExternalLink, KeyRound, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSettings } from "@/lib/store";
import { Button } from "./ui";

export function SettingsDialog({ open, onClose, aiEnabled }: { open: boolean; onClose: () => void; aiEnabled: boolean }) {
  const { geminiKey, setGeminiKey, level, setLevel } = useSettings();
  const [draft, setDraft] = useState(geminiKey);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const save = () => {
    setGeminiKey(draft);
    onClose();
  };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[min(520px,calc(100vw-32px))] rounded-2xl border border-line bg-surface p-0 text-fg backdrop:bg-black/70"
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="font-bold">Studio settings</h2>
        <button onClick={onClose} aria-label="Close settings" className="rounded-lg p-1 text-muted hover:bg-surface-3 hover:text-fg">
          <X className="size-4" />
        </button>
      </div>

      <div className="space-y-6 p-5">
        <section>
          <label htmlFor="gemini-key" className="flex items-center gap-2 text-sm font-semibold">
            <KeyRound className="size-4 text-accent" /> Your Gemini API key <span className="font-normal text-faint">(optional)</span>
          </label>
          <p className="mt-1 text-xs text-muted">
            {aiEnabled
              ? "This deployment has a shared free-tier key. Add your own to avoid shared rate limits."
              : "This deployment has no shared key. Add your own free key to enable AI generation."}{" "}
            The key stays in your browser and is only forwarded to Google.
          </p>
          <input
            id="gemini-key"
            type="password"
            autoComplete="off"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="AIza…"
            className="mt-3 w-full rounded-xl border border-line-strong bg-bg px-3 py-2.5 font-mono text-sm outline-none focus:border-accent"
          />
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs text-accent hover:underline"
          >
            Get a free key in Google AI Studio <ExternalLink className="size-3" />
          </a>
        </section>

        <section>
          <p className="text-sm font-semibold">Explanation level</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["beginner", "intermediate"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={`rounded-xl border px-3 py-2 text-sm capitalize ${level === l ? "border-accent bg-accent-soft text-fg" : "border-line-strong text-muted hover:text-fg"}`}
              >
                {l}
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
        {geminiKey && (
          <Button variant="ghost" onClick={() => { setDraft(""); setGeminiKey(""); }}>
            Remove key
          </Button>
        )}
        <Button onClick={save}>Save</Button>
      </div>
    </dialog>
  );
}
