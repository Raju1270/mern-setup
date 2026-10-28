# MERN Setup

A full-stack MERN starter with JWT authentication, email OTP verification, MFA, a Redis-backed distributed rate limiter, a Kafka-driven notification worker, and real-time WebSocket push — ready to run locally or via Docker Compose.

> This README covers setup. For how the services fit together, the data model, and event flows, see [ARCHITECTURE.md](ARCHITECTURE.md). For what's built vs. planned, see [ROADMAP.md](ROADMAP.md).

## Tech Stack

**Gateway (`gateway/`)** — Node.js, Express 5, TypeScript, gRPC client (`@grpc/grpc-js`), Redis (ioredis), Zod, JWT, Pino, Biome

**Server (`server/`, "auth-service")** — Node.js, Express 5 + gRPC server, TypeScript, MongoDB (Mongoose), Redis (ioredis), Kafka (kafkajs), Zod, JWT, Pino, Biome

**Notification service (`notification-service/`)** — Node.js, TypeScript, Kafka consumer, Nodemailer, Pino

**Realtime service (`realtime-service/`)** — Node.js, TypeScript, WebSocket server (`ws`), Kafka consumer, JWT verification, Pino

**Client** — React 19, Vite, TypeScript, Tailwind CSS, Radix UI, TanStack Query, Zustand, React Hook Form

## Project Structure

```
mern-setup/
├── client/                 # React + Vite frontend
├── gateway/                 # Public REST edge — the only service the browser talks to
│   ├── config/               # Redis, logger, env validation
│   ├── controllers/, routes/ # same REST surface server/ used to expose directly
│   ├── grpc/                 # gRPC client + error-mapping to/from AppError
│   ├── middlewares/           # auth (JWT), rate limiting, validation, sanitization, error handling
│   └── validators/            # copy of server's Zod schemas — validation happens at the edge now
├── server/                 # auth-service — REST (internal only) + gRPC API
│   ├── config/             # DB, Redis, Kafka, logger, env validation
│   ├── controllers/, routes/ # REST — no longer reachable from outside Docker, kept for /docs
│   ├── grpc/                # gRPC server — thin wrappers around services/
│   ├── migrations/         # migrate-mongo migrations
│   ├── models/
│   ├── openapi/            # Scalar API docs (served at /docs, proxied through gateway)
│   ├── services/
│   ├── utils/               # includes domainEvents.ts (publishes login/MFA/reset/deactivate events)
│   └── validators/
├── notification-service/   # Kafka consumer that sends OTP/security emails
│   ├── config/              # Kafka, email (SMTP), logger, env validation
│   └── services/            # email template + send-with-retry
├── realtime-service/       # Kafka consumer that pushes auth events over WebSocket
│   ├── config/              # Kafka, logger, env validation
│   └── services/            # connection registry, JWT verification
├── proto/auth.proto         # Shared gRPC contract between gateway and server
├── nginx/nginx.conf         # Load balancer config — round-robins across gateway's replicas
├── mongo/init-replica-set.js # Initiates the 3-node MongoDB replica set, run once by mongo-init
├── prometheus/prometheus.yml # Scrape config — DNS SD for gateway's replicas, static targets for the rest
├── grafana/                 # provisioning/ (datasource + dashboard provider config) + dashboards/ (dashboard JSON)
├── pnpm-workspace.yaml      # client, server, gateway, notification-service, realtime-service
└── docker-compose.yml       # MongoDB (3-node replica set) + Redis + Kafka + server + gateway (x3 replicas) + nginx + notification-service + realtime-service + prometheus + grafana
```

`server` publishes Kafka events instead of doing the work in-request:
- `auth.otp-email.requested` → `notification-service` sends the email.
- `auth.domain-events` (`login`, `mfa.toggled`, `password.reset`, `account.deactivated`) → `realtime-service` pushes it to the user's connected WebSocket, if any (`ws://<realtime-service>/ws?token=<JWT>` — connected to directly, not through the gateway).

`gateway` talks to `server` over gRPC (not REST) for everything except `/docs` and `/openapi.json`, which it reverse-proxies as plain HTTP. `nginx` sits in front of `gateway`, load-balancing across `${GATEWAY_REPLICAS:-3}` replicas — it's now the only thing the browser talks to directly. See [ARCHITECTURE.md](ARCHITECTURE.md) for the full request-flow diagram.

