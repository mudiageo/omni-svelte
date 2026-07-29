---
title: Roadmap
description: The public OmniSvelte roadmap — current status and what's coming next.
section: Roadmap
order: 1
---

# OmniSvelte Strategic Roadmap

> Consolidated roadmap merging the existing `packages/core/README.md` roadmap (v0.1–v1.0) with every feature, primitive, and integration discussed in the remote-functions/architecture review of `feat/omni-cli`. This supersedes the checklist-only version as the working planning document.

## Mission

Make OmniSvelte the framework of choice for building **anything** with web technology — web, mobile, and desktop — by collapsing the repetitive 80% of full-stack work (CRUD, auth, validation, realtime, payments, jobs, forms) into typed primitives, so developers spend their time on the 20% that's actually their product's business logic.

## How to read this document

Every feature is scored on four axes so you can sequence work by leverage, not just by what's interesting to build:

| Column | Meaning |
|---|---|
| **Status** | ✅ Implemented & verified · 🟡 Scaffolded/stub (types exist, logic doesn't) · 🔧 Implemented but broken · ⬜ Planned, not started · 🆕 New idea from this conversation, not in original roadmap |
| **Value** | Impact on the mission if shipped — High / Medium / Low |
| **Effort** | Implementation size — XS (hours) · S (days) · M (1–2 wks) · L (3–6 wks) · XL (multi-month / needs its own design doc) |
| **Primitives Needed** | The underlying building blocks the feature is built on (see reference table below) |
| **Unlocks** | What becomes possible *because* this feature exists |

---

## 0. Codebase audit — what's actually true today

Before planning new work, here's what direct inspection of `feat/omni-cli` confirmed, since the existing roadmap's checkboxes aren't fully accurate:

- **Genuinely solid:** the `Model`/`QueryBuilder`/relationships layer, schema → Drizzle/Zod codegen, Better-Auth integration, the Vite plugin's virtual modules (`$db`, `$models/*`, `$auth/*`), and the core CLI (`init`, `add`, `generate schema|migration`, `db push|pull|generate|migrate|check|studio|seed`, `ui init|add`, `doctor`, `install-dependency`).
- **Scaffolded but inert:** cache (Redis/filesystem drivers warn-and-noop), queue (same), mail (no provider sends anything), storage (no driver stores anything), notifications (no DB persistence), and the `resource`/`auth-page`/`email` generators (`console.log('...coming soon')`).
- **✅ OmniPlugin API:** The `OmniPlugin` interface is fully typed and available. The Plugin Ecosystem phase is unblocked.
- **Not present at all yet:** no `.remote.ts` files anywhere in the repo — none of the SvelteKit remote-functions work from this conversation has been started.

---

## 1. Core primitives reference

Most features below are combinations of a small set of building blocks. Get these right once and everything downstream gets cheaper.

| Code | Primitive | Status | Notes |
|---|---|---|---|
| `RF` | SvelteKit Remote Functions (`query`, `form`, `command`, `prerender`, `query.live`, `query.batch`) | ✅ | Integrated in v0.2 via `resource()`, `formSchema()`, and `fromURL()` helpers |
| `MODEL` | `Model` ActiveRecord base class + `QueryBuilder` | ✅ | Solid foundation; most new ORM features extend this |
| `HOOKS` | Model lifecycle hooks (`creating`/`created`/`updating`/`updated`) | ✅ | Underused — currently no consumer wires anything real into them |
| `SCHEMA` | `defineSchema`/`fields()` + generators (Drizzle, Zod, model) | ✅ | Single source of truth; should feed forms, docs, and SDKs, not just the DB |
| `PLUGIN` | `OmniPlugin` lifecycle interface | ✅ | Stable and fully typed |
| `VITE` | Vite plugin codegen/HMR pipeline | ✅ | Where most "magic" auto-wiring already happens |
| `AUTH` | Better-Auth integration + generated schema/client | ✅ | Currently client-reactivity is faked via a `Proxy`; should eventually use `RF` |
| `EVENT` | In-memory event bus (`on`/`off`/emit) | ✅ | No persistence, no queued/retryable listeners |
| `CACHE` | Cache abstraction (`get`/`set`/`remember`) | 🟡 | Memory driver only |
| `QUEUE` | Queue abstraction (jobs, options) | 🟡 | Memory driver only, no real worker loop |
| `CLI` | Commander-based CLI (`omni`) | ✅ | Strong skeleton; several subcommands are stubs |

---

## 2. Master feature tables

### A. Core ORM & Data Layer

| Feature | Status | Value | Effort | Primitives | Unlocks |
|---|---|---|---|---|---|
| ActiveRecord `Model` + relationships (`hasMany`/`belongsTo`/`hasOne`/`belongsToMany`) | ✅ | — | — | `MODEL` | Everything else in this table |
| `createFactory` helper (functional model factories) | ⬜ *(in old roadmap)* | High | M | `MODEL`, `SCHEMA` | Seeding, realistic demo data, test fixtures |
| Relationship definitions inside `defineSchema` (auto-`with()` loaders) | ⬜ *(in old roadmap)* | Medium | M | `SCHEMA`, `MODEL` | Removes manual relationship boilerplate per model |
| Soft-delete query scopes (`withTrashed()`/`onlyTrashed()`, excluded by default) | 🆕 | High | S | `MODEL` | Safe-by-default deletes; undo/trash UIs |
| Pagination helpers (offset + cursor) on `QueryBuilder` | 🆕 | High | M | `MODEL` | Infinite scroll, admin tables, API pagination without hand-rolled SQL |
| DB transactions API (`Model.transaction(async trx => ...)`) | 🆕 | High | M | `MODEL` | Multi-step writes (e.g. payment + order creation) that can't partially fail |
| Query scopes/macros (reusable named filters, e.g. `published()`) | 🆕 | Medium | S | `MODEL` | Composable, named business queries instead of repeated `.where()` chains |

### B. Remote Functions Integration (the API layer)

| Feature | Status | Value | Effort | Primitives | Unlocks |
|---|---|---|---|---|---|
| `resource(Model)` — auto-generates `query`/`form`/`command` CRUD from a Model definition | ✅ | High | L | `RF`, `MODEL`, `SCHEMA` | Zero-boilerplate CRUD APIs; backend for the v0.3 admin/CRUD UI scaffold |
| `formSchema()` — derive a Zod object schema from a Model definition | ✅ | Medium | S | `RF`, `SCHEMA` | One schema definition drives DB columns, server validation, *and* client form fields |
| `fromURL()` — sync URL query params with remote list queries | ✅ | Medium | XS | `RF` | Stateful list pages with URL-driven pagination/filtering without boilerplate |
| `getModel()` — retrieve a model class by name from the registry | ✅ | Low | XS | `MODEL` | Dynamic model access for generic utilities and plugins |
| `omni generate remote` — scaffold `<model>.remote.ts` from a `Model` | ✅ | Medium | S | `CLI`, `RF` | Lowers the activation energy for adopting remote functions at all |
| Hook-driven single-flight invalidation (`creating`/`updated`/`deleted` hooks call `refresh()`/`set()`) | ⬜ | High | M | `RF`, `HOOKS` | Mutations through the ORM auto-refresh the right cached queries with no manual invalidation code |
| Remote Function Wrappers | ⬜ | High | M | `RF` | Expose custom features, middleware, and config options safely on top of SvelteKit's native remote functions |
| Auth session as `query.live` (replacing the client-side `Proxy` hack in `client.svelte.ts`) | ⬜ | Medium | M | `RF`, `AUTH` | SSR-safe reactive session state without the current workaround |

### C. Auth & Authorization

| Feature | Status | Value | Effort | Primitives | Unlocks |
|---|---|---|---|---|---|
| Better-Auth integration + generated config | ✅ | — | — | `AUTH` | Sessions, social login, etc. (already works) |
| Policy/permissions layer (`can(user, 'update', post)`, RBAC) | 🆕 | High | L | `AUTH`, `MODEL` | Real authorization, not just authentication — required for almost any multi-user app |
| Rate limiting middleware (global + per remote function) | 🆕 | High | M | `RF`, `AUTH` | Abuse protection for public forms/commands without per-route hand-wiring |
| Schema-per-tenant isolation | ⬜ *(in old roadmap)* | Medium | XL | `MODEL`, `AUTH` | SaaS apps with hard tenant data isolation |
| Row-level multi-tenancy + tenant resolver middleware | ⬜ *(in old roadmap)* | High | L | `MODEL`, `AUTH` | SaaS apps with shared-schema tenancy (cheaper to run than schema-per-tenant) |

### D. Realtime & Live Data

| Feature | Status | Value | Effort | Primitives | Unlocks |
|---|---|---|---|---|---|
| WebSocket channels via CrossWS | ⬜ *(in old roadmap)* | Medium | L | new (`crossws`) | Rooms, presence, low-level pub/sub for chat-like features |
| SSE for lighter realtime cases | ⬜ *(in old roadmap)* | Medium | M | new | Cheaper realtime when full duplex isn't needed |
| Model-level realtime events (`Post.subscribe('created', handler)`) via `query.live` | 🆕 *(implements old roadmap item)* | High | M | `RF`, `HOOKS` | Live feeds, notification badges, dashboards — without standing up CrossWS for simple cases |

### E. Caching

| Feature | Status | Value | Effort | Primitives | Unlocks |
|---|---|---|---|---|---|
| In-memory cache driver | ✅ | — | — | `CACHE` | Works today, not production-durable |
| Redis cache driver + model-level invalidation | ⬜ *(in old roadmap)* | High | M | `CACHE` | Multi-instance deployments, durable caching |
| `omni cache:clear|stats` commands | ⬜ *(in old roadmap)* | Low | S | `CLI`, `CACHE` | Operational visibility/control |
| `remember()` as a server-side TTL layer on top of remote `query` dedup | 🆕 | Medium | S | `RF`, `CACHE` | Cheap caching for expensive queries without bespoke per-query logic |
| HTTP-level cache headers / stale-while-revalidate on `prerender`/`query` | 🆕 | Medium | M | `RF` | CDN/edge caching distinct from the in-process Redis layer — much cheaper at scale for read-heavy pages |

### F. Background Jobs & Scheduling

| Feature | Status | Value | Effort | Primitives | Unlocks |
|---|---|---|---|---|---|
| Background job queue (BullMQ/in-process) | ⬜ *(in old roadmap)* | High | L | `QUEUE` | Async work off the request path: emails, exports, webhooks |
| Scheduled tasks (cron-style) | ⬜ *(in old roadmap)* | Medium | M | `QUEUE` | Recurring jobs (digest emails, cleanup, billing runs) |
| Job status as `query.live` feed | 🆕 | Medium | S | `RF`, `QUEUE` | Live "your export is processing..." UI with no polling code |

### G. Storage & Media

| Feature | Status | Value | Effort | Primitives | Unlocks |
|---|---|---|---|---|---|
| S3-compatible storage with local-disk fallback | ⬜ *(in old roadmap)* | High | M | new | File uploads (avatars, attachments) actually work end to end |
| `form` file fields wired to storage driver | 🆕 | Medium | S | `RF` | Upload forms (`.as('file')`) that actually persist somewhere |

### H. Notifications & Communication

| Feature | Status | Value | Effort | Primitives | Unlocks |
|---|---|---|---|---|---|
| Email templates via Resend/Nodemailer | ⬜ *(in old roadmap)* | High | M | new | Transactional email actually sends |
| Database-backed notification persistence + read state | 🆕 *(closes existing TODO)* | High | M | `MODEL` | In-app notification center, read/unread badges |
| Notifications feed as `query.live` | 🆕 | Medium | S | `RF` | Real-time bell icon / toast feed |
| First-party SMS drivers for regional gateways | 🆕 | High | M | new | OTP, transactional SMS for users where email-only auth underperforms |

### I. Payments, Billing & Generic Webhooks

| Feature | Status | Value | Effort | Primitives | Unlocks |
|---|---|---|---|---|---|
| Stripe plugin (subscriptions, one-time, webhooks) | ⬜ *(in old roadmap)* | High | L | `PLUGIN`, `QUEUE` | International billing |
| Lemon Squeezy plugin | ⬜ *(in old roadmap)* | Medium | L | `PLUGIN` | Alternative MoR billing |
| First-party plugins for global gateways | 🆕 | High | L | `PLUGIN` | Expands billing beyond Western-only payment processors |
| Generic webhooks module (incoming signature verification + outgoing dispatch, decoupled from any one payment provider) | 🆕 | High | M | `QUEUE`, `AUTH` | Reusable webhook receiving/sending for *any* integration, not just payments |

### J. AI & Intelligence Layer 🆕 *(entirely new category)*

| Feature | Status | Value | Effort | Primitives | Unlocks |
|---|---|---|---|---|---|
| Vector/embedding column type + similarity search (pgvector) | 🆕 | High | L | `SCHEMA`, `MODEL` | Semantic search, recommendations, "find similar" features without a separate vector DB |
| `defineAgent()` / structured-output helper tied to remote functions | 🆕 | High | L | `RF` | Typed LLM tool-calling and structured generation as a framework primitive, not hand-rolled per project |
| RAG helper (auto-chunk/embed content on model save) | 🆕 | Medium | L | `MODEL`, `HOOKS` | Drop-in "chat with your data" for any model |

### K. Local-First & Cross-Platform 🆕 *(entirely new category)*

| Feature | Status | Value | Effort | Primitives | Unlocks |
|---|---|---|---|---|---|
| `omni add tauri` / `omni add capacitor` scaffolding | 🆕 | High | M | `CLI` | "Build anything with web tech" literally extends to desktop/mobile |

### L. Business-Logic Primitives 🆕 *(entirely new category)*

| Feature | Status | Value | Effort | Primitives | Unlocks |
|---|---|---|---|---|---|
| `defineWorkflow()` — state-machine helper for multi-step processes | 🆕 | High | L | `MODEL`, `EVENT` | Order status, approval chains, onboarding flows expressed declaratively instead of scattered `if`s |
| Automatic audit trails (opt-in per Model) | 🆕 | Medium | M | `MODEL`, `HOOKS` | "Who changed what, when" — common enterprise/compliance requirement |
| `Money` value type (multi-currency formatting/conversion) | 🆕 | High | S | `SCHEMA` | Stops Stripe+Paystack dual-currency billing logic from being rebuilt per project |
| Regional phone-number/ID validation helpers | 🆕 | Medium | XS | `SCHEMA` | Built-in localization for phone and ID formats globally |
| Feature flags module | 🆕 | Medium | M | `PLUGIN`, `CACHE` | Safe rollout/kill-switches without a third-party flag service |
| i18n/localization module | 🆕 | Medium | M | `SCHEMA`, `RF` | Multi-language apps out of the box |

### M. Developer Experience & Testing 🆕 *(entirely new category, distinct from the old roadmap's ">90% framework test coverage" goal)*

| Feature | Status | Value | Effort | Primitives | Unlocks |
|---|---|---|---|---|---|
| Fake drivers for mail/queue/storage/notifications (swap in test mode) | 🆕 | High | M | `CACHE`, `QUEUE` | Apps built on OmniSvelte get testable side effects for free instead of reinventing mocks |
| Seeded-per-test database helper | 🆕 | High | M | `MODEL` | Fast, isolated integration tests without hand-rolled setup/teardown |
| Remote-function test harness (call `query`/`form`/`command` directly without a running server) | 🆕 | High | M | `RF` | Makes the entire API layer unit-testable, which experimental upstream APIs especially need |
| Dev inspector (Telescope-style panel: recent queries/jobs/remote calls in dev mode) | 🆕 | Medium | L | `RF`, `QUEUE`, `EVENT` | Visibility into what the framework is doing, replacing scattered `console.warn` debugging |

### N. CLI & Code Generation

| Feature | Status | Value | Effort | Primitives | Unlocks |
|---|---|---|---|---|---|
| `omni init`/`add`/`generate schema|migration`/`db *`/`ui *`/`doctor`/`install-dependency` | ✅ | — | — | `CLI` | Already works |
| `omni tinker` — interactive REPL with models pre-loaded | ⬜ *(in old roadmap)* | Medium | M | `CLI`, `MODEL` | Laravel-Artisan-style exploration without writing a script |
| Plugin CLI command registration (`omni <plugin>:<cmd>`) | ⬜ *(in old roadmap)* | Medium | M | `CLI`, `PLUGIN` | Plugins can ship their own CLI surface |
| `omni debug:routes|models|config` | ⬜ *(in old roadmap)* | Low | S | `CLI` | Diagnostics |
| `omni generate resource|auth-page|email` (currently `console.log('coming soon')`) | 🟡 | High | L | `CLI`, `RF`, `MODEL` | The actual implementation of three already-announced commands |

### O. UI, Forms & Admin

| Feature | Status | Value | Effort | Primitives | Unlocks |
|---|---|---|---|---|---|
| shadcn-svelte integration | 🟡 *(CLI wiring exists, components don't)* | High | L | new | Consistent, accessible UI out of the box |
| Accessible form components with Zod validation binding | ⬜ *(in old roadmap)* | High | L | `SCHEMA`, `RF` | Forms that are correct *and* accessible without extra work |
| Pre-built page layouts (auth, dashboard, docs, marketing) | ⬜ *(in old roadmap)* | Medium | M | new | Faster time-to-first-screen |
| `omni generate resource` full CRUD UI scaffold | ⬜ *(announced, not built)* | High | L | `RF`, item B's `resource()` | The single most "wow" demo feature for new adopters |
| Admin panel (`omni serve --with-admin`) | ⬜ *(in old roadmap)* | High | XL | `RF`, `MODEL`, `AUTH` | Instant back-office for any schema |

### P. Plugin Ecosystem

| Feature | Status | Value | Effort | Primitives | Unlocks |
|---|---|---|---|---|---|
| `OmniPlugin` lifecycle interface | ✅ | High | — | `PLUGIN` | Fully typed and stable |
| Official first-party plugins: logging, CORS, analytics, error-reporting | 🟡 *(stubs only)* | Medium | M each | `PLUGIN` | Baseline ops needs covered without third-party deps |
| Plugins can contribute their own remote functions, with conflict detection on query/command names | 🆕 | Medium | M | `PLUGIN`, `RF` | A payments plugin can ship `checkout.remote.ts` without colliding with the host app |
| Plugin marketplace/registry | ⬜ *(in old roadmap)* | High | XL | `PLUGIN` | Network effects — the thing that actually makes a framework "the best choice for everyone" |
| Custom plugin dev framework + scaffolder | ⬜ *(in old roadmap)* | Medium | L | `CLI`, `PLUGIN` | Lowers the bar for community plugin authors |
| Plugin dependency management | ⬜ *(in old roadmap)* | Low | M | `PLUGIN` | Avoids plugin version conflicts as ecosystem grows |

### Q. Observability & Monitoring

| Feature | Status | Value | Effort | Primitives | Unlocks |
|---|---|---|---|---|---|
| Structured logging with levels/transports | ⬜ *(in old roadmap)* | High | M | new | Production debuggability |
| Query performance monitoring (`omni monitor:queries`) | ⬜ *(in old roadmap)* | Medium | M | `MODEL` | Catch N+1s and slow queries before users do |
| WebSocket connection monitoring | ⬜ *(in old roadmap)* | Low | S | new | Operational visibility for realtime features |
| Observability plugin hooks (tracing, metrics) | ⬜ *(in old roadmap)* | Medium | L | `PLUGIN` | Hook into Datadog/Sentry/OTel without framework-specific glue code |

### R. Platform Polish 🆕

| Feature | Status | Value | Effort | Primitives | Unlocks |
|---|---|---|---|---|---|
| Automatic sitemap/robots.txt/meta-tag generation from routes + schema | 🆕 | Medium | M | `SCHEMA` | SEO boilerplate every content-driven app needs, built once |
| Public typed API/SDK generator (ships an actual client package, not just docs) | 🆕 | High | L | `RF`, `SCHEMA` | A mobile app or partner integration can consume the backend with full types, distinct from "docs from schema" |

### S. Deployment, Docs & Release Readiness

| Feature | Status | Value | Effort | Primitives | Unlocks |
|---|---|---|---|---|---|
| `omni build:production` | ⬜ *(in old roadmap)* | Medium | M | `CLI` | Optimized production builds |
| `omni deploy --env=<name>` | ⬜ *(in old roadmap)* | Medium | L | `CLI` | One-command deploys |
| Multi-environment config management | ⬜ *(in old roadmap)* | Medium | M | new | Safe staging/prod separation |
| `omni docs:generate`/`docs:serve` (API docs from schema + JSDoc) | ⬜ *(in old roadmap)* | Medium | M | `SCHEMA` | Always-current docs with no manual upkeep |
| Stable semver API, full docs site, migration guides, flagship example apps, >90% framework test coverage | ⬜ *(in old roadmap)* | High | XL | everything | The actual "production ready" bar |

---

## 3. Versioned timeline

Estimates assume continued **part-time, largely solo** development alongside coursework and competitions — treat dates as relative pacing, not commitments. Each version keeps the original roadmap's scope and folds in this conversation's additions where they belong.

| Version | Theme | Target | Headline additions from this conversation |
|---|---|---|---|
| **v0.1 — Foundation** | *Done* | — | (no change — already shipped) |
| **v0.2 — CLI & Remote Functions** | *Done* | Q3 2026 | `resource(Model)`, `formSchema()`, `fromURL()`, `getModel()`, `omni generate remote`, CLI revamp, config migration to `vite.config.ts` |
| **v0.3 — UI & Forms** | Next | Q4 2026 | `omni generate resource` full CRUD UI scaffold, shadcn-svelte integration, accessible form components |
| **v0.4 — Realtime, Email & Caching** | Planned | Q4 2026–Q1 2027 | Auth session via `query.live`, `query.live` as the lightweight realtime primitive; `remember()`-on-`query` caching |
| **v0.5 — Jobs, Storage & Monitoring** | Planned | Q1 2027 | Notification persistence + live feed, dev inspector, feature flags |
| **v0.6 — Payments & Multi-tenancy** | Planned | Q2 2027 | Paystack/Flutterwave plugins, generic webhooks module, RBAC/policy layer |
| **v0.7 — Deployment & Docs** | Planned | Q2 2027 | SEO automation, public API/SDK generator, HTTP cache headers |
| **v0.8 — Plugin Ecosystem** | Planned | Q3 2027 | Plugin-contributed remote functions |
| **v0.9 — Hardening & Quality** 🆕 | New phase | Q3–Q4 2027 | Soft-delete scopes, pagination, transactions API, query scopes, rate limiting, i18n, audit trails, testing toolkit (fake drivers, seeded DB, remote-fn test harness) |
| **v1.0 — Production Ready** | Planned | Q4 2027 | (unchanged scope — stability, docs, migration guides, flagship apps) |
| **v1.1 — AI & Intelligence Layer** 🆕 | New phase | 2028 | Vector/embedding columns, `defineAgent()`, RAG helper |
| **v1.2 — Local-First & Cross-Platform** 🆕 | New phase | 2028 | `defineLocalModel()`, Tauri/Capacitor scaffolding |
| **v1.3 — Global Business Primitives** 🆕 | New phase | 2028+ | `Money` type, `defineWorkflow()`, Regional SMS gateways, ID/phone validation |

---

## 4. Prioritization methodology

Value was scored by how directly a feature removes *repetitive, non-business-logic* work (the stated mission), not by novelty. Effort was scored by how much net-new design is required versus how much can be assembled from primitives that already exist. Two things consistently pushed a feature up in priority regardless of effort: (1) it fixes something broken rather than something merely missing, and (2) it's a primitive other planned features depend on (e.g. `resource()` and `query.live` unlock several other rows in these tables, so they're worth doing early even though they're not the cheapest items).

## 5. Risks & dependencies

- **Plugin ecosystem has a cold-start problem.** A marketplace and community plugins are worthless without a few flagship first-party plugins to prove the pattern — sequence v0.8 accordingly.
- **Bus factor.** The roadmap above is intentionally sequenced so that *fixing* and *finishing* (v0.2–v0.9) come before *expanding* (v1.1+), so the framework is usable and credible even if later phases slip.
- **CrossWS maturity** — the realtime plan leans on it for full WebSocket support; `query.live`/SSE are reasonable fallbacks if it proves too heavy.
- **Differentiation vs. crowded competition** (Next.js, Remix, Laravel, SvelteKit alone) — the AI-native and local-first primitives are the parts of this roadmap with the least direct competition; they're worth protecting from scope creep into "yet another generic full-stack framework."

## 6. Success metrics

- Time-to-first-working-CRUD-app for a new developer (target: under 10 minutes from `omni init` to a working model + form + list page).
- Number of production apps built on OmniSvelte.
- Community plugin count and contributor count once v0.8 ships.
- npm weekly downloads / GitHub stars as a lagging adoption signal — useful, but secondary to the above.

## 7. Immediate next actions

1. ✅ Build `resource(Model)` for remote-function CRUD generation.
2. Build `omni generate resource` full CRUD UI scaffold — the most visible v0.3 milestone.
3. Implement one real cache driver (Redis) and one real storage driver (S3) — closes the gap between "the API exists" and "it actually works."
4. Write the Remote Function wrappers to ensure config and middleware behavior is scalable.
5. Ship the `Money` value type and foundational plugin groundwork — small effort, highly reusable.

## 8. Opportunities for Improvement 💡

- **DevTools Suite:** A comprehensive local dashboard (similar to Prisma Studio or Nuxt DevTools) running on a separate port during development. It will provide:
  - **Database Explorer:** Visually inspect, filter, and edit records in your local DB without writing SQL.
  - **Remote Functions Panel:** Track all incoming `query`, `form`, and `command` calls from the client, including payload sizes and execution times.
  - **Background Jobs Monitor:** Watch your queues (BullMQ/in-process) in real-time, retry failed jobs, and inspect job arguments.
  - **Events & Hooks Tracing:** See exactly which model hooks fired during a transaction.
- **First-Class Edge Support:** Ensuring the framework and its data fetching primitives adhere strictly to WinterCG standards, enabling deployment to Cloudflare Workers or Vercel Edge seamlessly.
- **Marketplace Tooling:** Standardizing the plugin publishing process so developers can safely distribute and monetize high-quality OmniSvelte plugins.
