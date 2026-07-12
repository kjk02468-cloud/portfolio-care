import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle for small Docker images / Node hosts.
  output: 'standalone',
  // The principles page reads the investment manual from disk at runtime;
  // make sure it ships with the serverless/standalone bundle.
  outputFileTracingIncludes: {
    '/dashboard/principles': ['./content/**'],
  },
}

export default nextConfig
