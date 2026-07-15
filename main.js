// Clipper cache: main step. Installs the pinned clipper CLI, mounts the cache
// volume with tag fallback, and records state for the post step (push +
// unmount). Dependency-free: inputs/outputs/state via the runner's files.
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");

const input = (name, def = "") => {
  const v = process.env[`INPUT_${name.toUpperCase()}`];
  return v === undefined || v.trim() === "" ? def : v.trim();
};
const emit = (file, name, value) =>
  fs.appendFileSync(process.env[file], `${name}=${value}${os.EOL}`);
const output = (name, value) => emit("GITHUB_OUTPUT", name, value);
const state = (name, value) => emit("GITHUB_STATE", name, value);

function install(version) {
  const osName = process.platform === "darwin" ? "darwin" : "linux";
  const arch = process.arch === "arm64" ? "arm64" : "amd64";
  const url =
    version === "latest"
      ? `https://dl.clipper.dev/clipper-${osName}-${arch}`
      : `https://dl.clipper.dev/archive/${version}/clipper-${osName}-${arch}`;
  console.log(`Downloading clipper from ${url}`);
  execFileSync("curl", ["-fsSL", "--retry", "3", url, "-o", "/usr/local/bin/clipper"], {
    stdio: "inherit",
  });
  fs.chmodSync("/usr/local/bin/clipper", 0o755);
  execFileSync("clipper", ["version"], { stdio: "inherit" });
}

function main() {
  const path = input("path");
  const repo = input("repo");
  const key = input("key");
  if (!path || !repo || !key) throw new Error("path, repo, and key are required");
  const jobs = input("jobs", "16");
  const restoreKeys = input("restore-keys")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  install(input("version", "latest"));

  const tags = [key, ...restoreKeys].map((k) => `${repo}:${k}`);
  fs.mkdirSync(path, { recursive: true });
  try {
    execFileSync("clipper", ["volume", "mount", path, "-j", jobs, ...tags], {
      stdio: "inherit",
    });
    output("cache-hit", "true");
  } catch {
    // No tag exists yet: cold start on a plain directory; the post push
    // seeds repo:key so the next run mounts warm.
    output("cache-hit", "false");
    console.log(`no cache tag found; cold start (push will seed ${repo}:${key})`);
  }
  output("push-tag", `${repo}:${key}`);

  state("CACHE_PATH", path);
  state("PUSH_TAG", `${repo}:${key}`);
  state("JOBS", jobs);
  state("CDC", input("cdc", "true"));
  state("SPLIT_GLOBS", JSON.stringify(input("split-glob").split("\n").map((s) => s.trim()).filter(Boolean)));
}

main();
