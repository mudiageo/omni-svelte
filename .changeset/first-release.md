---
'omni-svelte': minor
---

feat: Initial release of the omni-svelte framework! 🎉

**Batteries Included Framework for SvelteKit**

Transform any SvelteKit app into a production-ready powerhouse with enterprise-grade features out of the box.

### Features Included in v0.1.0:

🗄️ **Database & ORM (powered by Drizzle)** (4615134, #6)
- ActiveRecord-style `Model` class and `createModel` helper
- Model relationships: `hasMany`, `belongsTo`, `hasOne`, `belongsToMany`
- Lifecycle hooks: `creating`, `created`, `updating`, `updated`, `deleted`
- Integrated test data generation via `Factory` & `Faker` classes

🔐 **Authentication (powered by Better-Auth)** (#7)
- First-class support for email/password, magic links, 2FA, passkeys, and OAuth
- Auto-generated BetterAuth server config from `svelte.config.js`

📋 **Central Schema & Code Generation** (#4)
- Define your entire data model in a single schema file (`defineSchema`)
- Auto-generates Drizzle tables, Zod validators, and typed model files
- Zero-config Vite plugin for on-the-fly code generation

📦 **Virtual Modules & Path Aliases** (779be17)
- `$auth/server` & `$auth/client` for instant Better-Auth instances
- `$db` for raw Drizzle database access
- `$models/*` auto-generated typed model classes
- `$schema` all generated Drizzle table definitions
- `$validation/*` auto-generated Zod schemas

🔌 **Extensible Plugin System** (71e4388)
- Full `OmniPlugin` architecture to extend the framework
- First-party packages included: `@omni-svelte/shared`, `@omni-svelte/plugins`

🛠️ **Core Infrastructure Stubs** (71e4388)
- Initial framework foundations laid out for: Mail, Job Queues, Caching, Event Bus, File Storage, Notifications, and CLI scaffolds.
