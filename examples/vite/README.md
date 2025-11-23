# FSRS Parameter Optimizer - Vite Example

This example demonstrates how to use the FSRS parameter optimizer with Vite and React for **client-side parameter training**. This is a tool for optimizing FSRS algorithm parameters based on your review history data.

> **Note**: This example focuses on **parameter optimization/training** only. It does not include the FSRS scheduler functionality. For scheduler usage, see the main [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) library.

## Features

- **Client-Side Parameter Training**: Upload a CSV file containing review history and train FSRS parameters directly in the browser using WebAssembly
- **Real-time Progress**: Watch the optimization progress with live updates
- **Dual Training Modes**: Train parameters with both short-term memory enabled and disabled
- **Modern Stack**: Built with React 19, TypeScript, Vite 7, and Tailwind CSS 4

## Getting Started

### Prerequisites

- Node.js 20 or higher
- pnpm (recommended package manager)

### Installation

```bash
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

This example requires special Vite configuration to work with WebAssembly:

### 1. Response Headers (COOP/COEP)

The `@open-spaced-repetition/binding` package uses WebAssembly with `SharedArrayBuffer`, which requires specific HTTP headers for security reasons:

```typescript
// vite.config.ts
{
  name: 'configure-response-headers',
  enforce: 'pre',
  configureServer: (server) => {
    server.middlewares.use((_req, res, next) => {
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
      next()
    })
  },
}
```

These headers enable cross-origin isolation, which is required for `SharedArrayBuffer` to work in modern browsers.

### 2. Optimization Dependencies

The binding package must be excluded from Vite's dependency optimization to prevent issues with WebAssembly loading:

```typescript
// vite.config.ts
optimizeDeps: {
  exclude: ['@open-spaced-repetition/binding'],
}
```

This ensures that the WASM files are loaded correctly without being processed by Vite's optimizer.

### 3. PNPM Configuration

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

This example uses the local system timezone automatically. The timezone offset is calculated using JavaScript's `Date.getTimezoneOffset()` method, which returns the offset in minutes between UTC and the local time.

### WASM Loading

The WebAssembly binary is loaded from the `@open-spaced-repetition/binding-wasm32-wasi` package, which is automatically installed as an optional dependency when the architecture supports it.

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
