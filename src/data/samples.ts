import type { Project } from "@/lib/project";

/**
 * Fully built sample projects, recorded from real runs of the pipeline. They let
 * anyone walk every stage instantly — even with no API key or exhausted quota.
 */
export interface SampleMeta {
  project: Project;
  emoji: string;
  blurb: string;
}

export const SAMPLES: SampleMeta[] = [];
