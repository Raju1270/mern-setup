# MERN Setup

A full-stack MERN starter with JWT authentication, email OTP verification, MFA, and a Redis-backed distributed rate limiter — ready to run locally or via Docker Compose.

## Tech Stack

**Server** — Node.js, Express 5, TypeScript, MongoDB (Mongoose), Redis (ioredis), Zod, JWT, Nodemailer, Biome

**Client** — React 19, Vite, TypeScript, Tailwind CSS, Radix UI, TanStack Query, Zustand, React Hook Form

## Project Structure

```
mern-setup/
├── client/          # React + Vite frontend
├── server/          # Express + TypeScript API
│   ├── config/      # DB, Redis, email, env validation
│   ├── controllers/
│   ├── middlewares/ # auth, rate limiting, validation, error handling
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   └── validators/
└── docker-compose.yml  # MongoDB + Redis + server
```

Every port and container/network name is driven by env vars with sane defaults — nothing is hardcoded in `docker-compose.yml`, `server/Dockerfile`, or the app code. See [Environment Variables](#environment-variables).

## Prerequisites

- Node.js 22+
- pnpm 10+ (`corepack enable`)
- Docker + Docker Compose (for the containerized setup)
- A MongoDB instance and a Redis instance (only if running the server outside Docker)

## Getting Started

### 1. Clone and install

```bash
git clone <repo-url>
cd mern-setup
pnpm install                 # root (tooling)
pnpm --filter server install
pnpm --filter client install
```

### 2. Configure environment variables

Copy the sample env files and fill in real values:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
cp .env.example .env             # only needed if you want to override Docker Compose ports/names
```

See [Environment Variables](#environment-variables) below for what each key does.

### 3a. Run with Docker (recommended for the backend)

Starts MongoDB, Redis, and the API server together:

```bash
docker compose up --build
```

The API is available at `http://localhost:5000`, with `GET /health` for a liveness check. Then run the client separately:

```bash
pnpm --filter client dev
```

### 3b. Run everything locally (no Docker)

Requires MongoDB and Redis running locally (e.g. `mongod` and `redis-server`, or local installs matching the hosts in `server/.env`):

```bash
pnpm dev   # runs server + client concurrently via the root script
```

Or individually:

```bash
pnpm --filter server dev   # http://localhost:5000
pnpm --filter client dev   # http://localhost:3001
```

## Environment Variables

### Server (`server/.env`, see `server/.env.example`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | No | `development` | `development` \| `production` \| `test` |
| `PORT` | No | `5000` | API server port |
| `MONGO_URI` | No | `mongodb://127.0.0.1:27017` | MongoDB connection string (no db name — set via `MONGO_DB_NAME`) |
| `MONGO_DB_NAME` | No | `mern_app` | Database name, passed to Mongoose separately from the connection string |
| `REDIS_URL` | No | `redis://127.0.0.1:6379` | Redis connection string (rate limiting, profile cache) |
| `PROFILE_CACHE_TTL` | No | `300` | Seconds `GET /profile` responses are cached in Redis |
| `JWT_SECRET` | Yes | — | Min 32 characters, used to sign auth tokens |
| `JWT_EXPIRES_IN` | No | `7d` | JWT expiry |
| `BCRYPT_ROUNDS` | No | `12` | Password hashing cost |
| `SMTP_HOST` / `SMTP_PORT` | No | — | SMTP server for sending OTP emails |
| `SMTP_SECURE` | No | `false` | `true` for implicit TLS (port 465), `false` for STARTTLS (port 587) |
| `SMTP_USER` / `SMTP_PASS` | No | — | SMTP credentials |
| `SMTP_FROM_NAME` | No | `Demo Application` | Sender name on OTP emails |
| `OTP_EXPIRY_MINUTES` | No | `5` | OTP validity window |
| `OTP_MAX_ATTEMPTS` | No | `5` | Failed OTP attempts before lockout |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | General API rate-limit window |
| `RATE_LIMIT_MAX` | No | `100` | Max requests per window (general) |
| `AUTH_RATE_LIMIT_MAX` | No | `10` | Max requests per window (auth routes) |
| `CLIENT_URL` | No | — | Frontend origin, added to the CORS allowlist |

Note: `docker-compose.yml` overrides `MONGO_URI`, `MONGO_DB_NAME`, and `REDIS_URL` at runtime to point at the `mongodb` and `redis` service names — the values in `server/.env` are only used for local (non-Docker) runs.

### Client (`client/.env`, see `client/.env.example`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | No | `http://localhost:5000` | Base URL the client calls the API on |
| `CLIENT_PORT` | No | `3001` | Vite dev server port (read in `vite.config.js`) |

### Docker Compose orchestration (root `.env`, see `.env.example`)

Only relevant when running via `docker compose` — controls container names and host-published ports, not app behavior.

| Variable | Default | Description |
|---|---|---|
| `MONGO_CONTAINER_NAME` | `mongodb` | MongoDB container/service name |
| `MONGO_PORT` | `27017` | Host port MongoDB is published on |
| `MONGO_DB_NAME` | `mern_app` | Database name — used to init Mongo and passed to the server as `MONGO_DB_NAME` |
| `REDIS_CONTAINER_NAME` | `redis` | Redis container/service name |
| `REDIS_PORT` | `6379` | Host port Redis is published on |
| `SERVER_CONTAINER_NAME` | `mern_server` | API container name |
| `SERVER_PORT` | `5000` | Host port and in-container `PORT` the API listens on |
| `NETWORK_NAME` | `mern_network` | Docker network name shared by all three services |

## Available Scripts

| Location | Command | Description |
|---|---|---|
| root | `pnpm dev` | Run server + client concurrently |
| root | `pnpm build` | Build server + client |
| server | `pnpm dev` | Start API with hot reload (nodemon + tsx) |
| server | `pnpm build` | Compile TypeScript to `dist/` |
| server | `pnpm start` | Run the compiled server |
| server | `pnpm check` | Lint + format check (Biome) |
| client | `pnpm dev` | Start Vite dev server |
| client | `pnpm build` | Production build |
| client | `pnpm preview` | Preview the production build |

## Docker

```bash
docker compose up --build     # start MongoDB, Redis, server
docker compose down            # stop
docker compose down -v         # stop and remove data volumes
```

`server/Dockerfile` is a multi-stage build (deps → compile → runtime) producing a minimal, non-root production image with a container-level healthcheck against `GET /health`.
