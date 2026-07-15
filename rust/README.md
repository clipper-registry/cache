# Rust incremental cache

<!-- PLACEHOLDER(kyle): pitch + measured numbers -->

Caches the cargo `target/` directory as a clipper volume and enables incremental compilation with content-hash freshness, so warm runs rebuild only what changed.

## Usage

```yaml
- uses: clipper-registry/cache/rust@main
  env:
    CLIPPER_CREDENTIALS: ${{ secrets.CLIPPER_CI_CREDENTIALS }}
  with:
    repo: clipper.dev/myorg/ci-cache
    key: test-${{ matrix.arch }}
```

A nightly toolchain is required: `-Z checksum-freshness` is nightly-only. On stable it is ignored and every fresh checkout rebuilds the full workspace. If the repository's `rust-toolchain.toml` pins stable, set `RUSTUP_TOOLCHAIN` in the job env.

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
| `resolved-tag` | The tag that mounted |

## Cache keys

Each branch reads and writes `<key>-<branch>`. A branch with no cache yet starts from `<key>-<base-branch>`. The cache is pushed when the job succeeds; set `CLIPPER_CACHE_ON_FAILURE: "true"` in the job env to also push on failure.

## Environment variables

This action sets `CARGO_INCREMENTAL=1` and `CARGO_UNSTABLE_CHECKSUM_FRESHNESS=true` for subsequent steps. Cargo profiles are not modified.

## Known issues

- Build scripts are re-run based on file mtimes, which a fresh checkout always invalidates. A build script with `rerun-if-changed` paths, or with no `rerun-if` directives at all, re-runs every workflow run and rebuilds its crate and its dependents. Prefer `rerun-if-env-changed` where possible. <!-- PLACEHOLDER(kyle): link to the build-script writeup / upstream cargo issue once filed. -->
