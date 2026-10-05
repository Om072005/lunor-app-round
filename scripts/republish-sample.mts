/** Re-publishes a recorded sample's Snack preview (e.g. after dependency fixes). Usage: tsx scripts/republish-sample.ts <slug> [baseUrl] */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { filesHash, type Project } from "../src/lib/project";

const [slug, base = "http://localhost:3100"] = process.argv.slice(2);
const file = path.join(process.cwd(), "src", "data", "samples", `${slug}.json`);
const project = JSON.parse(readFileSync(file, "utf8")) as Project;
const res = await fetch(`${base}/api/snack`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: project.brief?.name ?? slug, files: project.files }),
});
if (!res.ok) throw new Error(`snack ${res.status}: ${await res.text()}`);
const snack = await res.json();
writeFileSync(file, JSON.stringify({ ...project, snack, snackHash: filesHash(project.files) }, null, 2));
console.log(snack.embedUrl);
