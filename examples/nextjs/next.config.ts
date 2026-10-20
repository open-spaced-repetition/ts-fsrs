import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  // Turbopack cannot bundle the native .node addon used by server-side training.
  serverExternalPackages: ['@open-spaced-repetition/binding'],
  // The browser uses threadless wasm32-wasip1; cross-origin isolation is unnecessary.

  // self-hosting
  output: 'standalone',
}

export default nextConfig
