/** Runs the project checker over every recorded sample. Usage: tsx scripts/check-samples.mts */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { checkProject } from "../src/lib/project-files";

const dir = path.join(process.cwd(), "src", "data", "samples");
let failed = false;
for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  const { files } = JSON.parse(readFileSync(path.join(dir, file), "utf8"));
  const issues = checkProject(files);
  console.log(`${file}: ${issues.length === 0 ? "OK" : issues.map((i) => `${i.path} ${i.message}`).join("; ")}`);
  failed ||= issues.length > 0;
}
process.exit(failed ? 1 : 0);
