import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle for small Docker images / Node hosts.
  output: 'standalone',
}

export default nextConfig
