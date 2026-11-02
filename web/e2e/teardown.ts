import { execFileSync } from "node:child_process";
import path from "node:path";
export default function teardown() {
  execFileSync(
    path.resolve("../backend-ml/.venv/bin/python"),
    ["-m", "scripts.cleanup_qa"],
    { cwd: path.resolve("../backend-ml"), stdio: "pipe" },
  );
}
