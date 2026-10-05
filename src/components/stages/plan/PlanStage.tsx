"use client";

import { AlertTriangle, ArrowRight, Check, Database, GitBranch, HardDrive, Layers, RefreshCw, Smartphone } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { FlowGraph } from "@/components/FlowGraph";
import { Badge, Button, Card, ErrorNote, SectionTitle, Thinking } from "@/components/ui";
import { postJson } from "@/lib/api-client";
import { useAsyncAction } from "@/lib/hooks";
import type { Plan } from "@/lib/schemas";
import type { StageProps } from "../types";

export function PlanStage({ project, update, goTo }: StageProps) {
  const { brief, plan, planApproved } = project;
  const hasCode = Object.keys(project.files).length > 0;

  const generate = useAsyncAction(
    useCallback(
      async (signal: AbortSignal) => {
        if (!brief) return;
        const result = await postJson<Plan>("/api/plan", { brief }, signal);
        update((p) => ({ ...p, plan: result, planApproved: false }));
      },
      [brief, update],
    ),
  );

  const started = useRef(false);
  useEffect(() => {
    if (brief && !plan && !started.current) {
      started.current = true;
      generate.run();
    }
  }, [brief, plan, generate]);

  const approve = () => {
    update((p) => ({ ...p, planApproved: true, currentStage: "build" }));
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <SectionTitle
        eyebrow="Stage 2 · Plan"
        title={plan ? `How we'll build ${brief?.name}` : "Planning your app"}
        subtitle="Before any code: the stack and why, the screens and how they connect, the data, and the order we'll build in. Nothing is built until you approve."
        actions={
          plan && !hasCode ? (
            <Button variant="secondary" size="sm" onClick={() => generate.run()} loading={generate.loading} icon={<RefreshCw className="size-3.5" />}>
              Regenerate plan
            </Button>
          ) : null
        }
      />

      {generate.loading && (
        <Thinking label="Designing the architecture…" steps={["Choosing the right stack for this app", "Mapping screens and navigation", "Modelling the data", "Splitting the build into milestones"]} />
      )}
      {generate.error && <ErrorNote message={generate.error} onRetry={() => generate.run()} />}

      {plan && !generate.loading && (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <div className="flex items-center gap-2">
                <Smartphone className="size-4 text-accent" />
                <h3 className="font-semibold">Stack decision</h3>
              </div>
              <p className="mt-3 text-xl font-bold">{plan.stack.choice}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{plan.stack.reason}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {plan.stack.alternatives.map((a) => (
                  <div key={a.name} className="rounded-xl border border-line bg-surface-2 p-3">
                    <p className="text-xs font-semibold">Why not {a.name}?</p>
                    <p className="mt-1 text-xs text-muted">{a.whyNot}</p>
                  </div>
                ))}
              </div>
            </Card>
            <div className="space-y-4">
              <Card className="p-5">
                <div className="flex items-center gap-2"><GitBranch className="size-4 text-accent" /><h3 className="font-semibold">Navigation</h3><Badge tone="accent">{plan.navigation.pattern}</Badge></div>
                <p className="mt-2 text-sm text-muted">{plan.navigation.reason}</p>
              </Card>
              <Card className="p-5">
                <div className="flex items-center gap-2"><HardDrive className="size-4 text-accent" /><h3 className="font-semibold">Storage</h3></div>
                <p className="mt-2 text-sm font-medium">{plan.storage.choice}</p>
                <p className="mt-1 text-sm text-muted">{plan.storage.reason}</p>
                <p className="mt-2 text-xs text-faint"><span className="font-semibold text-muted">In production:</span> {plan.storage.productionUpgrade}</p>
              </Card>
            </div>
          </div>

          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2"><Layers className="size-4 text-accent" /><h3 className="font-semibold">Screen flow</h3><span className="text-xs text-faint">drag to explore</span></div>
            <FlowGraph
              nodes={plan.screens.map((s, i) => ({ id: s.id, title: s.name, subtitle: s.purpose, tone: i === 0 ? "accent" : "neutral" }))}
              edges={plan.screens.flatMap((s) => s.navigatesTo.map((t) => [s.id, t] as [string, string]))}
            />
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {plan.screens.map((s) => (
                <div key={s.id} className="rounded-xl border border-line bg-surface-2 p-3">
                  <p className="text-sm font-semibold">{s.name} <span className="font-mono text-[10px] text-faint">{s.id}</span></p>
                  <p className="mt-1 text-xs text-muted">{s.purpose}</p>
                  <div className="mt-2 flex flex-wrap gap-1">{s.components.map((c) => <Badge key={c}>{c}</Badge>)}</div>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <div className="flex items-center gap-2"><Database className="size-4 text-accent" /><h3 className="font-semibold">Data model</h3></div>
              <div className="mt-3 space-y-3">
                {plan.dataModel.map((e) => (
                  <div key={e.name} className="overflow-hidden rounded-xl border border-line">
                    <div className="bg-surface-2 px-3 py-2"><p className="font-mono text-sm font-semibold">{e.name}</p><p className="text-xs text-muted">{e.description}</p></div>
                    <table className="w-full text-xs">
                      <tbody>
                        {e.fields.map((f) => (
                          <tr key={f.name} className="border-t border-line">
                            <td className="px-3 py-1.5 font-mono">{f.name}</td>
                            <td className="px-3 py-1.5 font-mono text-info">{f.type}</td>
                            <td className="px-3 py-1.5 text-muted">{f.note}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="font-semibold">Build milestones</h3>
              <ol className="mt-3 space-y-3">
                {plan.milestones.map((m, i) => (
                  <li key={m.id} className="relative rounded-xl border border-line bg-surface-2 p-3 pl-12">
                    <span className="absolute left-3 top-3 grid size-6 place-items-center rounded-full bg-accent-soft text-xs font-bold text-accent">{i + 1}</span>
                    <p className="text-sm font-semibold">{m.title}</p>
                    <p className="mt-0.5 text-xs text-muted">{m.goal}</p>
                    <div className="mt-2 flex flex-wrap gap-1">{m.concepts.map((c) => <Badge key={c} tone="accent">{c}</Badge>)}</div>
                  </li>
                ))}
              </ol>
              {plan.risks.length > 0 && (
                <div className="mt-4 rounded-xl border border-warn/30 bg-warn-soft p-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-warn"><AlertTriangle className="size-3.5" /> Risks to watch</p>
                  <ul className="mt-1 space-y-0.5 text-xs text-muted">{plan.risks.map((r) => <li key={r}>• {r}</li>)}</ul>
                </div>
              )}
            </Card>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            {planApproved ? (
              <Button onClick={() => goTo("build")} icon={<ArrowRight className="size-4" />}>Continue building</Button>
            ) : (
              <Button onClick={approve} icon={<Check className="size-4" />}>Approve plan & start building</Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
