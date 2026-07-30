import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['@open-spaced-repetition/binding'],
  // self-hosting
  output: 'standalone',
}

export default nextConfig
