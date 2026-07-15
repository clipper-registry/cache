# Incremental Rust builds for GitHub Actions

<!-- PLACEHOLDER(kyle): pitch + measured numbers -->

Caches the cargo `target/` directory as a clipper volume and enables incremental compilation with content-hash freshness, so warm runs rebuild only what changed. Generally, expect a 30% improvement in compile times over sccache (workflow dependent).

Example improvements (compile time plus cache overhead — mount/restore and push/save — excluding test execution):

| project | job | before | with this action |
|---|---|---|---|
| [copper-rs](https://github.com/copper-project/copper-rs) | doctests (vs sccache + rust-cache) | [465s](https://github.com/copper-project/copper-rs/actions/runs/29280302268) | [309s](https://github.com/clipper-registry/copper-rs/actions/runs/29398481655) |
| [smolvm](https://github.com/smol-machines/smolvm) | build + clippy + tests (vs actions/cache) | [267s](https://github.com/smol-machines/smolvm/actions/runs/29399762867) | [72s](https://github.com/clipper-registry/smolvm/actions/runs/29382956823) |
| [rust-analyzer](https://github.com/rust-lang/rust-analyzer) | test suite build (cold vs warm cache) | [917s](https://github.com/clipper-registry/rust-analyzer/actions/runs/29396423702) | [164s](https://github.com/clipper-registry/rust-analyzer/actions/runs/29399195747) |

Please see the [main README](../README.md) for more information.

## Usage

> [!NOTE]
> Linux runners only for now; macOS and Windows support coming soon.

> [!IMPORTANT]
> A nightly Rust toolchain is required: `-Z checksum-freshness` is nightly-only cargo.

A Clipper account is required to use this action.

1. Create an account at https://clipper.dev/login
2. Go to https://clipper.dev/repositories/tokens to generate a token with push, pull, and create scopes.
3. Add the token to your repo or org
4. Install a nightly toolchain, however you normally do (rustup is preinstalled on GitHub runners). `-Z checksum-freshness` is nightly-only; on stable it is ignored and every fresh checkout rebuilds the full workspace. For example:

```yaml
- uses: actions-rust-lang/setup-rust-toolchain@v1
  with:
    toolchain: nightly
    cache: false # setup-rust-toolchain's built-in cache would fight this action over target/
```

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
| `base-branch` | derived | fallback lineage branch (defaults to the PR base branch, else the repository default branch) |
| `additional-split-glob` | `""` | Extra split globs (one per line) on top of the generated cargo set, for repo-specific churny dirs inside `target/` |
| `version` | `latest` | clipper CLI version to install |

## Outputs

| name | description |
|---|---|
| `cache-hit` | Whether a cache tag mounted |

## Cache keys

Each branch reads and writes `<key>-<branch>`. A branch with no cache yet starts from its base branch's cache (the PR base, or the repository default branch). The cache is pushed when the job succeeds; set `CLIPPER_CACHE_ON_FAILURE: "true"` in the job env to also push on failure.

## Environment variables

This action sets `CARGO_INCREMENTAL=1` and `CARGO_UNSTABLE_CHECKSUM_FRESHNESS=true` for subsequent steps. Cargo profiles are not modified.

## Known issues

- sccache cannot be used on jobs with this action: it refuses to run when `CARGO_INCREMENTAL=1` is set (`sccache: incremental compilation is prohibited`). Remove sccache from cached jobs; the incremental cache replaces it.
- Build scripts are re-run based on file mtimes, which a fresh checkout always invalidates. A build script with `rerun-if-changed` paths, or with no `rerun-if` directives at all, re-runs every workflow run and rebuilds its crate and its dependents. Prefer `rerun-if-env-changed` where possible.
