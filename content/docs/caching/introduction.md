---
title: Caching
description: The caching feature is planned for a future OmniSvelte release.
section: Planned Features
order: 1
label: soon
---

# Caching _(Planned)_

This feature is on the OmniSvelte roadmap and is not yet implemented.

See the [public roadmap](/docs/roadmap) for the target release and design notes.

## What's planned

- Redis and in-memory cache drivers
- Model-level cache invalidation on create/update/delete
- `cache(key, ttl, fn)` helper for request-level memoisation
- `omni cache:clear` and `omni cache:stats` CLI commands

## Proposed API

```js
// vite.config.ts (proposed)
omni: {
  caching: { enabled: true }
}
```

## Want to help build this?

Open a [GitHub Discussion](https://github.com/mudiageo/omni-svelte/discussions) to share ideas or contribute to the design.