Every port and container/network name is driven by env vars with sane defaults — nothing is hardcoded in `docker-compose.yml`, the Dockerfiles, or the app code. See [Environment Variables](#environment-variables).

## Prerequisites

- Node.js 22+
- pnpm 10+ (`corepack enable`)
- Docker + Docker Compose (for the containerized setup, or to run just Mongo/Redis/Kafka locally)
- MongoDB, Redis, and Kafka instances (only if running the services outside Docker entirely)

## Getting Started

This is a pnpm workspace (`client`, `server`, `gateway`, `notification-service`, `realtime-service` — see `pnpm-workspace.yaml`).

### 1. Clone and install

```bash
git clone <repo-url>
cd mern-setup
pnpm install   # installs all five workspace packages
```

### 2. Configure environment variables

Copy the sample env files and fill in real values:

```bash
cp server/.env.example server/.env
cp gateway/.env.example gateway/.env
cp notification-service/.env.example notification-service/.env
cp realtime-service/.env.example realtime-service/.env
cp client/.env.example client/.env
cp .env.example .env             # only needed if you want to override Docker Compose ports/names
```

**`gateway`'s and `realtime-service`'s `JWT_SECRET` must both be set to the exact same value as `server`'s** — they verify tokens `server` issues, not their own.

See [Environment Variables](#environment-variables) below for what each key does.

### 3a. Run with Docker (recommended for the backend)

Starts the 3-node MongoDB replica set, Redis, Kafka, the auth server, 3 gateway replicas behind nginx, the notification worker, the realtime worker, and Prometheus + Grafana together:

```bash
docker compose up --build
```

The API is available at `http://localhost:5003` (nginx, load-balancing across the gateway replicas — `server`'s own port is internal-only), with `GET /health` for a liveness check (nginx's own probe lives at `/nginx-health`, used only by its Docker healthcheck). Then run the client separately:

```bash
pnpm --filter client dev
```

### Monitoring (Prometheus + Grafana)

- Grafana: `http://localhost:3003` (default login `admin`/`admin`, set via `GRAFANA_ADMIN_USER`/`GRAFANA_ADMIN_PASSWORD` — change before exposing it beyond your own machine). The "MERN Setup Overview" dashboard is auto-provisioned and shows up immediately, no manual import needed.
- Prometheus: `http://localhost:9090` — useful for ad-hoc PromQL queries or checking `/targets` to confirm every service (including all 3 `gateway` replicas individually) is being scraped successfully.
- Every service exposes its own `/metrics` directly too (e.g. `docker exec mern_server wget -qO- http://127.0.0.1:5000/metrics`), if you want to see the raw Prometheus text format for one service without going through the dashboard.

### 3b. Run everything locally (no Docker)

Bring up just the backing infra via Docker, then run the Node services locally for fast iteration:

```bash
docker compose up -d mongo1 mongo2 mongo3 mongo-init redis kafka
pnpm dev   # runs server + gateway + notification-service + realtime-service + client concurrently
```

`server/.env.example`'s default `MONGO_URI` already points at this replica set's host-published
ports (`27017`/`27018`/`27019`). For a plain standalone Mongo instead (no replica set, e.g. your
own local `mongod`), use `mongodb://127.0.0.1:27017` with no `?replicaSet=` param.

Or individually:

```bash
pnpm --filter server dev                 # REST http://localhost:5000 (internal), gRPC :50051
pnpm --filter gateway dev                # http://localhost:5003 — point the client here
pnpm --filter notification-service dev   # health check on http://localhost:5001/health
pnpm --filter realtime-service dev       # ws://localhost:5002/ws, health on http://localhost:5002/health
pnpm --filter client dev                 # http://localhost:3001
```

## Environment Variables

### Server (`server/.env`, see `server/.env.example`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | No | `development` | `development` \| `production` \| `test` |
| `PORT` | No | `5000` | REST API port — internal-only in Docker now; still used for local `pnpm dev` and for `gateway`'s `/docs` proxy target |
| `GRPC_PORT` | No | `50051` | gRPC server port — `gateway` is the only caller |
| `LOG_LEVEL` | No | `debug` in dev, `info` otherwise | Pino log level: `trace`\|`debug`\|`info`\|`warn`\|`error`\|`fatal` |
| `MONGO_URI` | No | `mongodb://127.0.0.1:27017,127.0.0.1:27018,127.0.0.1:27019/?replicaSet=rs0` | MongoDB connection string, replica-set seeds by default (no db name — set via `MONGO_DB_NAME`); use a plain single-host URI with no `?replicaSet=` for a standalone `mongod` |
| `MONGO_DB_NAME` | No | `mern_app` | Database name, passed to Mongoose separately from the connection string |
| `REDIS_URL` | No | `redis://127.0.0.1:6379` | Redis connection string (profile cache — rate limiting moved to `gateway`) |
| `PROFILE_CACHE_TTL` | No | `300` | Seconds `GET /profile` responses are cached in Redis |
| `JWT_SECRET` | Yes | — | Min 32 characters, used to sign auth tokens — `gateway` and `realtime-service` must share this exact value |
| `JWT_EXPIRES_IN` | No | `7d` | JWT expiry |
| `BCRYPT_ROUNDS` | No | `12` | Password hashing cost |
| `KAFKA_BROKERS` | No | `127.0.0.1:9094` | Kafka broker(s) — `server` only produces, never consumes |
| `OTP_EXPIRY_MINUTES` | No | `5` | OTP validity window |
| `OTP_MAX_ATTEMPTS` | No | `5` | Failed OTP attempts before lockout |
| `CLIENT_URL` | No | — | Frontend origin, added to the CORS allowlist |

Note: `docker-compose.yml` overrides `MONGO_URI`, `MONGO_DB_NAME`, `REDIS_URL`, `KAFKA_BROKERS`, and `NODE_ENV` at runtime to point at the in-network service names — the values in `server/.env` are only used for local (non-Docker) runs.

Note: `server` has no HTTP-layer rate limiting of its own (removed — see ROADMAP.md's bugfix-pass notes) since `gateway` is the sole enforcement point and gRPC traffic never goes through Express middleware anyway. `server`'s own REST middleware for CORS, `express-mongo-sanitize`, and JWT auth is otherwise unchanged from before `gateway` existed and still runs — it's just no longer reachable from outside the Docker network, since only `gateway`'s copies of these actually gate real traffic now. Left as-is rather than trimmed, since `server`'s REST app still needs to serve `/docs`.

### Gateway (`gateway/.env`, see `gateway/.env.example`)

The public REST edge — see [ARCHITECTURE.md](ARCHITECTURE.md#gateway) for what it does.

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | No | `development` | `development` \| `production` \| `test` |
| `PORT` | No | `5003` | REST API port — in-container only now, not published to the host; `nginx` proxies to it and is what the client should point at |
| `LOG_LEVEL` | No | `debug` in dev, `info` otherwise | Same as `server`'s |
| `REDIS_URL` | No | `redis://127.0.0.1:6379` | Redis connection string (rate limiting — moved here from `server`) |
| `GRPC_SERVER_URL` | No | `127.0.0.1:50051` | Where `server`'s gRPC server is |
| `DOCS_PROXY_TARGET` | No | `http://127.0.0.1:5000` | Where `server`'s REST app is, for the `/docs`/`/openapi.json` reverse proxy |
| `JWT_SECRET` | Yes | — | **Must exactly match `server`'s** — tokens are issued by `server`, verified here |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | General API rate-limit window |
| `RATE_LIMIT_MAX` | No | `100` | Max requests per window (general) |
| `AUTH_RATE_LIMIT_MAX` | No | `10` | Max requests per window (auth routes) |
| `CLIENT_URL` | No | — | Frontend origin, added to the CORS allowlist |

### Notification service (`notification-service/.env`, see `notification-service/.env.example`)

Consumes the OTP-email events `server` publishes to Kafka and actually sends them — SMTP config lives here now, not in `server`.

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | No | `development` | `development` \| `production` \| `test` |
| `HEALTH_PORT` | No | `5001` | Port for the `/health` endpoint (Docker healthcheck only) |
| `LOG_LEVEL` | No | `debug` in dev, `info` otherwise | Same as `server`'s |
| `KAFKA_BROKERS` | No | `127.0.0.1:9094` | Kafka broker(s) |
| `SMTP_HOST` / `SMTP_PORT` | No | — | SMTP server for sending OTP emails |
| `SMTP_SECURE` | No | `false` | `true` for implicit TLS (port 465), `false` for STARTTLS (port 587) |
| `SMTP_USER` / `SMTP_PASS` | Yes | — | SMTP credentials |
| `SMTP_FROM_NAME` | No | `Demo Application` | Sender name on OTP emails |
| `OTP_EXPIRY_MINUTES` | No | `5` | Shown in the email copy — should match `server`'s value |

### Realtime service (`realtime-service/.env`, see `realtime-service/.env.example`)

Consumes the `login`/`mfa.toggled`/`password.reset`/`account.deactivated` events `server` publishes to Kafka and pushes them to the matching user's WebSocket connection(s), if any are open.

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | No | `development` | `development` \| `production` \| `test` |
| `PORT` | No | `5002` | Port for both the WebSocket upgrade (`/ws`) and `/health` |
| `LOG_LEVEL` | No | `debug` in dev, `info` otherwise | Same as `server`'s |
| `KAFKA_BROKERS` | No | `127.0.0.1:9094` | Kafka broker(s) |
| `JWT_SECRET` | Yes | — | **Must exactly match `server`'s** — tokens are issued by `server`, verified here |

### Client (`client/.env`, see `client/.env.example`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | No | `http://localhost:5003` | Base URL the client calls the API on — points at `gateway`, not `server`, now |
| `CLIENT_PORT` | No | `3001` | Vite dev server port (read in `vite.config.js`) |

### Docker Compose orchestration (root `.env`, see `.env.example`)

Only relevant when running via `docker compose` — controls container names and host-published ports, not app behavior.

| Variable | Default | Description |
|---|---|---|
| `MONGO1_CONTAINER_NAME` | `mongo1` | Replica set node 1 container name |
| `MONGO1_PORT` | `27017` | Host port `mongo1` is published on |
| `MONGO2_CONTAINER_NAME` | `mongo2` | Replica set node 2 container name |
| `MONGO2_PORT` | `27018` | Host port `mongo2` is published on |
| `MONGO3_CONTAINER_NAME` | `mongo3` | Replica set node 3 container name |
| `MONGO3_PORT` | `27019` | Host port `mongo3` is published on |
| `MONGO_INIT_CONTAINER_NAME` | `mongo_init` | One-shot replica-set-initiation container name |
| `MONGO_DB_NAME` | `mern_app` | Database name — passed to the server as `MONGO_DB_NAME` |
| `REDIS_CONTAINER_NAME` | `redis` | Redis container/service name |
| `REDIS_PORT` | `6379` | Host port Redis is published on |
| `SERVER_CONTAINER_NAME` | `mern_server` | auth-service container name |
| `SERVER_PORT` | `5000` | In-container `PORT` only — **not published to the host** (`gateway` is the entry point) |
| `SERVER_GRPC_PORT` | `50051` | In-container gRPC port — only `gateway` reaches this, within the network |
| `GATEWAY_REPLICAS` | `3` | Number of `gateway` replicas nginx load-balances across — no fixed container name, Docker auto-names each (`mern-setup-gateway-1`, `-2`, ...) |
| `NGINX_CONTAINER_NAME` | `mern_nginx` | Load balancer container name |
| `GATEWAY_PORT` | `5003` | Host-published on `nginx` now — the only public entry point; the client points here |
| `KAFKA_CONTAINER_NAME` | `kafka` | Kafka container/service name |
| `KAFKA_PORT` | `9092` | Internal listener — only reachable from other containers |
| `KAFKA_HOST_PORT` | `9094` | Host-published listener — for local (non-Docker) `pnpm dev` and Kafka client tools |
| `NOTIFICATION_CONTAINER_NAME` | `mern_notification_service` | Notification worker container name |
| `NOTIFICATION_HEALTH_PORT` | `5001` | Notification worker's internal `/health` port |
| `REALTIME_CONTAINER_NAME` | `mern_realtime_service` | Realtime worker container name |
| `REALTIME_PORT` | `5002` | Host-published — browser clients connect directly (no gateway in front of it yet) |
| `PROMETHEUS_CONTAINER_NAME` | `mern_prometheus` | Prometheus container name |
| `PROMETHEUS_PORT` | `9090` | Host port for the Prometheus UI/API |
| `GRAFANA_CONTAINER_NAME` | `mern_grafana` | Grafana container name |
| `GRAFANA_PORT` | `3003` | Host port for the Grafana UI |
| `GRAFANA_ADMIN_USER` | `admin` | Grafana admin username |
| `GRAFANA_ADMIN_PASSWORD` | `admin` | Grafana admin password — change before exposing it beyond your own machine |
| `NETWORK_NAME` | `mern_network` | Docker network name shared by all services |

## Available Scripts

| Location | Command | Description |
|---|---|---|
| root | `pnpm dev` | Run server + gateway + notification-service + realtime-service + client concurrently |
| root | `pnpm build` | Build server + gateway + notification-service + realtime-service + client |
| server | `pnpm dev` | Start API (REST + gRPC) with hot reload (nodemon + tsx) |
| server | `pnpm build` | Compile TypeScript to `dist/` |
| server | `pnpm start` | Run the compiled server |
| server | `pnpm check` | Lint + format check (Biome) |
| gateway | `pnpm dev` | Start the REST edge with hot reload |
| gateway | `pnpm build` | Compile TypeScript to `dist/` |
| server | `pnpm migrate:status` | Show which database migrations are applied/pending |
| server | `pnpm migrate:up` | Apply pending migrations |
| server | `pnpm migrate:down` | Revert the last applied migration |
| server | `pnpm migrate:create -- <name>` | Scaffold a new migration file |
| notification-service | `pnpm dev` | Start the Kafka consumer with hot reload |
| notification-service | `pnpm build` | Compile TypeScript to `dist/` |
| realtime-service | `pnpm dev` | Start the WebSocket server with hot reload |
| realtime-service | `pnpm build` | Compile TypeScript to `dist/` |
| client | `pnpm dev` | Start Vite dev server |
| client | `pnpm build` | Production build |
| client | `pnpm preview` | Preview the production build |

## Database Migrations

Schema/index changes go through [migrate-mongo](https://github.com/seppevs/migrate-mongo) rather than Mongoose's automatic index creation — `autoIndex` is only enabled when `NODE_ENV=development` (see `server/config/connectDB.ts`), so migrations are the source of truth everywhere else.

- Migration files live in `server/migrations/`, config in `server/migrate-mongo-config.js`.
- Run `pnpm migrate:up` (from `server/`) after pulling changes that add a migration, and before deploying.
- `pnpm migrate:create -- descriptive-name` scaffolds a new one with `up`/`down` exports.

## Docker

```bash
docker compose up --build     # start everything: MongoDB (3-node replica set), Redis, Kafka, server, gateway (x3 replicas) + nginx, notification-service, realtime-service, prometheus, grafana
docker compose down            # stop
docker compose down -v         # stop and remove data volumes (including all 3 mongo nodes' data, and Prometheus/Grafana's own state)
```

Each service's `Dockerfile` is a multi-stage build (deps → compile → runtime) producing a minimal, non-root production image with a container-level healthcheck. `server` and `gateway` build from the **repo-root** context (`context: .`), not their own directory, since both need `../proto/auth.proto` — see [ARCHITECTURE.md](ARCHITECTURE.md#infrastructure). `nginx` uses the unmodified upstream `nginx:1.27-alpine` image with `nginx/nginx.conf` mounted read-only — it load-balances across `gateway`'s replicas by re-resolving Docker's embedded DNS (`127.0.0.11`) per request, so scale `gateway` up/down freely via `GATEWAY_REPLICAS` without touching the config. `mongo1`/`mongo2`/`mongo3` are unmodified `mongo:7` images running as a replica set (`rs0`); the one-shot `mongo-init` service initiates it once (idempotent — safe to leave running on every `up`). `prometheus` and `grafana` are unmodified upstream images too, configured entirely via mounted files (`prometheus/prometheus.yml`, `grafana/provisioning/`, `grafana/dashboards/`) — see [Monitoring](#monitoring-prometheus--grafana) above.
