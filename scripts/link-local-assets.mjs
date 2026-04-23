import fs from "node:fs";
import path from "node:path";

const target = process.argv[2];

if (!target) {
  console.error("Usage: npm run link:assets -- /absolute/path/to/export/folder");
  process.exit(1);
}

const resolvedTarget = path.resolve(target);
if (!fs.existsSync(resolvedTarget)) {
  console.error(`Asset folder not found: ${resolvedTarget}`);
  process.exit(1);
}

const linkPath = path.resolve("public/models/concept_puck_v3");
fs.mkdirSync(path.dirname(linkPath), { recursive: true });

try {
  const existing = fs.lstatSync(linkPath);
  if (existing.isSymbolicLink() || existing.isDirectory() || existing.isFile()) {
    fs.rmSync(linkPath, { recursive: true, force: true });
  }
} catch {}

fs.symlinkSync(resolvedTarget, linkPath, "dir");
console.log(`Linked ${linkPath} -> ${resolvedTarget}`);
