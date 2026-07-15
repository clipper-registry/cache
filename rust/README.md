# Clipper Rust incremental cache

<!-- PLACEHOLDER(kyle): pitch + measured numbers -->

Caches the cargo `target/` directory as a clipper volume and enables incremental compilation with content-hash freshness, so warm runs rebuild only what changed.

## Usage

**A Clipper account is required to use this action.**

**This action is currently Linux only, support for MacOS and Windows coming soon**

**Unstable Rust toolchain is required**

1. Create an account at https://clipper.dev/login
2. Go to https://clipper.dev/repositories/tokens to generate a token with push, pull, and create scopes.
3. Add the token to your repo or org
4. Install a nightly toolchain in the job. `-Z checksum-freshness` is nightly-only; on stable it is ignored and every fresh checkout rebuilds the full workspace.

If the repository's `rust-toolchain.toml` pins stable, also set `RUSTUP_TOOLCHAIN: nightly` in the job env, since the toolchain file overrides the default.

5. Add the action to your workflow before your build steps, like so:

```yaml
- uses: clipper-registry/cache/rust@main
  env:
    CLIPPER_CREDENTIALS: ${{ secrets.CLIPPER_CI_CREDENTIALS }}
  with:
    repo: clipper.dev/myorg/ci-cache
    key: test-${{ matrix.arch }}
```

## Inputs

| name | default | description |
|---|---|---|
| `repo` | | Registry repository holding the cache tags |
| `key` | | Cache key, typically the job name plus architecture |
| `base-branch` | `main` | Branch whose cache seeds new branches |
| `version` | `latest` | clipper CLI version to install |

## Outputs

| name | description |
|---|---|
| `cache-hit` | Whether a cache tag mounted |

## Cache keys

Each branch reads and writes `<key>-<branch>`. A branch with no cache yet starts from `<key>-<base-branch>`. The cache is pushed when the job succeeds; set `CLIPPER_CACHE_ON_FAILURE: "true"` in the job env to also push on failure.

## Environment variables

This action sets `CARGO_INCREMENTAL=1` and `CARGO_UNSTABLE_CHECKSUM_FRESHNESS=true` for subsequent steps. Cargo profiles are not modified.

## Known issues

- Build scripts are re-run based on file mtimes, which a fresh checkout always invalidates. A build script with `rerun-if-changed` paths, or with no `rerun-if` directives at all, re-runs every workflow run and rebuilds its crate and its dependents. Prefer `rerun-if-env-changed` where possible. <!-- PLACEHOLDER(kyle): link to the build-script writeup / upstream cargo issue once filed. -->
