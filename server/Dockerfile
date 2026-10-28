# syntax=docker/dockerfile:1
# BUILD CONTEXT IS THE REPO ROOT (NOT server/) SO THIS CAN COPY THE SHARED ../proto CONTRACT —
# SEE docker-compose.yml's `server` SERVICE (context: ., dockerfile: server/Dockerfile).
ARG NODE_VERSION=22-alpine
ARG PORT=5000
ARG GRPC_PORT=50051

# ---------- STAGE 1: PRODUCTION DEPENDENCIES ONLY (CACHED SEPARATELY FROM BUILD DEPS). ----------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
RUN corepack enable
COPY server/package.json server/pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# ---------- STAGE 2: COMPILE TYPESCRIPT. ----------
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
RUN corepack enable
COPY server/package.json server/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY server/ .
RUN pnpm build

# ---------- STAGE 3: MINIMAL RUNTIME IMAGE. ----------
FROM node:${NODE_VERSION} AS runner
ARG PORT
ARG GRPC_PORT
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=${PORT}
ENV GRPC_PORT=${GRPC_PORT}

# TINI REAPS ZOMBIES AND FORWARDS SIGNALS CORRECTLY WHEN RUNNING AS PID 1.
RUN apk add --no-cache tini && \
    addgroup -S nodejs && adduser -S nodejs -G nodejs

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY server/package.json ./
# SIBLING OF ./dist, NOT NESTED UNDER IT — MATCHES grpc/server.ts's ../../proto/auth.proto
# (server/grpc/server.ts -> ../../proto RESOLVES THE SAME WAY WHETHER dirname IS
# server/grpc (LOCAL tsx) OR dist/grpc (HERE), AS LONG AS proto/ SITS NEXT TO dist/).
COPY proto ./proto

USER nodejs

EXPOSE ${PORT}
EXPOSE ${GRPC_PORT}

# SHELL FORM SO $PORT RESOLVES FROM THE CONTAINER'S RUNTIME ENV, NOT THE BUILD-TIME DEFAULT.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT}/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
