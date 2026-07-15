// Clipper cache: post step. Pushes the volume's changes to the key tag and
// unmounts. Runs per action.yml's post-if (job success, or opt-in via
// CLIPPER_CACHE_ON_FAILURE), matching actions/cache save semantics.
const { spawnSync } = require("node:child_process");

const state = (name) => process.env[`STATE_${name}`] ?? "";

const run = (args) => spawnSync("clipper", args, { stdio: "inherit" });

function main() {
  const cachePath = state("CACHE_PATH");
  const pushTag = state("PUSH_TAG");
  if (!cachePath || !pushTag) {
    console.log("no cache state recorded (main step failed early); nothing to push");
    return;
  }

  // Globs fixed at mount time, plus any a later step appended to the job env
  // (presets use this to add globs computed from the mounted tree, which
  // does not exist yet when this action's inputs are read).
  const globs = JSON.parse(state("SPLIT_GLOBS") || "[]");
  globs.push(
    ...(process.env.CLIPPER_CACHE_SPLIT_GLOB ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
  );

  const args = ["volume", "push", cachePath, pushTag, "-j", state("JOBS") || "16"];
  for (const g of [...new Set(globs)]) {
    args.push("--split-glob", g);
  }
  if (state("CDC") !== "false") args.push("--cdc");

  const res = run(args);
  run(["volume", "unmount", cachePath]);
  if (res.status !== 0) process.exit(res.status ?? 1);
}

main();
