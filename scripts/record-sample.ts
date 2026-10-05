/**
 * Drives the full Understand → Plan → Build → Explain → Learn pipeline against a
 * running server and saves the resulting project as a sample (src/data/samples/<slug>.json).
 * Doubles as an end-to-end smoke test of every AI route with the real model.
 *
 *   npx tsx scripts/record-sample.ts <slug> "<idea>" [baseUrl]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseFileStream } from "../src/lib/file-stream-parser";
import { applyFiles, contentHash, createProject, filesHash, type BuildLogEntry, type Project } from "../src/lib/project";
import { checkProject } from "../src/lib/project-files";
import type { Brief, FileExplanation, LearningPath, Plan, Understanding } from "../src/lib/schemas";
import type { SnackInfo } from "../src/lib/snack-urls";

const [slug, idea, base = "http://localhost:3100"] = process.argv.slice(2);
if (!slug || !idea) {
  console.error('Usage: tsx scripts/record-sample.ts <slug> "<idea>" [baseUrl]');
  process.exit(1);
}

const RETRIES = 3;

async function call(route: string, body: unknown): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${base}${route}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) return res;
    const text = await res.text();
    if (attempt >= RETRIES || ![429, 502, 503].includes(res.status)) throw new Error(`${route} ${res.status}: ${text}`);
    console.warn(`  ${route} ${res.status}, retrying in 20s…`);
    await new Promise((r) => setTimeout(r, 20_000));
  }
}

const json = async <T>(route: string, body: unknown) => (await (await call(route, body)).json()) as T;

async function stream(route: string, body: unknown) {
  const text = await (await call(route, body)).text();
  if (/<<<ERROR \w+>>>/.test(text)) throw new Error(`${route} stream error: ${text.slice(-200)}`);
  return parseFileStream(text);
}

function log(project: Project, kind: BuildLogEntry["kind"], title: string, notes: string, changedFiles: string[]): BuildLogEntry[] {
  return [...project.buildLog, { id: `${kind}-${project.buildLog.length}`, kind, title, notes, changedFiles, at: Date.now() }];
}

async function main() {
  const t0 = Date.now();
  let p = createProject(idea, slug, Date.now());

  console.log("1/5 Understand");
  const understanding = await json<Understanding>("/api/understand", { idea });
  const answers = Object.fromEntries(understanding.questions.map((q) => [q.id, [q.options[0]]]));
  const brief = await json<Brief>("/api/brief", { idea, questions: understanding.questions, answers });
  p = { ...p, understanding, answers, brief };
  console.log(`  → ${brief.name}: ${brief.features.length} features`);

  console.log("2/5 Plan");
  const plan = await json<Plan>("/api/plan", { brief });
  p = { ...p, plan, planApproved: true };
  console.log(`  → ${plan.screens.length} screens, ${plan.milestones.length} milestones`);

  console.log("3/5 Build");
  for (const [i, m] of plan.milestones.entries()) {
    const parsed = await stream("/api/build", { brief, plan, milestoneId: m.id, files: p.files });
    const { files, changed } = applyFiles(p.files, parsed.files);
    p = { ...p, files, builtMilestones: [...p.builtMilestones, m.id], buildLog: log(p, "milestone", `Milestone ${i + 1}: ${m.title}`, parsed.notes, changed) };
    console.log(`  → milestone ${i + 1} "${m.title}": ${changed.length} files`);
  }
  for (let round = 0; round < 2; round++) {
    const issues = checkProject(p.files);
    if (issues.length === 0) break;
    console.log(`  checker found ${issues.length} issue(s), fixing:`, issues.map((x) => x.message));
    const parsed = await stream("/api/modify", { brief, files: p.files, mode: "fix", issues: issues.map((x) => `${x.path}: ${x.message}`) });
    const { files, changed } = applyFiles(p.files, parsed.files);
    p = { ...p, files, buildLog: log(p, "fix", "Fixed checker issues", parsed.notes, changed) };
  }
  const remaining = checkProject(p.files);
  if (remaining.length > 0) console.warn("  ⚠ unresolved issues:", remaining);

  const snack = await json<SnackInfo>("/api/snack", { name: brief.name, files: p.files });
  p = { ...p, snack, snackHash: filesHash(p.files) };
  console.log(`  → preview ${snack.webUrl}`);

  console.log("4/5 Explain");
  const explainTargets = Object.keys(p.files).filter((f) => f === "App.js" || f.includes("/screens/") || f.includes("/context/"));
  for (const file of explainTargets) {
    const data = await json<FileExplanation>("/api/explain", { path: file, code: p.files[file], brief, level: "beginner" });
    p = { ...p, explanations: { ...p.explanations, [`beginner:${file}`]: { level: "beginner", hash: contentHash(p.files[file]), data } } };
    console.log(`  → ${file}: ${data.sections.length} sections`);
  }

  console.log("5/5 Learn");
  const learning = await json<LearningPath>("/api/learn", { brief, plan, files: p.files });
  p = { ...p, learning, currentStage: "build" };
  console.log(`  → ${learning.lessons.length} lessons: ${learning.lessons.map((l) => l.concept).join(", ")}`);

  const outDir = path.join(process.cwd(), "src", "data", "samples");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, `${slug}.json`), JSON.stringify(p, null, 2));
  console.log(`Saved src/data/samples/${slug}.json in ${Math.round((Date.now() - t0) / 1000)}s`);
}

main().catch((err) => {
  console.error("FAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
