import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
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
