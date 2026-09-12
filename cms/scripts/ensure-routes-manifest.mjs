import { copyFileSync, cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const cmsRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const cmsNext = join(cmsRoot, ".next");
const routesManifest = join(cmsNext, "routes-manifest.json");

if (!existsSync(cmsNext) || !existsSync(routesManifest)) {
  console.warn("CMS .next output was not found; skipping Vercel manifest copy");
  process.exit(0);
}

function writeIfMissing(filePath, contents) {
  if (existsSync(filePath)) return;
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, contents);
}

copyFileSync(routesManifest, join(cmsNext, "routes-manifest-deterministic.json"));
writeIfMissing(join(cmsNext, "server", "pages-manifest.json"), "{}\n");
writeIfMissing(join(cmsNext, "server", "pages-manifest-deterministic.json"), "{}\n");

if (process.env.VERCEL) {
  const repoRootNext = join(cmsRoot, "..", ".next");
  mkdirSync(repoRootNext, { recursive: true });
  cpSync(cmsNext, repoRootNext, { recursive: true, force: true });
  console.log("Copied CMS .next output for Vercel Git finalization");
}
