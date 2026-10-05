"use client";

import { useMemo } from "react";
import { FlowGraph, type GraphNode } from "@/components/FlowGraph";
import { Card } from "@/components/ui";
import type { Project } from "@/lib/project";
import { buildImportGraph, type FileKind } from "@/lib/project-files";

const KIND_META: Record<FileKind, { label: string; tone: NonNullable<GraphNode["tone"]>; explain: string }> = {
  entry: { label: "Entry point", tone: "accent", explain: "Expo starts here. It sets up navigation and global providers." },
  screen: { label: "Screens", tone: "info", explain: "One per page the user can navigate to." },
  component: { label: "Components", tone: "neutral", explain: "Reusable UI pieces shared by screens." },
  state: { label: "State / context", tone: "ok", explain: "Holds app data in React context and persists it with AsyncStorage." },
  data: { label: "Data", tone: "warn", explain: "Seed data and helpers that feed the state layer." },
  other: { label: "Shared", tone: "neutral", explain: "Theme tokens and utilities." },
};

/** Architecture view derived from the real import graph — not an AI guess — so it always matches the code. */
export function ArchitectureMap({ project, onOpenFile }: { project: Project; onOpenFile: (path: string) => void }) {
  const graph = useMemo(() => buildImportGraph(project.files), [project.files]);
  const ordered = useMemo(() => {
    const entry = graph.nodes.filter((n) => n.kind === "entry");
    return [...entry, ...graph.nodes.filter((n) => n.kind !== "entry")];
  }, [graph]);

  const counts = graph.nodes.reduce<Partial<Record<FileKind, number>>>((acc, n) => ({ ...acc, [n.kind]: (acc[n.kind] ?? 0) + 1 }), {});

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <FlowGraph
        height={560}
        nodes={ordered.map((n) => ({ id: n.id, title: n.id.slice(n.id.lastIndexOf("/") + 1), subtitle: n.id, tone: KIND_META[n.kind].tone }))}
        edges={graph.edges.map((e) => [e.from, e.to])}
        onSelect={onOpenFile}
      />
      <div className="space-y-3">
        <Card className="p-4">
          <p className="text-sm font-semibold">How your app is wired</p>
          <p className="mt-1 text-xs text-muted">
            Arrows show imports: <span className="font-mono">A → B</span> means A uses B. Data flows down from the entry point. Click any file to open its walkthrough.
          </p>
        </Card>
        {(Object.keys(KIND_META) as FileKind[])
          .filter((k) => counts[k])
          .map((k) => (
            <Card key={k} className="p-4">
              <p className="text-sm font-semibold">{KIND_META[k].label} <span className="font-normal text-faint">· {counts[k]}</span></p>
              <p className="mt-1 text-xs text-muted">{KIND_META[k].explain}</p>
            </Card>
          ))}
        <Card className="p-4">
          <p className="text-xs text-muted">
            {graph.nodes.length} files · {graph.edges.length} import links · {Object.values(project.files).reduce((n, c) => n + c.split("\n").length, 0)} lines of code
          </p>
        </Card>
      </div>
    </div>
  );
}
