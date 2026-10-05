"use client";

import clsx from "clsx";
import { ArrowRight, Code2, Network } from "lucide-react";
import { useState } from "react";
import { CodeEditor, type LineHighlight } from "@/components/CodeEditor";
import { FileTree } from "@/components/FileTree";
import { Button } from "@/components/ui";
import { useSettings } from "@/lib/store";
import type { StageProps } from "../types";
import { ArchitectureMap } from "./ArchitectureMap";
import { ExplanationPanel } from "./ExplanationPanel";

type View = "walkthrough" | "architecture";

export function ExplainStage({ project, update, goTo }: StageProps) {
  const paths = Object.keys(project.files);
  const [view, setView] = useState<View>("walkthrough");
  const [selected, setSelected] = useState(() => (project.files["App.js"] !== undefined ? "App.js" : paths[0]));
  const [highlight, setHighlight] = useState<LineHighlight | null>(null);
  const [selection, setSelection] = useState("");
  const { level, setLevel } = useSettings();

  const open = (path: string) => {
    setSelected(path);
    setHighlight(null);
    setSelection("");
    setView("walkthrough");
  };

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-2.5">
        <div className="flex rounded-xl border border-line-strong p-0.5" role="tablist" aria-label="Explain views">
          {([["walkthrough", "Code walkthrough", Code2], ["architecture", "Architecture map", Network]] as const).map(([v, label, Icon]) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={clsx("flex items-center gap-1.5 rounded-lg px-3 py-1 text-sm", view === v ? "bg-surface-3 text-fg" : "text-muted hover:text-fg")}
            >
              <Icon className="size-3.5" /> {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted">
          Level:
          {(["beginner", "intermediate"] as const).map((l) => (
            <button key={l} onClick={() => setLevel(l)} className={clsx("rounded-md px-2 py-0.5 capitalize", level === l ? "bg-accent-soft text-accent" : "hover:text-fg")}>
              {l}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <Button size="sm" onClick={() => goTo("learn")} icon={<ArrowRight className="size-3.5" />}>Turn this into lessons</Button>
        </div>
      </div>

      {view === "architecture" ? (
        <ArchitectureMap project={project} onOpenFile={open} />
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[200px_minmax(0,1fr)_400px]">
          <aside className="hidden overflow-y-auto border-r border-line lg:block">
            <FileTree paths={paths} selected={selected} onSelect={open} />
          </aside>
          <section className="flex min-h-[320px] min-w-0 flex-col border-r border-line">
            <div className="border-b border-line px-3 py-2 font-mono text-xs text-muted">
              {selected} <span className="font-sans text-faint">· read-only · select code to ask about it</span>
            </div>
            <div className="min-h-0 flex-1">
              {selected && <CodeEditor path={`explain/${selected}`} value={project.files[selected] ?? ""} readOnly highlight={highlight} onSelectionText={setSelection} />}
            </div>
          </section>
          <aside className="min-h-0 overflow-y-auto">
            {selected && (
              <ExplanationPanel
                key={`${selected}:${level}`}
                project={project}
                update={update}
                path={selected}
                level={level}
                selection={selection}
                activeRange={highlight}
                onHighlight={setHighlight}
              />
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
