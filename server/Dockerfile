# syntax=docker/dockerfile:1
ARG NODE_VERSION=22-alpine
ARG PORT=5000

# ---------- STAGE 1: PRODUCTION DEPENDENCIES ONLY (CACHED SEPARATELY FROM BUILD DEPS). ----------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# ---------- STAGE 2: COMPILE TYPESCRIPT. ----------
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# ---------- STAGE 3: MINIMAL RUNTIME IMAGE. ----------
FROM node:${NODE_VERSION} AS runner
ARG PORT
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=${PORT}

# TINI REAPS ZOMBIES AND FORWARDS SIGNALS CORRECTLY WHEN RUNNING AS PID 1.
RUN apk add --no-cache tini && \
    addgroup -S nodejs && adduser -S nodejs -G nodejs

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./

USER nodejs

EXPOSE ${PORT}

# SHELL FORM SO $PORT RESOLVES FROM THE CONTAINER'S RUNTIME ENV, NOT THE BUILD-TIME DEFAULT.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT}/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
