# Contributing

Thanks for contributing to `ts-fsrs`.

This repository contains:

- `packages/fsrs`: the TypeScript scheduler package published as `ts-fsrs`
- `packages/binding`: the Rust/WASI-backed optimizer package published as `@open-spaced-repetition/binding`
- `examples/nextjs`: the demo application

## Prerequisites

- Node.js `>=20`
- `pnpm` via Corepack
- Rust stable with `clippy` and `rustfmt` when working on `packages/binding`
- `wasi-sdk` when building the WASI target for `packages/binding`

If you are contributing to `packages/binding`, we recommend using the Dev Container instead of setting up the Rust + WASI toolchain manually on your host machine. The container already includes the dependencies needed to build the WASI artifacts correctly.

## Local Setup

You can work in one of two supported ways:

- local toolchains on your host machine
- the repository Dev Container for a preconfigured environment

### Option 1: Local toolchains

```bash
corepack enable pnpm
pnpm install --frozen-lockfile
```

If you are working on `packages/binding`, you must also install `wasi-sdk`. Without it, the WASI target may fail to compile correctly.

### Option 2: Dev Container

The repository includes a VS Code Dev Container configuration. This is the recommended way to work on `packages/binding`, because it provides a consistent setup for Node.js, pnpm, Rust, WASM, `wasi-sdk`, and the binding package toolchain.

To start it in VS Code:

1. Open the repository in VS Code.
2. Run `Dev Containers: Open Folder in Container...` from the command palette, or click `Reopen in Container` when prompted.
3. Wait for the initial container build and setup to finish.

For prerequisites, screenshots, troubleshooting, and the full workflow, see the [Dev Container quickstart](./.devcontainer/QUICKSTART.md).

## Common Commands

Run from the repository root unless noted otherwise.

```bash
pnpm check
pnpm test
pnpm test:coverage
pnpm build
pnpm docs
```

Useful package-scoped commands:

```bash
pnpm --filter ts-fsrs test
pnpm --filter ts-fsrs build
pnpm --filter @open-spaced-repetition/binding check
```

## Making Changes

1. Keep changes scoped to the problem you are solving.
2. Add or update tests when behavior changes.
3. Run the relevant checks before opening a pull request.
4. Update docs when the public API, developer workflow, or published package contents change.

## Changesets

This repository uses [Changesets](https://github.com/changesets/changesets) for release management.

Add a changeset for any user-facing package change:

```bash
pnpm changeset
```

Typical examples that need a changeset:

- Bug fixes in published packages
- New features
- Breaking changes
- Changes to published package contents

Documentation-only or CI-only changes usually do not need one.

## Pull Requests

Please include:

- A clear summary of the change
- Linked issues or context when relevant
- Notes about tests you ran
- A changeset when the change affects a published package

Small, focused pull requests are easier to review and release.
