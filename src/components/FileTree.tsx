"use client";

import clsx from "clsx";
import { FileCode2, FolderOpen, Loader2 } from "lucide-react";

function groupByDir(paths: string[]): [string, string[]][] {
  const groups = new Map<string, string[]>();
  for (const p of [...paths].sort()) {
    const i = p.lastIndexOf("/");
    const dir = i === -1 ? "" : p.slice(0, i);
    groups.set(dir, [...(groups.get(dir) ?? []), p]);
  }
  return [...groups.entries()].sort(([a], [b]) => (a === "" ? -1 : b === "" ? 1 : a.localeCompare(b)));
}

export function FileTree({
  paths,
  selected,
  onSelect,
  changed = [],
  streaming,
}: {
  paths: string[];
  selected?: string;
  onSelect: (path: string) => void;
  changed?: string[];
  streaming?: string;
}) {
  const all = streaming && !paths.includes(streaming) ? [...paths, streaming] : paths;
  if (all.length === 0) return <p className="px-3 py-4 text-xs text-faint">No files yet.</p>;

  return (
    <ul className="space-y-3 py-2 text-[13px]">
      {groupByDir(all).map(([dir, files]) => (
        <li key={dir || "root"}>
          {dir && (
            <p className="flex items-center gap-1.5 px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-faint">
              <FolderOpen className="size-3" /> {dir}
            </p>
          )}
          <ul>
            {files.map((path) => {
              const name = path.slice(path.lastIndexOf("/") + 1);
              const isStreaming = path === streaming;
              return (
                <li key={path}>
                  <button
                    onClick={() => onSelect(path)}
                    title={path}
                    className={clsx(
                      "flex w-full items-center gap-2 px-3 py-1 text-left transition-colors",
                      path === selected ? "bg-accent-soft text-fg" : "text-muted hover:bg-surface-3 hover:text-fg",
                      dir && "pl-5",
                    )}
                  >
                    {isStreaming ? <Loader2 className="size-3.5 shrink-0 animate-spin text-accent" /> : <FileCode2 className="size-3.5 shrink-0" />}
                    <span className="truncate">{name}</span>
                    {changed.includes(path) && !isStreaming && <span className="ml-auto size-1.5 shrink-0 rounded-full bg-accent" title="Changed in last step" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );
}
