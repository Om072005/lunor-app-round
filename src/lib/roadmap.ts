/**
 * Lunor.AI's existing App Development roadmap (lunor.online/domain/app-development).
 * Lessons generated from the user's app are mapped onto these levels so the
 * studio plugs into Lunor's LEARN track instead of inventing a parallel one.
 */
export const LUNOR_APP_DEV_ROADMAP: ReadonlyArray<{ level: number; title: string; tier: string }> = [
  { level: 1, title: "Mobile Basics", tier: "Beginner" },
  { level: 2, title: "React Native Setup", tier: "Beginner" },
  { level: 3, title: "Core Components", tier: "Beginner" },
  { level: 4, title: "Styling & Layout", tier: "Beginner" },
  { level: 5, title: "Lists & ScrollViews", tier: "Beginner" },
  { level: 6, title: "Navigation", tier: "Beginner" },
  { level: 7, title: "Forms & Input", tier: "Easy" },
  { level: 8, title: "State & Hooks", tier: "Easy" },
  { level: 9, title: "Async Storage", tier: "Easy" },
  { level: 10, title: "Networking & APIs", tier: "Easy" },
  { level: 11, title: "Native Modules", tier: "Easy" },
  { level: 12, title: "Animations", tier: "Easy" },
  { level: 13, title: "Gestures", tier: "Intermediate" },
  { level: 14, title: "Camera & Media", tier: "Intermediate" },
  { level: 15, title: "Push Notifications", tier: "Intermediate" },
  { level: 16, title: "Maps & Location", tier: "Intermediate" },
  { level: 17, title: "Auth Flows", tier: "Intermediate" },
  { level: 18, title: "Offline First", tier: "Intermediate" },
  { level: 19, title: "Deep Linking", tier: "Advanced" },
  { level: 20, title: "Theming", tier: "Advanced" },
  { level: 21, title: "Performance Profiling", tier: "Advanced" },
  { level: 22, title: "Testing", tier: "Advanced" },
  { level: 23, title: "Expo Build Pipeline", tier: "Advanced" },
  { level: 24, title: "App Store Assets", tier: "Advanced" },
  { level: 25, title: "Analytics", tier: "Expert" },
  { level: 26, title: "Crash Reporting", tier: "Expert" },
  { level: 27, title: "In-App Purchases", tier: "Expert" },
  { level: 28, title: "Accessibility", tier: "Expert" },
  { level: 29, title: "Release Management", tier: "Expert" },
  { level: 30, title: "Production App Project", tier: "Expert" },
];

export function roadmapLevel(level: number) {
  return LUNOR_APP_DEV_ROADMAP.find((l) => l.level === level);
}

export function roadmapPromptList(): string {
  return LUNOR_APP_DEV_ROADMAP.map((l) => `LV${l.level} ${l.title}`).join(", ");
}
