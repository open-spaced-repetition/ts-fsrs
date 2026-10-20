# FSRS Next.js Optimizer Example

This is a [Next.js](https://nextjs.org) example demonstrating how to build an FSRS (Free Spaced Repetition Scheduler) parameter optimizer using WebAssembly bindings in a modern web application.

**🌐 Live Demo:** https://fsrs-demo-nextjs.parallelveil.com/

## Overview

This example showcases two different approaches for FSRS parameter optimization:

1. **Client-Side Training**: Runs the FSRS optimization algorithm directly in the browser using WebAssembly
2. **Server-Side Training**: Offloads computation to the server using Server-Sent Events (SSE) for real-time progress updates

Both approaches support:
- CSV file upload for review history data
- Configurable timezone settings
- Adjustable parameters (next day start time, relearning steps)
- Real-time progress tracking
- FSRS-6 (21 parameters) or FSRS-7 (34 parameters), one configuration per run

## Getting Started

### Prerequisites

- Node.js 26
- Corepack 0.36.0 and pnpm 12.14.0

### Installation and Development

```bash
npm install --global corepack@0.36.0 --force
corepack enable
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Important Configuration

The example is an independent pnpm workspace. Its lockfile is disabled and ignored;
installs resolve the current compatible dependency versions. This keeps example
lockfiles out of the repository, but does not replace dependency security updates.

Both binding packages are pinned to `0.6.0-beta.7`. Client-side training uses
`@open-spaced-repetition/binding-wasm32-wasip1` in a dedicated Web Worker. This
single-threaded WebAssembly target does not require SharedArrayBuffer or
cross-origin isolation headers. Cancel terminates the worker immediately.
Server-side training uses the native async `@open-spaced-repetition/binding` API
so SSE progress and other requests remain responsive. Next.js keeps that package
external via `serverExternalPackages`.

`pnpm-workspace.yaml` enables `wasm32` package installation alongside the current
CPU architecture. Build the Node.js 26 standalone container from this directory:

```bash
docker build -t fsrs-next-app .
docker run --rm -p 3000:3000 fsrs-next-app
```

### Model-specific inputs

FSRS-7 is selected by default. It always enables short-term memory and offers
optional scheduling penalties (off by default). FSRS-6 exposes the short-term
memory switch and number of relearning steps. The CSV converter and optimizer
use the same model version and aligned card IDs, matching the documentation's
revlog trainer. Changing models clears the previous results. Errors appear
inline and do not open browser alert dialogs.

## Project Structure

```
src/
├── app/                      # Next.js App Router pages
│   ├── page.tsx             # Main page with tab navigation
│   └── api/
│       ├── timezone/        # API route for timezone data
│       └── train/           # SSE endpoint for server-side training
├── components/
│   ├── ClientTraining.tsx   # Client-side training component
│   └── ServerTraining.tsx   # Server-side training component
├── hooks/
│   └── useSSETraining.tsx   # Custom hook for SSE connection
├── types/
│   └── training.ts          # TypeScript type definitions
└── utils/
    └── timezone.ts          # Timezone utility functions
```

## Features

### Client-Side Training
- Processes CSV files directly in the browser
- No server load for computation
- Progress tracking with real-time updates
- Memory-efficient implementation with manual cleanup

### Server-Side Training
- Offloads heavy computation to the server
- Real-time progress updates via Server-Sent Events
- Better for large datasets
- Reduces client resource usage

### Common Features
- Dark mode support with Tailwind CSS
- Responsive design
- Automatic timezone detection
- CSV file validation
- Detailed results display with formatted parameters

## Sample Data

You can use the sample CSV file from the FSRS repository:
[revlog.csv](https://github.com/open-spaced-repetition/fsrs-rs/files/15046782/revlog.csv)

> **⚠️ Note for Vercel Deployment**: When deployed to Vercel, the server-side training feature may not work with this sample CSV file due to its large size. Vercel has limitations on request body size and execution time for serverless functions. For production use on Vercel, consider:
> - Using the client-side training feature instead (which processes files in the browser)
> - Using smaller dataset files for server-side training
> - Deploying to a platform with fewer serverless restrictions (e.g., self-hosted server, VPS)

The CSV should contain review history with the following format:
- `card_id`: Unique identifier for each card
- `review_time`: Timestamp of the review
- `review_rating`: Rating given during review (1-4)

## Learn More

- [FSRS Algorithm](https://github.com/open-spaced-repetition/fsrs-rs) - The core FSRS algorithm repository
- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features and API
- [WebAssembly](https://webassembly.org/) - Understanding WebAssembly and its capabilities

## Technology Stack

- **Framework**: Next.js 16 with App Router
- **React**: React 19
- **Styling**: Tailwind CSS 4
- **FSRS**: @open-spaced-repetition/binding (WebAssembly)
- **Server Streaming**: Hono for SSE endpoints
- **Language**: TypeScript
- **Linting**: Biome

## Deploy on Vercel

The easiest way to deploy this Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

**Important**: When deploying, ensure that:
1. The `serverExternalPackages` configuration is preserved
2. The deployment platform supports WebAssembly
3. Browser Web Workers and WebAssembly assets are served correctly

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
