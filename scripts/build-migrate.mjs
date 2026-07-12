// Build-time migration step.
// Runs `prisma migrate deploy` only when DATABASE_URL is configured, so builds
// without a database (preview/duplicate Vercel projects, CI type-checks) don't
// fail. When a URL is present, a real migration error still fails the build.
import { execSync } from 'node:child_process'

if (process.env.DATABASE_URL) {
  console.log('› DATABASE_URL detected — applying migrations (prisma migrate deploy)…')
  execSync('npx prisma migrate deploy', { stdio: 'inherit' })
} else {
  console.warn('› DATABASE_URL not set — skipping migrations; build continues.')
}
