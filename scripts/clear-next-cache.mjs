import { rm } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const targets = [".next"];

function isInsideProject(targetPath) {
  const relative = path.relative(rootDir, targetPath);

  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

for (const target of targets) {
  const targetPath = path.resolve(rootDir, target);

  if (!isInsideProject(targetPath)) {
    throw new Error(`Refusing to remove a path outside the project: ${targetPath}`);
  }

  await rm(targetPath, { force: true, recursive: true });
  console.log(`Cleared ${target}`);
}
