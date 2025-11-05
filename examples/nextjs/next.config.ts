import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['@open-spaced-repetition/binding'],
  // Enable cross-origin isolation for SharedArrayBuffer support (required for WebAssembly)
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
    ]
  },

  // self-hosting
  output: 'standalone',
}

export default nextConfig
