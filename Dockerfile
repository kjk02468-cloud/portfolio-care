# Portfolio Care — production container (Next.js + Prisma/SQLite)
# Build:  docker build -t portfolio-care .
# Run:    docker run -p 3000:3000 -e AUTH_SECRET=... -v pc-data:/data \
#           -e DATABASE_URL=file:/data/prod.db portfolio-care
# Then open http://localhost:3000

FROM node:22-slim AS base
WORKDIR /app
# Prisma's query engine needs openssl on Debian slim.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV NEXT_TELEMETRY_DISABLED=1

# ── deps: install everything (incl. Prisma CLI) and generate the client ──
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ── build: compile the Next.js app ──
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# A dummy URL keeps any build-time Prisma validation happy; no DB is touched.
ENV DATABASE_URL="file:./build.db"
RUN npm run build

# ── runner: serve ──
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
# Default DB path; mount a volume at /data in production to persist it.
ENV DATABASE_URL="file:/data/prod.db"
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=build /app/prisma ./prisma
RUN mkdir -p /data
EXPOSE 3000
# Apply migrations at startup (when the volume is mounted), then serve.
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
