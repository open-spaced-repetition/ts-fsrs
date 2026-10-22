# FSRS Parameter Optimizer - Vite Example

This example demonstrates how to use the FSRS parameter optimizer with Vite and React for **client-side parameter training**. This is a tool for optimizing FSRS algorithm parameters based on your review history data.

**🌐 Live Demo:** https://fsrs-demo-vite.parallelveil.com/

> **Note**: This example focuses on **parameter optimization/training** only. It does not include the FSRS scheduler functionality. For scheduler usage, see the main [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs/tree/main/packages/fsrs) library.

## Features

- **Client-Side Parameter Training**: Upload a CSV file containing review history and train FSRS parameters directly in the browser using WebAssembly
- **Real-time Progress**: Watch the optimization progress with live updates
- **Model Selection**: Train FSRS-6 (21 parameters) or FSRS-7 (34 parameters) with model-specific options
- **Modern Stack**: Built with React 19, TypeScript, Vite 8, and Tailwind CSS 4

## Getting Started

### Prerequisites

- Node.js 26
- Corepack 0.36.0 and pnpm 12.14.0

### Installation

```bash
npm install --global corepack@0.36.0 --force
corepack enable
pnpm install
```

### Development

```bash
pnpm dev
```

The application will be available at `http://localhost:5173`

### Build

```bash
pnpm build
```

## Important Configuration

The browser uses `@open-spaced-repetition/binding-wasm32-wasip1@0.6.0-beta.7`
inside a dedicated Worker. CSV parsing and the selected training configuration run off the main
thread; cancelling terminates the Worker. This single-threaded WASM target does
not require SharedArrayBuffer or COOP/COEP headers.

Vite emits the Worker as an ES module and excludes the WASM binding from dependency
optimization. The example has its own pnpm workspace with lockfile generation
disabled, so installs do not update the repository lockfile.

### Docker

```bash
docker build -t fsrs-vite .
docker run --rm -p 8080:80 fsrs-vite
```

The image builds with Node.js 26, Corepack 0.36.0 and pnpm 12.14.0, then serves
static assets with nginx. Dependencies are resolved at build time without a
committed lockfile; future installs may resolve newer compatible versions.

### Cloudflare Workers Static Assets

```bash
pnpm exec wrangler login
pnpm run deploy
```

The deploy script builds the app and uploads `dist` using `wrangler.jsonc`.
Change its `name` if you need a different Cloudflare project name. Training
continues to run in the browser; this deployment only hosts static assets.
For CI, provide `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as secrets.

## Usage

1. Download a sample CSV file: [revlog.csv](https://github.com/open-spaced-repetition/fsrs-rs/files/15046782/revlog.csv)
2. Select the model (FSRS-7 by default) and configure training:
   - **FSRS-6**: Whole study days, optional short-term memory
   - **FSRS-7**: Fractional study days and same-day reviews, short-term memory always enabled, scheduling penalties disabled by default
   - **Next Day Starts At**: The hour when a new day begins (0-23)
   - **Number of Relearning Steps (FSRS-6)**: Steps before a card is considered relearned (0-10)
3. Click "Start Processing" to begin optimization
4. Wait for the training to complete and view the optimized parameters

## Technical Details

Each run trains only the selected configuration. CSV conversion and training use
the same model version, and conversion preserves aligned card IDs for windowed
training. Changing models clears previous results.

### Timezone Handling

This example uses the local system timezone automatically. The binding resolves the IANA timezone in Rust and applies the correct offset for each review timestamp, including DST changes.

### WASM Loading

The WebAssembly binary comes from the explicitly installed
`@open-spaced-repetition/binding-wasm32-wasip1` package. Both binding packages are
pinned to `0.6.0-beta.7`.

## Code Quality

This project uses [Biome](https://biomejs.dev/) for linting and formatting:

```bash
# Check code
pnpm lint

# Fix issues automatically
pnpm lint:fix
```

## Learn More

- [FSRS Optimizer (Rust)](https://github.com/open-spaced-repetition/fsrs-rs) - The core optimizer implementation
- [FSRS Optimizer Bindings](https://github.com/open-spaced-repetition/ts-fsrs/tree/main/packages/binding) - Node.js/WebAssembly bindings for the optimizer
- [FSRS Algorithm](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm) - Learn about the FSRS algorithm
- [Vite Documentation](https://vite.dev/)
- [React Documentation](https://react.dev/)
