"use client";

import { ArrowRight, BookOpen, Brain, Hammer, Lightbulb, Map, MessageSquareText, Smartphone, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Header, useAiStatus } from "@/components/Header";
import { Badge, Button, Card, Eyebrow } from "@/components/ui";
import { SAMPLES } from "@/data/samples";
import { LIMITS, STAGE_META, STAGES, type Stage } from "@/lib/constants";
import { useProjects } from "@/lib/store";
import { useMounted } from "@/lib/use-mounted";

const EXAMPLES = [
  "A habit tracker for college students with streaks and daily reminders",
  "An expense splitter for roommates that shows who owes whom",
  "A recipe app that suggests meals from ingredients I already have",
  "A study planner that breaks exams into daily Pomodoro sessions",
];

const STAGE_ICONS: Record<Stage, typeof Brain> = { understand: Brain, plan: Map, build: Hammer, explain: MessageSquareText, learn: BookOpen };

export default function Home() {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const create = useProjects((s) => s.create);
  const addSample = useProjects((s) => s.addSample);
  const { aiAvailable, checked } = useAiStatus();
  const tooShort = idea.trim().length < LIMITS.ideaMinChars;

  const start = () => {
    if (tooShort) return;
    router.push(`/studio/${create(idea)}`);
  };

  return (
    <>
      <Header />
      <main className="bg-grid">
        <section className="mx-auto max-w-5xl px-4 pb-12 pt-16 text-center sm:pt-24">
          <Badge tone="accent" className="mx-auto">
            <Smartphone className="size-3" /> New · App Development Studio
          </Badge>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl">
            Don&apos;t just generate an app. <span className="text-accent">Understand it.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted sm:text-lg">
            Describe your idea. Lunor clarifies it, plans it like a senior engineer, builds a real React Native app you can run on your
            phone — then explains every line and turns your own code into lessons.
          </p>

          <Card className="mx-auto mt-10 max-w-3xl p-2 text-left glow-accent">
            <label htmlFor="idea" className="sr-only">Describe your app idea</label>
            <textarea
              id="idea"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) start();
              }}
              maxLength={LIMITS.ideaMaxChars}
              rows={3}
              placeholder="Describe the app you want to build…  e.g. a habit tracker for students with streaks"
              className="w-full resize-none bg-transparent px-4 pt-3 text-base outline-none placeholder:text-faint"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 px-2 pb-1">
              <span className="text-xs text-faint">Ctrl + Enter to start · {idea.length}/{LIMITS.ideaMaxChars}</span>
              <Button onClick={start} disabled={tooShort} icon={<ArrowRight className="size-4" />}>
                Start with Understand
              </Button>
            </div>
          </Card>

          <div className="mx-auto mt-4 flex max-w-3xl flex-wrap justify-center gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => setIdea(ex)}
                className="rounded-full border border-line-strong bg-surface px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent/50 hover:text-fg"
              >
                <Lightbulb className="mr-1 inline size-3 text-accent" />
                {ex}
              </button>
            ))}
          </div>
          {checked && !aiAvailable && (
            <p className="mt-4 text-xs text-warn">
              AI generation is off on this deployment — add a free Gemini key in Settings (top right), or open a sample below.
            </p>
          )}
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16">
          <div className="text-center">
            <Eyebrow>Beyond prompt → app</Eyebrow>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Five stages. Each one feeds the next.</h2>
          </div>
          <ol className="mt-8 grid gap-3 sm:grid-cols-5">
            {STAGES.map((stage, i) => {
              const Icon = STAGE_ICONS[stage];
              return (
                <li key={stage} className="relative rounded-2xl border border-line bg-surface p-4">
                  <div className="flex items-center gap-2">
                    <span className="grid size-8 place-items-center rounded-lg bg-accent-soft text-accent">
                      <Icon className="size-4" />
                    </span>
                    <span className="text-xs font-semibold text-faint">0{i + 1}</span>
                  </div>
                  <p className="mt-3 font-semibold">{STAGE_META[stage].label}</p>
                  <p className="mt-1 text-sm text-muted">{STAGE_META[stage].blurb}</p>
                </li>
              );
            })}
          </ol>
        </section>

        {SAMPLES.length > 0 && (
          <section className="mx-auto max-w-6xl px-4 pb-16">
            <Eyebrow>Explore instantly — no API key needed</Eyebrow>
            <h2 className="mt-2 text-2xl font-bold">Fully built sample projects</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {SAMPLES.map(({ project, emoji, blurb }) => (
                <button
                  key={project.id}
                  onClick={() => router.push(`/studio/${addSample(project)}`)}
                  className="group flex items-start gap-4 rounded-2xl border border-line bg-surface p-5 text-left transition-colors hover:border-accent/50"
                >
                  <span className="text-3xl" aria-hidden>{emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 font-semibold">
                      {project.brief?.name} <ArrowRight className="size-4 text-accent opacity-0 transition-opacity group-hover:opacity-100" />
                    </span>
                    <span className="mt-1 block text-sm text-muted">{blurb}</span>
                    <span className="mt-3 flex flex-wrap gap-1.5">
                      <Badge>{Object.keys(project.files).length} files</Badge>
                      <Badge>{project.plan?.screens.length} screens</Badge>
                      <Badge>{project.learning?.lessons.length} lessons</Badge>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        <RecentProjects />
      </main>
      <footer className="border-t border-line py-6 text-center text-xs text-faint">
        Lunor App Studio prototype · Apps run on Expo SDK 54 via Expo Snack · AI by Google Gemini
      </footer>
    </>
  );
}

function RecentProjects() {
  const mounted = useMounted();
  const router = useRouter();
  const projects = useProjects((s) => s.projects);
  const remove = useProjects((s) => s.remove);
  if (!mounted) return null;
  const list = Object.values(projects).sort((a, b) => b.updatedAt - a.updatedAt);
  if (list.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 pb-20">
      <Eyebrow>Your projects</Eyebrow>
      <ul className="mt-4 divide-y divide-line rounded-2xl border border-line bg-surface">
        {list.map((p) => (
          <li key={p.id} className="flex items-center gap-3 px-4 py-3">
            <button onClick={() => router.push(`/studio/${p.id}`)} className="min-w-0 flex-1 text-left">
              <p className="truncate font-medium">{p.brief?.name ?? p.idea}</p>
              <p className="truncate text-xs text-muted">
                {STAGE_META[p.currentStage].label} · {Object.keys(p.files).length} files · {p.progress.xp} XP
                {p.isSample && " · sample"}
              </p>
            </button>
            <button
              onClick={() => remove(p.id)}
              aria-label={`Delete ${p.brief?.name ?? "project"}`}
              className="rounded-lg p-2 text-faint hover:bg-surface-3 hover:text-accent"
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
