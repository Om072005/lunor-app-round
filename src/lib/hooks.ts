"use client";

import { useCallback, useRef, useState } from "react";
import { ApiClientError } from "./api-client";
import type { Project } from "./project";
import { useProjects } from "./store";

export type ProjectUpdater = (updater: (p: Project) => Project) => void;

export function useProject(id: string): { project: Project | undefined; update: ProjectUpdater } {
  const project = useProjects((s) => s.projects[id]);
  const updateStore = useProjects((s) => s.update);
  const update = useCallback<ProjectUpdater>((updater) => updateStore(id, updater), [id, updateStore]);
  return { project, update };
}

function messageOf(err: unknown): string {
  if (err instanceof ApiClientError) return err.message;
  console.error(err);
  return "Something went wrong. Please try again.";
}

/**
 * Wraps one async AI action with loading/error state and cancellation of the
 * previous in-flight call, so double clicks never produce two writes.
 */
export function useAsyncAction<A extends unknown[]>(action: (signal: AbortSignal, ...args: A) => Promise<void>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);

  /** Resolves true on success, false on error or cancellation. */
  const run = useCallback(
    async (...args: A): Promise<boolean> => {
      controller.current?.abort();
      const ctrl = new AbortController();
      controller.current = ctrl;
      setLoading(true);
      setError(null);
      try {
        await action(ctrl.signal, ...args);
        return !ctrl.signal.aborted;
      } catch (err) {
        if ((err as Error).name !== "AbortError") setError(messageOf(err));
        return false;
      } finally {
        if (controller.current === ctrl) setLoading(false);
      }
    },
    [action],
  );

  const cancel = useCallback(() => {
    controller.current?.abort();
    setLoading(false);
  }, []);

  return { run, loading, error, cancel, clearError: () => setError(null) };
}
