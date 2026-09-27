# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Fold Papper is a Pinterest-like site: a Spring Boot 3.3 API (Java 17, PostgreSQL 16) in `backend/` and a React SPA in `frontend/`. Users post pins, collect them on boards, follow each other, and react with **peppers** instead of likes. A pepper has a heat level from 1 to 5. There are no user roles and no admin panel yet.

Code comments, API error messages, and the smoke test are written in Russian. Keep new user-facing messages and comments in Russian to match.

## Commands

There is no Maven wrapper, so use a system `mvn`. Run all Maven commands from `backend/`.

```sh
docker compose up -d                 # Postgres on :5432 (db/user/password: foldpapper), from repo root
mvn spring-boot:run                  # run the app on :8080 (needs Postgres; Flyway migrates on startup)
mvn package                          # build target/foldpapper-backend-0.1.0-SNAPSHOT.jar
mvn test                             # run tests
mvn test -Dtest=ClassName#method     # run a single test
sh smoke-test.sh [base_url]          # end-to-end API check with curl against a running app (repo root)
sh seed-demo.sh [base_url]           # demo users/boards/pins; login anna.chili / demo-pepper-2026 (repo root)
```

Frontend commands, run from `frontend/` (Node 22.22+):

```sh
npm run dev          # Vite on :5173, proxies /api and /uploads to BACKEND_URL (default http://localhost:8080)
npm run typecheck    # tsc -b; there is no linter or test runner
npm run build        # typecheck + production build into dist/
```

Keep `*.sh` files LF (enforced by `.gitattributes`): with CRLF, bash fails on the first line.

`src/test` is currently empty. The test dependencies (spring-boot-testcontainers, testcontainers-postgresql, spring-security-test) are already declared, so tests that touch the database should use Testcontainers Postgres instead of H2. The schema uses `pg_trgm` and Postgres-specific DDL.

Environment overrides: `DB_URL`, `DB_USER`, `DB_PASSWORD`, `SERVER_PORT`, `JWT_SECRET`, `JWT_TTL` (ISO-8601 duration, default `P7D`), and `STORAGE_DIR` (default `./uploads`). Swagger UI is served at `/swagger-ui.html`.

## Architecture

Packages under `com.foldpapper` are organized by feature (`user`, `pin`, `board`, `pepper`, `tag`, `follow`, `media`). Each feature has its own Entity, Repository, Service, and Controller, with request/response records in a `dto/*Dtos.java` holder class or in `PepperDtos`. Cross-cutting code lives in `common`, `config`, and `security`.

**Schema is owned by Flyway.** Hibernate runs with `ddl-auto: validate`, so every entity change needs a new `db/migration/V{n}__*.sql`. Never edit `V1__init.sql`. `open-in-view` is off: load associations inside `@Transactional` service methods, using `@EntityGraph` on repositories or `default_batch_fetch_size`. `@EntityGraph` resolves its paths against the repository's own entity. So a query in `PepperRepository` or `BoardPinRepository` that returns `Pin` must use `JOIN FETCH p.author` instead, or it fails at runtime.

**Denormalized counters.** `pins.pepper_count`, `pins.heat_score`, `pins.save_count`, and `boards.pin_count` are stored columns, so feeds can be sorted without joins. They are only changed by atomic `@Modifying` JPQL `UPDATE`s in `PinRepository`/`BoardRepository` (`applyPepperAdded`, `applyHeatDelta`, `applyPepperRemoved`, `increment/decrementSaveCount`, etc.). Never change them by read-modify-write on the entity. Any code that adds or removes a pepper or a board_pin must call the matching counter update in the same transaction. For examples, see `PepperService` and `BoardPinService`. These updates use `clearAutomatically = true`, so managed entities in the persistence context are detached afterwards.

**Pepper semantics.** Each (pin, user) pair has at most one pepper (unique constraint). `PUT /pins/{id}/pepper` is idempotent: it creates the pepper or changes its heat and applies the heat delta. `heat_score` is the sum of all pepper heats. The `sort=hot` feed orders by it.

**Saving = board_pins.** A pin can sit on many boards. Adding a pin to a board is the "save" action and increments `save_count`. Removing the board's cover pin clears `boards.cover_pin_id`. Board slugs are unique per owner (`common/Slugs`).

**Auth.** Auth is a stateless JWT (jjwt). `JwtAuthenticationFilter` builds an `AppUserPrincipal` (id + username) straight from the token claims without querying the database. Controllers receive it via `@AuthenticationPrincipal AppUserPrincipal`, which is `null` for anonymous callers on public endpoints. `SecurityConfig` allows anonymous `GET` on `/api/v1/pins|boards|users|tags/**`, plus auth, uploads, health, and Swagger. Everything else requires a token. This is why the authenticated home feed is at `/api/v1/feed`, outside `/pins`. Login accepts a username or an email.

**Responses and errors.**
- Paginated endpoints return `common/PageResponse`, never a Spring `Page`.
- Business errors throw `ApiException` through its factories (`notFound`, `forbidden`, `conflict`, `badRequest`). `GlobalExceptionHandler` maps them to `ApiErrorResponse` JSON. `DataIntegrityViolationException` becomes a 409.
- `PinService` fills in the per-viewer `myPepper` field with one batched query per page (`findByUserIdAndPinIdIn`). Keep this pattern and avoid per-pin lookups.
- Page size is capped at 100.

**Media.** `ImageStorageService` writes uploads to `{STORAGE_DIR}/yyyy/MM/{uuid}.{ext}` and reads the image dimensions, which the frontend needs for its masonry layout. `WebConfig` serves the files statically under `/uploads/**`. The service is kept separate so it can later be replaced with S3.

## Frontend

The frontend uses React 19, TypeScript, Vite, `react-router` v8 (imported from `react-router`, not `react-router-dom`) and TanStack Query v5. Styling is plain CSS in `src/styles/global.css`, with no CSS framework. Design tokens (`--paper`, `--ink`, `--chili`, `--heat-1..5`) are CSS variables, and `[data-theme='dark']` on `<html>` overrides them. Fonts are Unbounded (display) and Onest (body), both served locally via `@fontsource`.

- `src/api/types.ts` mirrors the backend DTOs by hand. When a DTO changes, update it too.
- `src/api/client.ts` wraps `fetch` for `/api/v1` requests. It adds the JWT from `localStorage` (`fp-token`) and throws `ApiError`, which carries `fieldErrors` for showing validation errors next to form fields.
- **Query keys:**
  - Every paginated pin list must use a key starting with `'pins'`, and a single pin uses `['pin', id]`.
  - `api/cache.ts` (`patchPinEverywhere`) relies on these keys to update pepper counts and `myPepper` in every cached feed at once.
  - Other keys: `['user', username.toLowerCase()]`, `['boards', username]`, `['board', id]`.
- `PinGrid` wraps `useInfiniteQuery` with `Masonry`. `Masonry` places each card in the shortest column, using `imageWidth`/`imageHeight` from the API to reserve space for images.
- Saving a pin to a board is idempotent on the backend (saving again returns no error). The frontend re-fetches `saveCount` from the API instead of incrementing it locally.
