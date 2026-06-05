import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const webSrcRoot = path.resolve(import.meta.dirname, "../src");
const forbiddenPatterns = [
  /@db(?:\/|$)/,
  /@redis(?:\/|$)/,
  /@env\/server/,
  /@auth\/server/,
  /@email(?:\/|$)/,
  /packages\/db\//,
  /packages\/redis\//,
];

async function collectSourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return collectSourceFiles(fullPath);
      }

      if (/\.(ts|tsx)$/.test(entry.name)) {
        return [fullPath];
      }

      return [];
    }),
  );

  return files.flat();
}

const files = await collectSourceFiles(webSrcRoot);
const violations: string[] = [];

for (const file of files) {
  const source = await readFile(file, "utf8");

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(source)) {
      violations.push(`${path.relative(webSrcRoot, file)} matches ${pattern}`);
    }
  }
}

if (violations.length > 0) {
  console.error("Web app must not import server-only packages:\n");
  console.error(violations.join("\n"));
  process.exit(1);
}

console.log("Web client boundary check passed.");
