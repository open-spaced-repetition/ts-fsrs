# FSRS Parameter Optimizer - Vite Example

This example demonstrates how to use the FSRS parameter optimizer with Vite and React for **client-side parameter training**. This is a tool for optimizing FSRS algorithm parameters based on your review history data.

**🌐 Live Demo:** https://fsrs-demo-vite.parallelveil.com/

> **Note**: This example focuses on **parameter optimization/training** only. It does not include the FSRS scheduler functionality. For scheduler usage, see the main [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs/tree/main/packages/fsrs) library.

## Features

- **Client-Side Parameter Training**: Upload a CSV file containing review history and train FSRS parameters directly in the browser using WebAssembly
- **Real-time Progress**: Watch the optimization progress with live updates
- **Dual Training Modes**: Train parameters with both short-term memory enabled and disabled
- **Modern Stack**: Built with React 19, TypeScript, Vite 7, and Tailwind CSS 4

## Getting Started

### Prerequisites

- Node.js 24 or higher
- pnpm (recommended package manager)

### Installation

Build the locally linked threadless binding from the repository root first:

```bash
pnpm install
pnpm --filter @open-spaced-repetition/binding build:wasm:threadless
cd examples/vite
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

This example runs the threadless WASI binding in a dedicated module worker. Training therefore does not block the page and does not require `SharedArrayBuffer`, COOP, or COEP headers.

```typescript
// vite.config.ts
worker: {
  format: 'es',
}
```

### PNPM Configuration

The `package.json` includes a special configuration to support WebAssembly binaries:

```json
{
  "pnpm": {
    "supportedArchitectures": {
      "cpu": ["current", "wasm32"]
    }
  }
}
```

This allows pnpm to install the WebAssembly binaries alongside native bindings.

## Usage

1. Download a sample CSV file: [revlog.csv](https://github.com/open-spaced-repetition/fsrs-rs/files/15046782/revlog.csv)
2. Configure the training parameters:
   - **Next Day Starts At**: The hour when a new day begins (0-23)
   - **Number of Relearning Steps**: Steps before a card is considered relearned (0-10)
3. Click "Start Processing" to begin optimization
4. Wait for the training to complete and view the optimized parameters

## Technical Details

### Timezone Handling

This example uses the local system timezone automatically. The binding resolves the IANA timezone in Rust and applies the correct offset for each review timestamp, including DST changes.

### WASM Loading

The WebAssembly binary is loaded from `@open-spaced-repetition/binding-wasm32-wasip1` inside `optimizer.worker.ts`. Comlink handles the training RPC, result, and errors; Rust progress checkpoints are forwarded to the page with `postMessage`.

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
