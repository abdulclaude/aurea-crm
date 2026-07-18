import { readdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const testFiles = collectTests(path.join(process.cwd(), "src"));
const result = spawnSync(
  process.execPath,
  ["--conditions=react-server", "--import", "tsx", "--test", ...testFiles],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "test",
      ENCRYPTION_KEY:
        process.env.ENCRYPTION_KEY ?? "aurea-local-test-encryption-key",
    },
    stdio: "inherit",
  },
);

if (result.error) throw result.error;
process.exit(result.status ?? 1);

function collectTests(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTests(entryPath));
    } else if (/\.test\.tsx?$/.test(entry.name) && entryPath.includes(`${path.sep}__tests__${path.sep}`)) {
      files.push(entryPath);
    }
  }
  return files.sort();
}
