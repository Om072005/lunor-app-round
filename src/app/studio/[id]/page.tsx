"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Header } from "@/components/Header";
import { Stepper } from "@/components/Stepper";
import { BuildStage } from "@/components/stages/build/BuildStage";
import { ExplainStage } from "@/components/stages/explain/ExplainStage";
import { LearnStage } from "@/components/stages/learn/LearnStage";
import { PlanStage } from "@/components/stages/plan/PlanStage";
import { UnderstandStage } from "@/components/stages/understand/UnderstandStage";
import type { Stage } from "@/lib/constants";
import { useProject } from "@/lib/hooks";
import { nextMilestone, unlockedStages, type Project } from "@/lib/project";
import { useMounted } from "@/lib/use-mounted";

function doneStages(p: Project): Stage[] {
  const done: Stage[] = [];
  if (p.brief) done.push("understand");
  if (p.planApproved) done.push("plan");
  if (p.plan && !nextMilestone(p)) done.push("build");
  if (Object.keys(p.explanations).length > 0) done.push("explain");
  if (p.learning && p.progress.lessonsRead.length === p.learning.lessons.length) done.push("learn");
  return done;
}

export default function StudioPage() {
  const { id } = useParams<{ id: string }>();
  const mounted = useMounted();
  const { project, update } = useProject(id);

  if (!mounted) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="size-6 animate-spin text-accent" />
      </div>
    );
  }

  if (!project) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-md px-4 py-24 text-center">
          <h1 className="text-2xl font-bold">Project not found</h1>
          <p className="mt-2 text-muted">Projects are saved in this browser. It may have been deleted or created on another device.</p>
          <Link href="/" className="mt-6 inline-block font-semibold text-accent hover:underline">← Start a new app</Link>
        </main>
      </>
    );
  }

  const goTo = (stage: Stage) => update((p) => ({ ...p, currentStage: stage }));
  const stageProps = { project, update, goTo };

  return (
    <>
      <Header>
        <div className="flex items-center justify-center">
          <Stepper current={project.currentStage} unlocked={unlockedStages(project)} done={doneStages(project)} onSelect={goTo} />
        </div>
      </Header>
      <main className="flex-1">
        {project.currentStage === "understand" && <UnderstandStage {...stageProps} />}
        {project.currentStage === "plan" && <PlanStage {...stageProps} />}
        {project.currentStage === "build" && <BuildStage {...stageProps} />}
        {project.currentStage === "explain" && <ExplainStage {...stageProps} />}
        {project.currentStage === "learn" && <LearnStage {...stageProps} />}
      </main>
    </>
  );
}
