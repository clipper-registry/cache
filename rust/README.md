# Rust incremental cache

<!-- PLACEHOLDER(kyle): pitch + measured numbers -->

Caches `target/` between CI runs so cargo only rebuilds what actually changed. One step: enables incremental compilation with content-hash freshness, mounts `target/` as a clipper volume, and pushes the changes back when the job succeeds.

```yaml
- uses: clipper-registry/cache/rust@main
  env:
    CLIPPER_CREDENTIALS: ${{ secrets.CLIPPER_CI_CREDENTIALS }}
  with:
    repo: clipper.dev/myorg/ci-cache
    key: test-${{ matrix.arch }}
```

Each branch gets its own cache (`<key>-<branch>`), starting from the `base-branch` cache (default `main`) when the branch is new.

## Requirements

- **Nightly toolchain.** Content-hash freshness (`-Z checksum-freshness`) is nightly-only cargo; on stable it is silently ignored and every fresh checkout rebuilds the whole workspace. If your repo's `rust-toolchain.toml` pins stable, set `RUSTUP_TOOLCHAIN` in the job env.
- **Build scripts can defeat the cache.** Cargo re-runs build scripts by mtime, so a script with `rerun-if-changed` paths (or no `rerun-if` directives at all) re-runs on every fresh checkout and rebuilds its crate and everything depending on it. Where possible, declare build script inputs with `rerun-if-env-changed`. <!-- PLACEHOLDER(kyle): link to the build-script writeup / upstream cargo issue once filed. -->

The preset sets `CARGO_INCREMENTAL=1` and `CARGO_UNSTABLE_CHECKSUM_FRESHNESS=true` and nothing else. Your profile settings (LTO, codegen-units, opt-level) are untouched.
