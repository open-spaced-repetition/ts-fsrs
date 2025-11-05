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
- Dual optimization modes (with/without short-term memory)

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- pnpm, npm, yarn, or bun as package manager

### Installation

```bash
pnpm install
# or
npm install
# or
yarn install
# or
bun install
```

### Development

Run the development server:

```bash
pnpm dev
# or
npm run dev
# or
yarn dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Important Configuration

### 1. Package Manager Configuration (package.json)

If you are using **pnpm**, you must configure the CPU architecture support to properly download the WebAssembly dependencies:

```json
{
  "pnpm": {
    "supportedArchitectures": {
      "cpu": [
        "current",
        "wasm32"
      ]
    }
  }
}
```

**Why this is needed**: The `@open-spaced-repetition/binding` package includes WebAssembly binaries that require the `wasm32` architecture. Without this configuration, pnpm may not download the correct dependencies.

### 2. Next.js Configuration (next.config.ts)

Two critical configurations are required in `next.config.ts`:

#### a. Server External Packages

```typescript
serverExternalPackages: [
  '@open-spaced-repetition/binding'
]
```

**Why this is needed**: This tells Next.js to not bundle the FSRS binding package during server-side compilation, preventing potential build errors with native/WebAssembly modules.

#### b. Cross-Origin Isolation Headers

```typescript
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Cross-Origin-Opener-Policy',
          value: 'same-origin',
        },
        {
          key: 'Cross-Origin-Embedder-Policy',
          value: 'require-corp',
        },
      ],
    },
  ];
}
```

**Why this is needed**: Client-side WebAssembly training requires `SharedArrayBuffer` support, which is only available in cross-origin isolated contexts. These headers enable the necessary security context for WebAssembly to run efficiently in the browser.

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
1. The same Next.js configuration (headers and serverExternalPackages) is preserved
2. The deployment platform supports WebAssembly
3. The necessary CORS headers are properly set

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
