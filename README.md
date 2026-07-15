# clipper cache

<!-- PLACEHOLDER(kyle): one-paragraph pitch — what clipper volumes are, why
     chunk-level dedup beats tarball caches, link to clipper.dev docs. -->

Registry-backed cache volumes for GitHub Actions: mount a cached directory at
job start, push only the changed chunks back at job end.

## Usage

```yaml
- uses: clipper-registry/cache@main
  env:
    CLIPPER_CREDENTIALS: ${{ secrets.CLIPPER_CI_CREDENTIALS }}
  with:
    path: build/
    repo: clipper.dev/myorg/ci-cache
    key: linux-x86_64-${{ github.head_ref || github.ref_name }}
    restore-keys: linux-x86_64-main
```

- **Mount**: `key` is tried first, then each of `restore-keys`, in order. If
  nothing resolves, the job runs cold on a plain directory.
- **Push**: on job success, changes are pushed to `repo:key` (chunk-level
  dedup: a warm push uploads only what changed). To also push when the job
  fails, set `CLIPPER_CACHE_ON_FAILURE: "true"` in the job env — same shape
  as `actions/cache`'s save-on-success default.
- `split-glob` (one glob per line) isolates churny subtrees into their own
  blobs; `cdc` enables content-defined chunking (default on).

### Inputs

| input | default | description |
|---|---|---|
| `path` | — | directory to cache |
| `repo` | — | registry repository for the cache tags |
| `key` | — | tag to mount first and push to |
| `restore-keys` | `""` | fallback tags, one per line |
| `split-glob` | `""` | churny-subtree globs, one per line |
| `cdc` | `true` | content-defined chunking on push |
| `jobs` | `16` | parallel transfer jobs |
| `version` | `latest` | clipper CLI version |

Outputs: `cache-hit`, `resolved-tag`, `push-tag`.

### Credentials

<!-- PLACEHOLDER(kyle): where users get CLIPPER_CREDENTIALS (clipper.dev
     signup/token flow) and what scope the token needs. -->

Set `CLIPPER_CREDENTIALS` in the step (or job) env from a repository secret.

## Rust preset

See [`rust/`](rust/) — one step that mounts `target/` as a cache volume,
enables incremental compilation with content-hash freshness, applies the
cargo split-glob layout, and caches the cargo registry:

```yaml
- uses: clipper-registry/cache/rust@main
  env:
    CLIPPER_CREDENTIALS: ${{ secrets.CLIPPER_CI_CREDENTIALS }}
  with:
    repo: clipper.dev/myorg/ci-cache
    key: test-x86_64
    targets: |
      x86_64-unknown-linux-musl
```

**Toolchain requirement**: `CARGO_UNSTABLE_CHECKSUM_FRESHNESS` needs a nightly
toolchain; on stable it is silently ignored and freshness falls back to
mtimes, which a fresh checkout always invalidates. Beware `rust-toolchain.toml`
silently overriding your CI toolchain — set `RUSTUP_TOOLCHAIN` in the job env
if the repo pins one.

<!-- PLACEHOLDER(kyle): benchmark numbers — smolvm/rust-analyzer/copper before
     and after (warm job times, push sizes), and the build-script caveats
     writeup or a link to it. -->

## Caveats

- The post step (push + unmount) is skipped on job failure by default, like
  `actions/cache`; on self-hosted runners that leaves the FUSE mount behind —
  set `CLIPPER_CACHE_ON_FAILURE: "true"` or unmount in your own cleanup.
- Build scripts with no `rerun-if` directives (or path-based ones) re-run on
  every fresh checkout and dirty their crates regardless of this cache; see
  the Rust preset README for the fix patterns.
