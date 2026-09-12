import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const cmsRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(cmsRoot, ".next", "routes-manifest.json");

if (!existsSync(src)) {
  console.warn("routes-manifest.json was not found; skipping Vercel manifest copy");
  process.exit(0);
}

const dests = [join(cmsRoot, ".next", "routes-manifest-deterministic.json")];

if (process.env.VERCEL) {
  const repoRootNext = join(cmsRoot, "..", ".next");
  dests.push(join(repoRootNext, "routes-manifest.json"));
  dests.push(join(repoRootNext, "routes-manifest-deterministic.json"));
}

for (const dest of dests) {
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
}
