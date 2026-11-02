import { execFileSync } from "node:child_process";
import path from "node:path";
export default function setup() {
  execFileSync(
    path.resolve("../backend-ml/.venv/bin/python"),
    ["-m", "scripts.browser_fixture"],
    { cwd: path.resolve("../backend-ml"), stdio: "pipe" },
  );
}
