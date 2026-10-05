"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import type { Level } from "./ai/prompts";
import { createProject, type Project } from "./project";

/** localStorage can be missing or throw (private mode, quota) — the app must keep working in memory. */
const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch (err) {
      console.warn("[store] could not persist projects", err);
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
}

interface ProjectsState {
  projects: Record<string, Project>;
  create: (idea: string) => string;
  addSample: (sample: Project) => string;
  update: (id: string, updater: (p: Project) => Project) => void;
  remove: (id: string) => void;
}

export const useProjects = create<ProjectsState>()(
  persist(
    (set) => ({
      projects: {},
      create: (idea) => {
        const project = createProject(idea, newId(), Date.now());
        set((s) => ({ projects: { ...s.projects, [project.id]: project } }));
        return project.id;
      },
      addSample: (sample) => {
        const id = `${sample.id}-${newId().slice(0, 4)}`;
        const copy: Project = { ...sample, id, isSample: true, createdAt: Date.now(), updatedAt: Date.now() };
        set((s) => ({ projects: { ...s.projects, [id]: copy } }));
        return id;
      },
      update: (id, updater) =>
        set((s) => {
          const current = s.projects[id];
          if (!current) return s;
          return { projects: { ...s.projects, [id]: { ...updater(current), updatedAt: Date.now() } } };
        }),
      remove: (id) =>
        set((s) => {
          const rest = { ...s.projects };
          delete rest[id];
          return { projects: rest };
        }),
    }),
    { name: "lunor-app-studio:projects", version: 1, storage: createJSONStorage(() => safeStorage) },
  ),
);

interface SettingsState {
  geminiKey: string;
  level: Level;
  setGeminiKey: (key: string) => void;
  setLevel: (level: Level) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      geminiKey: "",
      level: "beginner",
      setGeminiKey: (geminiKey) => set({ geminiKey: geminiKey.trim() }),
      setLevel: (level) => set({ level }),
    }),
    { name: "lunor-app-studio:settings", version: 1, storage: createJSONStorage(() => safeStorage) },
  ),
);
