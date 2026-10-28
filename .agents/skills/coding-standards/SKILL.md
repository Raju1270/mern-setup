# Coding Standards

## Core Principles

- Reduce code size, Write minimal, efficient, and readable code, Use RETURN statements.
- COMMENT WILL BE SMALL AND PRECISE.
- ALL COMMENTS IN UPPERCASE AND END WITH A PERIOD.
- Follow functional programming patterns.
- Avoid overly clever code.

## 1. Code Quality & Structure

- Prefer arrow functions and functional programming techniques.
- Apply the Single Responsibility Principle (SRP) to all functions and components.
- Use early returns to reduce nesting and improve clarity.
- Avoid repetition — extract reusable logic into helper functions.

## 2. Style & Syntax

- Use modern ES6+ syntax (arrow functions, destructuring, template literals, const/let).
- Maintain consistent naming conventions:
  - `camelCase` for variables and functions
  - `PascalCase` for components and classes
- Avoid overly clever, cryptic, or magic code — clarity over cleverness.

## 3. Comments & Documentation

- KEEP COMMENTS SHORT, PRECISE, AND MEANINGFUL.
- ALL COMMENTS MUST BE IN UPPERCASE AND END WITH A PERIOD.
- Comment why something is done, not what the code does (unless necessary).
- Add comments only when the intent is not immediately obvious.

## 4. Error Handling

- Use structured error handling (try/catch, guards, fallbacks).
- Do not allow silent failures — provide clear error messages.
- Validate all external inputs before use.

## 5. Performance & Optimization

- Optimize loops, conditions, and render paths.
- Avoid unnecessary re-renders in React; memoize only when justified.
- Reduce complexity where possible and remove unnecessary computations.
- Prefer built-in APIs over third-party dependencies when feasible.

## 6. Security & Safety

- Avoid unsafe patterns (eval, insecure regex, hardcoded secrets).
- Sanitize and validate all user inputs.
- Design with least privilege and safe defaults.

## 7. Consistency & Predictability

- Follow consistent patterns across the codebase.
- Respect existing architecture, folder structure, and naming standards.
- Ensure deterministic behavior — avoid side effects unless intentional and documented.

## 8. Output Expectations

- Code responses must be:
  - Direct
  - Concise
  - Well-structured
- When refactoring, maintain existing functionality unless otherwise specified.

## 9. AI Behavior Rules

- These rules apply to all generated code, reviews, optimizations, and refactors.
- When explaining code, keep explanations brief unless detailed reasoning is requested.
- Always prioritize producing high-quality, production-ready code.





# Scale-out roadmap: logger, gateway, Kafka, workers, notifications, websockets, monitoring, tracing, DB scaling/migrations, security

## Context

The project is currently a single Express service (`server/`) plus a React client, backed by MongoDB and Redis (used for rate limiting + profile caching, both hardened earlier this session). The user wants to grow this into a properly scaled-out system: load balancer, API gateway, Kafka-based messaging, background email workers, a notification service, websockets, monitoring, distributed tracing, DB scaling, database migrations, and further security hardening.

Given the size of this ask (14 subsystems), the user chose, via clarifying questions:
- **Architecture**: true microservices — separate deployable services communicating over Kafka/HTTP, not one big modular monolith.
- **Environment**: local Docker Compose only — no cloud provider assumptions.
- **Phasing**: foundational work first, then infra, across multiple passes rather than one giant change.
- **Notifications**: email only for now, decoupled from the request path via a queue — no SMS/push scaffolding.

To keep this reviewable, the work is split into 5 phases. **This plan executes Phase 1 now.** Phases 2-5 are scoped here so the full roadmap is visible and agreed, but I will stop and check in before starting Phase 2 — each later phase adds new infrastructure (Kafka, new services, Nginx, a Mongo replica set, Prometheus/Jaeger) and deserves its own review rather than landing as one unreviewable diff.

`server/` is **not** renamed to `services/auth-service/`. It keeps acting as the auth service as-is (no import churn, no git history disruption); new services in later phases are added as new sibling folders at the repo root (matching the existing `client/` / `server/` pattern), e.g. `notification-service/`, `realtime-service/`, `gateway/`.

## Full roadmap (for visibility — only Phase 1 is implemented now)

