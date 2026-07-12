import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle for small Docker images / Node hosts.
  output: 'standalone',
  // These routes read markdown from disk at runtime (investment manual on the
  // principles page, report-writing guide on the admin post editors); make sure
  // the content ships with the serverless/standalone bundle.
  outputFileTracingIncludes: {
    '/dashboard/principles': ['./content/**'],
    '/admin/posts/new': ['./content/**'],
    '/admin/posts/[id]': ['./content/**'],
  },
}

export default nextConfig
