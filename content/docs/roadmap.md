---
title: Roadmap
description: The public OmniSvelte roadmap — current status and what's coming next.
section: Roadmap
order: 1
---

# Roadmap

> **Status key:** ✅ Stable · 🚧 In Progress · 📋 Planned · 💡 Exploring

---

## ✅ Stable (v0.1)

These features are implemented and documented.

| Feature | Notes |
|---|---|
| Database ORM (Drizzle) | ActiveRecord `Model` class, `createModel` helper |
| Authentication (Better-Auth) | Email/password, magic link, 2FA, passkeys, OAuth |
| Schema-driven code generation | `.schema.ts` → Drizzle + Zod + Model, file-watching |
| `defineSchema` & `field.*` builder | Full field type and modifier API |
| Model relationships | `hasMany`, `belongsTo`, `hasOne`, `belongsToMany` |
| Lifecycle hooks | `creating`, `created`, `updating`, `updated`, `deleted` |
| Model factories | Test data generation with state transforms |
| Plugin API types | Full `OmniPlugin` interface with lifecycle hooks |
| Virtual modules | `$db`, `$auth/server`, `$auth/client`, `$models/*`, `$schema`, `$validation/*` |
| Vite plugin | Zero-config hooks injection, code generation on dev start |

---

## 🚧 In Progress

| Feature | Notes |
|---|---|
| Documentation site | You are here |
| `omni` CLI | `omni init`, `omni migrate`, `omni generate` scaffolding |
| UI layer | shadcn-svelte integration, accessible pre-built form components |
| Plugin registry types | Conflict detection, dependency management |

---

## 📋 Planned (v0.2–v0.3)

| Feature | Notes |
|---|---|
| 📧 Email | Template-based email via Resend / Nodemailer |
| ⚡ Caching | Redis / in-memory cache with model-level invalidation |
| 📡 Realtime | WebSocket channels via CrossWS, SSE, model broadcast |
| 🏗️ Background Jobs | Scheduled tasks, queue management |
| 🔍 Observability | Query monitoring, performance tracing, structured logging |
| 💾 File Storage | S3-compatible uploads, local disk, CDN integration |
| 💳 Payments | Stripe + Paystack for subscriptions and one-time charges |
| 🏢 Multi-tenancy | Schema-per-tenant and row-level isolation strategies |
| 🚀 Deployment helpers | Optimized builds, environment management |
| 📄 Auto API docs | Generate API documentation from schema and types |
| 🐛 Debug CLI | Route inspector, model/relation debugger, config viewer |

---

## 💡 Exploring (v0.4+)

| Feature | Notes |
|---|---|
| Local-first sync | Integration with [sveltekit-sync](https://github.com/mudiageo/sveltekit-sync) |
| AI primitives | `defineAgent()`, streaming responses, RAG |
| Tauri v2 adapter | Cross-platform desktop + mobile scaffold |
| Plugin marketplace | Community registry with `omni add <plugin>` |
| African infrastructure | Termii SMS, Africa's Talking, MoMo, Flutterwave |
| Test utilities | `createTestApp()`, model seeding, auth mocking |

---

## How to contribute

OmniSvelte is open source. If you want to help build any of these features:

1. Open a [GitHub Discussion](https://github.com/mudiageo/omni-svelte/discussions) to discuss your idea first
2. Check [CONTRIBUTING.md](https://github.com/mudiageo/omni-svelte/blob/main/CONTRIBUTING.md)
3. Features marked 💡 are especially open to community proposals

Items in the 📋 Planned column have rough API designs ready — implementation contributions are very welcome.