- **Phase 1 (now)**: structured logger, security hardening, database migrations. All within `server/`, no new infrastructure.
- **Phase 2**: Kafka (docker-compose, KRaft single-broker for local dev) + `notification-service` (Kafka consumer that sends the OTP/security emails currently sent in-request) + `auth-service` publishes domain events instead of calling the mailer directly. This is also the "background workers for emails" item — one service covers both.
- **Phase 3**: `realtime-service` (WebSocket server) — consumes the same Kafka domain events (login, MFA toggle, password reset, deactivate) and pushes them to the connected client's authenticated socket, if online. Reuses the Phase 2 event backbone instead of inventing a new feature.
- **Phase 4**: Nginx load balancer in front of scaled `gateway` replicas; a new `gateway` service (routing, centralized CORS/helmet/rate limiting, JWT verification) becomes the only public entry point, `auth-service` becomes internal-only; MongoDB replica set (3 nodes) for read scaling/HA, replacing the single `mongodb` container.
- **Phase 5**: Prometheus + Grafana (metrics, via `prom-client` on each service) and OpenTelemetry + Jaeger (distributed tracing across gateway → auth-service → Kafka → notification-service/realtime-service).

## Phase 1 — Implementation details

### 1. Structured logger (Pino)

- Add `pino` + `pino-http` (runtime) and `pino-pretty` (dev-only pretty printing) to `server/package.json`. Pino is used instead of Winston: faster, JSON-structured by default, and the standard modern choice — this also sets up Phase 5's tracing/log correlation cleanly.
- New `server/config/logger.ts`: exports a configured `pino` instance — JSON output in production, `pino-pretty` transport in development, level from `process.env.LOG_LEVEL` (default `info`, `debug` in dev).
- `server/index.ts`: replace `morgan(isDev ? "dev" : "combined")` with `pinoHttp({ logger })`. Remove the `morgan` dependency and its `@types/morgan` once unused.
- Replace the 9 files currently using `console.log`/`console.error`/`console.warn` with the shared logger, keeping the existing messages: `config/emailConfig.ts`, `config/validateEnv.ts`, `config/connectDB.ts`, `config/redis.ts`, `middlewares/rateLimiter.ts`, `middlewares/errorHandler.ts`, `utils/cache.ts`, `utils/otpHelper.ts`, `index.ts`.

### 2. Security hardening

- Add `express-mongo-sanitize` (strips `$`/`.` keys from `req.body`/`req.query`/`req.params` to block NoSQL operator injection) and `hpp` (HTTP parameter pollution guard), wired in `index.ts` right after the body parsers.
- **Bug fix**: malformed JSON request bodies currently return a raw `500 "Something went wrong"` instead of a `400`. `express.json()` throws an `http-errors`-shaped error (`err.statusCode = 400`, `err.type = "entity.parse.failed"`) on bad JSON, but `errorHandler.ts`'s branches only special-case `AppError` (via `isOperational`) — everything else falls into the generic 500 branch, regardless of the error's own status code. Fix: add an explicit branch in `errorHandler.ts` for `err.type === "entity.parse.failed"` → `400 "Malformed JSON in request body"`, matching the existing pattern (`ValidationError`, `CastError`, duplicate key, JWT errors are all handled the same explicit way already).
- `config/connectDB.ts`: set `mongoose.set("autoIndex", isDev)` so index changes are only auto-applied in dev; in staging/prod, index changes go through the new migration tool (see below) instead of being built implicitly at boot.

### 3. Database migrations (migrate-mongo)

- Add `migrate-mongo` as a dev dependency (works over the native MongoDB driver, keeps its own migration-log collection — no ORM lock-in, and it's the standard tool for unmanaged Mongoose schemas).
- `server/migrate-mongo-config.cjs`: reads `MONGO_URI`/`MONGO_DB_NAME` from env (same defaults as `config/constants.ts`), migrations directory `server/migrations`.
- `server/migrations/`: one initial migration that explicitly creates the indexes Mongoose currently builds implicitly (unique index on `users.email`), so index management has an explicit, reviewable history now that `autoIndex` is off outside dev.
- `server/package.json` scripts: `migrate:up`, `migrate:down`, `migrate:status`, `migrate:create`.
- Short section added to `README.md` on running migrations locally and via Docker.

## Verification (Phase 1)

- `pnpm exec tsc --noEmit` and `pnpm exec biome check .` clean.
- Start the stack (`docker compose up -d mongodb redis`, then `pnpm dev`); confirm:
  - Requests produce structured pino log lines instead of morgan/console output.
  - A request with a `$where`/`$gt`-style operator in the body no longer reaches Mongoose as an operator (mongo-sanitize strips it).
  - `POST /api/v1/auth/login` with a deliberately malformed JSON body (`{"email":`) returns `400 {"status":"fail","message":"Malformed JSON in request body"}` instead of `500`.
  - `pnpm migrate:status` shows the initial migration pending; `pnpm migrate:up` applies it; confirm the `users` collection's email index still exists and `migrate:down` reverses cleanly.
- Clean up any test data/containers touched during verification, same as earlier in this session.
