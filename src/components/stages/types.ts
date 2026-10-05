import type { Stage } from "@/lib/constants";
import type { ProjectUpdater } from "@/lib/hooks";
import type { Project } from "@/lib/project";

export interface StageProps {
  project: Project;
  update: ProjectUpdater;
  goTo: (stage: Stage) => void;
}
