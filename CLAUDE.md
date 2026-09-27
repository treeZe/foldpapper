# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Fold Papper is a Pinterest-like site: a Spring Boot 3.3 API (Java 17, PostgreSQL 16) in `backend/` and a React SPA in `frontend/`. Users post pins, collect them on boards, follow each other, and react with **peppers** instead of likes. A pepper has a heat level from 1 to 5. Users can report pins. Users with the `ADMIN` role moderate content in the admin panel at `/admin`.

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

Backend tests are integration tests (`@SpringBootTest` + MockMvc) against Testcontainers Postgres; see `AdminApiIntegrationTest`. Don't use H2: the schema needs `pg_trgm` and Postgres-specific DDL. The container is started in a `static {}` block because `testcontainers-junit-jupiter` isn't a dependency. `pom.xml` pins `testcontainers.version` to 1.21.x: the 1.19 version that Spring Boot 3.3 manages fails against Docker 29+ with "client version too old". Tests need a running Docker that the current user can access.

Environment overrides: `DB_URL`, `DB_USER`, `DB_PASSWORD`, `SERVER_PORT`, `JWT_SECRET`, `JWT_TTL` (ISO-8601 duration, default `P7D`), `STORAGE_DIR` (default `./uploads`), and `ADMIN_USERNAMES` (comma-separated; `AdminBootstrap` grants these users `ADMIN` on startup, which is how the first admin is created). Swagger UI is served at `/swagger-ui.html`.

## Architecture

Packages under `com.foldpapper` are organized by feature (`user`, `pin`, `board`, `pepper`, `tag`, `follow`, `media`). Each feature has its own Entity, Repository, Service, and Controller, with request/response records in a `dto/*Dtos.java` holder class or in `PepperDtos`. Cross-cutting code lives in `common`, `config`, and `security`.

**Schema is owned by Flyway.** Hibernate runs with `ddl-auto: validate`, so every entity change needs a new `db/migration/V{n}__*.sql`. Never edit `V1__init.sql`. `open-in-view` is off: load associations inside `@Transactional` service methods, using `@EntityGraph` on repositories or `default_batch_fetch_size`. `@EntityGraph` resolves its paths against the repository's own entity. So a query in `PepperRepository` or `BoardPinRepository` that returns `Pin` must use `JOIN FETCH p.author` instead, or it fails at runtime.

**Denormalized counters.** `pins.pepper_count`, `pins.heat_score`, `pins.save_count`, and `boards.pin_count` are stored columns, so feeds can be sorted without joins. They are only changed by atomic `@Modifying` JPQL `UPDATE`s in `PinRepository`/`BoardRepository` (`applyPepperAdded`, `applyHeatDelta`, `applyPepperRemoved`, `increment/decrementSaveCount`, etc.). Never change them by read-modify-write on the entity. Any code that adds or removes a pepper or a board_pin must call the matching counter update in the same transaction. For examples, see `PepperService` and `BoardPinService`. These updates use `clearAutomatically = true`, so managed entities in the persistence context are detached afterwards.

**Pepper semantics.** Each (pin, user) pair has at most one pepper (unique constraint). `PUT /pins/{id}/pepper` is idempotent: it creates the pepper or changes its heat and applies the heat delta. `heat_score` is the sum of all pepper heats. The `sort=hot` feed orders by it.

**Saving = board_pins.** A pin can sit on many boards. Adding a pin to a board is the "save" action and increments `save_count`. Removing the board's cover pin clears `boards.cover_pin_id`. Board slugs are unique per owner (`common/Slugs`).

**Auth.**
- Auth is a stateless JWT (jjwt). The token carries only the id and username.
- On every request `JwtAuthenticationFilter` reads the role and ban state from the database with one query by primary key (`UserRepository.findAuthStateById`), so bans and demotions take effect immediately. Don't move the role into token claims.
- A banned user gets `401` with the message `Аккаунт заблокирован`, and the frontend logs out on any 401. A token for a deleted user simply becomes anonymous.
- Login checks the ban after the password check (`AuthService`), so a ban isn't revealed without the right password.
- Controllers receive `@AuthenticationPrincipal AppUserPrincipal`, which is `null` for anonymous callers on public endpoints. The principal has `getRole()`/`isAdmin()` and the authority `ROLE_<role>`.
- `SecurityConfig` rules:
  - `/api/v1/admin/**` is `hasRole("ADMIN")`.
  - `/api/v1/users/me` requires a token.
  - Anonymous `GET` is allowed on `/api/v1/pins|boards|users|tags/**`, plus auth, uploads, health, and Swagger.
  - Everything else requires a token. This is why the authenticated home feed is at `/api/v1/feed`, outside `/pins`.
- Login accepts a username or an email.

**Moderation.** The user-facing admin guide (in Russian) is `docs/ADMIN.md`. Keep it in sync when admin behaviour or configuration changes.
- The `report` package holds pin reports; the unique pair is (pin, reporter).
- `reports.pin_id` is `ON DELETE SET NULL`. The report keeps a snapshot of the pin's title and image URL, so the moderation history survives pin deletion.
- The `admin` package holds stats, users, pins, and reports.
- `AdminService.deletePin` resolves all open reports on the pin, then calls `PinService.deleteAsModerator`.
- Guard rails: an admin can't change their own role or ban themselves, and an admin must be demoted before being banned.
- Activity stats bucket days in the admin's timezone (`?tz=`). They use `JdbcTemplate` over a fixed whitelist of table names.
- Pin deletion by the owner or a moderator goes through `PinService.deleteWithCounters`. It first decrements `boards.pin_count` for every board containing the pin (the `board_pins` rows are removed by the database cascade, which doesn't touch the counters).

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
- `api()` returns `undefined` for an empty response body. Some endpoints answer `201` with no body, for example `POST /pins/{id}/reports`.
- The admin panel lives in `src/pages/admin/`. `RequireAdmin` only hides the routes; the backend enforces access.
  - Admin lists use `useAdminList` (infinite query + «Показать ещё»), with keys starting `['admin', …]`. Mutations invalidate `['admin']`.
  - The activity charts follow the dataviz rules: one series per card, no dual axis, `--chart-bar` checked for light and dark themes, per-bar tooltips on hover and focus, and a table view.
