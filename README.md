# clipper cache

An action to cache directories with [Clipper](https://clipper.dev). Directories are FUSE mounted, large files are only fetched when read from.

## Usage

**A Clipper account is required to use this action.**

1. Create an account at https://clipper.dev/login
2. Go to https://clipper.dev/repositories/tokens to generate a token with push, pull, and create scopes.
3. Add the token to your repo or org
4. Add the action to your workflow, like so:
```yaml
- uses: clipper-registry/cache@main
  env:
    CLIPPER_CREDENTIALS: ${{ secrets.CLIPPER_CI_CREDENTIALS }}
  with:
    path: build/
    repo: clipper.dev/myorg/mycache
    key: linux-x86_64-${{ github.head_ref || github.ref_name }}
    restore-keys: linux-x86_64-main
```

- **Mount**: `key` is tried first, then each of `restore-keys`, in order. If nothing resolves, the job runs cold on a plain directory.
- **Push**: on job success, changes are pushed to `repo:key`. To also push when the job fails, set `CLIPPER_CACHE_ON_FAILURE: "true"` in the job env.

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

## Language specific implementations

### Rust Incremental Cache

See [`rust/`](rust/)

