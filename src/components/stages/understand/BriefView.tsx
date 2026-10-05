"use client";

import clsx from "clsx";
import { Plus, RefreshCw, Users, X } from "lucide-react";
import { useState } from "react";
import { Badge, Card, Eyebrow } from "@/components/ui";
import type { Brief, Feature } from "@/lib/schemas";

const PRIORITIES: Feature["priority"][] = ["must", "should", "could"];
const PRIORITY_STYLE = { must: "text-accent border-accent/40", should: "text-warn border-warn/40", could: "text-muted border-line-strong" };

export function BriefView({ brief, onChange, onRegenerate }: { brief: Brief; onChange: (b: Brief) => void; onRegenerate: () => void }) {
  const [newFeature, setNewFeature] = useState("");

  const setFeature = (id: string, patch: Partial<Feature>) =>
    onChange({ ...brief, features: brief.features.map((f) => (f.id === id ? { ...f, ...patch } : f)) });
  const removeFeature = (id: string) => onChange({ ...brief, features: brief.features.filter((f) => f.id !== id) });
  const addFeature = () => {
    const name = newFeature.trim().slice(0, 80);
    if (!name || brief.features.length >= 10) return;
    const feature: Feature = { id: `custom-${Date.now()}`, name, description: name, priority: "should", userStory: `As a user, I want ${name.toLowerCase()}.` };
    onChange({ ...brief, features: [...brief.features, feature] });
    setNewFeature("");
  };

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line bg-gradient-to-br from-accent/10 to-transparent p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <Eyebrow>App brief · editable</Eyebrow>
            <input
              value={brief.name}
              onChange={(e) => onChange({ ...brief, name: e.target.value.slice(0, 40) })}
              aria-label="App name"
              className="mt-2 w-full bg-transparent text-3xl font-bold outline-none"
            />
            <input
              value={brief.tagline}
              onChange={(e) => onChange({ ...brief, tagline: e.target.value.slice(0, 120) })}
              aria-label="Tagline"
              className="mt-1 w-full bg-transparent text-muted outline-none"
            />
          </div>
          <button onClick={onRegenerate} className="flex items-center gap-1 text-xs text-muted hover:text-fg">
            <RefreshCw className="size-3" /> Regenerate
          </button>
        </div>
        <p className="mt-4 text-sm leading-relaxed">{brief.problem}</p>
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_1.4fr]">
        <section>
          <h3 className="flex items-center gap-2 text-sm font-semibold"><Users className="size-4 text-accent" /> Who it&apos;s for</h3>
          <div className="mt-3 space-y-3">
            {brief.personas.map((p) => (
              <div key={p.name} className="rounded-xl border border-line bg-surface-2 p-3">
                <p className="text-sm font-semibold">{p.name}</p>
                <p className="mt-1 text-xs text-muted">{p.description}</p>
                <ul className="mt-2 space-y-0.5 text-xs text-muted">
                  {p.needs.map((n) => <li key={n}>• {n}</li>)}
                </ul>
              </div>
            ))}
          </div>
          {brief.outOfScope.length > 0 && (
            <>
              <h3 className="mt-5 text-sm font-semibold">Out of scope for v1</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">{brief.outOfScope.map((o) => <Badge key={o}>{o}</Badge>)}</div>
            </>
          )}
          {brief.assumptions.length > 0 && (
            <>
              <h3 className="mt-5 text-sm font-semibold">Assumptions</h3>
              <ul className="mt-2 space-y-1 text-xs text-muted">{brief.assumptions.map((a) => <li key={a}>• {a}</li>)}</ul>
            </>
          )}
        </section>

        <section>
          <h3 className="text-sm font-semibold">Features <span className="font-normal text-faint">— set priorities (MoSCoW)</span></h3>
          <ul className="mt-3 space-y-2">
            {brief.features.map((f) => (
              <li key={f.id} className="group rounded-xl border border-line bg-surface-2 p-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{f.name}</p>
                    <p className="mt-0.5 text-xs text-muted">{f.description}</p>
                    <p className="mt-1.5 text-xs italic text-faint">{f.userStory}</p>
                  </div>
                  <select
                    value={f.priority}
                    onChange={(e) => setFeature(f.id, { priority: e.target.value as Feature["priority"] })}
                    aria-label={`Priority for ${f.name}`}
                    className={clsx("rounded-lg border bg-bg px-2 py-1 text-xs font-semibold uppercase", PRIORITY_STYLE[f.priority])}
                  >
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <button onClick={() => removeFeature(f.id)} aria-label={`Remove ${f.name}`} className="p-1 text-faint hover:text-accent">
                    <X className="size-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <input
              value={newFeature}
              onChange={(e) => setNewFeature(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addFeature()}
              placeholder="Add a feature…"
              aria-label="New feature"
              className="flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <button onClick={addFeature} aria-label="Add feature" className="rounded-lg border border-line-strong px-3 text-muted hover:text-fg">
              <Plus className="size-4" />
            </button>
          </div>
        </section>
      </div>
    </Card>
  );
}
