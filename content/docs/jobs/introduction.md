---
title: Jobs
description: The jobs feature is planned for a future OmniSvelte release.
section: Planned Features
order: 1
label: soon
---

# Jobs _(Planned)_

This feature is on the OmniSvelte roadmap and is not yet implemented.

See the [public roadmap](/docs/roadmap) for the target release and design notes.

## What's planned

- Background job queue (BullMQ / in-process fallback)
- Cron-style scheduled tasks
- `omni generate job <name>` scaffolding
- Job retry, timeout, and concurrency configuration
- `omni queue:work` runner command

## Proposed API

```js
// svelte.config.js (proposed)
omni: {
  jobs: { enabled: true }
}
```

## Want to help build this?

Open a [GitHub Discussion](https://github.com/mudiageo/omni-svelte/discussions) to share ideas or contribute to the design.
