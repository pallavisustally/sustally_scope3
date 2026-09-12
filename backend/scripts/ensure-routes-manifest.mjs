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

if (process.env.VERCEL && parentIsMonorepoRoot()) {
  const repoRoot = join(backendRoot, "..");
  const repoNext = join(repoRoot, ".next");
  const repoNextPkg = join(repoRoot, "node_modules", "next");
  const backendNextPkg = join(backendRoot, "node_modules", "next");

  mkdirSync(repoNext, { recursive: true });
  cpSync(nextDir, repoNext, { recursive: true, force: true });

  if (existsSync(backendNextPkg)) {
    mkdirSync(dirname(repoNextPkg), { recursive: true });
    cpSync(backendNextPkg, repoNextPkg, { recursive: true, force: true });
  }

  console.log("Copied backend .next and next package for Vercel Git finalization");
}
