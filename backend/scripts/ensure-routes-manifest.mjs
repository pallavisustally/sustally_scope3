import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const nextDir = join(backendRoot, ".next");
const routesManifest = join(nextDir, "routes-manifest.json");

if (!existsSync(nextDir) || !existsSync(routesManifest)) {
  process.exit(0);
}

function writeIfMissing(filePath, contents) {
  if (existsSync(filePath)) return;
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, contents);
}

copyFileSync(routesManifest, join(nextDir, "routes-manifest-deterministic.json"));
writeIfMissing(join(nextDir, "server", "pages-manifest.json"), "{}\n");

function parentIsMonorepoRoot() {
  const parentPkgPath = join(backendRoot, "..", "package.json");
  if (!existsSync(parentPkgPath)) return false;
  try {
    const name = JSON.parse(readFileSync(parentPkgPath, "utf8")).name;
    return name !== "sustally-scope-3-backend";
  } catch {
    return false;
  }
}

// If Vercel still traces from the git root, Git Integration looks for
// /vercel/path0/.next even when the app lives in backend/.
if (process.env.VERCEL && parentIsMonorepoRoot()) {
  const repoRoot = join(backendRoot, "..");
  cpSync(nextDir, join(repoRoot, ".next"), { recursive: true, force: true });
  console.log("Copied backend/.next to the repo root for Vercel Git finalization");
}
