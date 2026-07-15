# clipper cache — Rust preset

<!-- PLACEHOLDER(kyle): the incremental-cache story — why transporting
     cargo's incremental state beats sccache/rust-cache tarballs for this
     shape of CI, with the measured numbers. -->

One step that:

1. sets `CARGO_INCREMENTAL=1` and `CARGO_UNSTABLE_CHECKSUM_FRESHNESS=true`
   (content-hash source freshness — survives fresh-checkout mtimes),
2. caches `~/.cargo` registry/index/git via `actions/cache` keyed on
   `Cargo.lock`,
3. mounts `target/` as a clipper cache volume with the cargo split-glob
   layout (`.fingerprint`, `incremental`, `.rustc_info.json` isolated into
   their own blobs), pushing changes back on job success.

```yaml
- uses: clipper-registry/cache/rust@main
  env:
    CLIPPER_CREDENTIALS: ${{ secrets.CLIPPER_CI_CREDENTIALS }}
  with:
    repo: clipper.dev/myorg/ci-cache
    key: test-${{ matrix.arch }}
```

Tag layout: `key`-`branch` is mounted first, falling back to
`key`-`base-branch` (default `main`); pushes go to the branch tag.

## Requirements and sharp edges

- **Nightly toolchain**: checksum-freshness is nightly-only cargo. On stable
  the env var is silently ignored and warm runs rebuild every workspace
  crate (mtime freshness + fresh checkout). If the repo has a
  `rust-toolchain.toml`, it overrides `rustup default` — set
  `RUSTUP_TOOLCHAIN` in the job env to win.
- **Build scripts**: cargo's build-script freshness is mtime-based even under
  checksum-freshness. A script with no `rerun-if` directives (whole-package
  mtime scan) or with `rerun-if-changed` paths re-runs on every fresh
  checkout and rebuilds its crate and dependents. Fixes that work:
  `rerun-if-env-changed` declarations (value-compared, checkout-proof), or
  computing what the script computed in a `const fn` and deleting it.
  <!-- PLACEHOLDER(kyle): link to the build-script writeup / upstream cargo
       issue once filed. -->
- **Don't override the project's profile**: this preset adds incremental +
  checksum freshness and nothing else. LTO/codegen-units belong to the
  project.
