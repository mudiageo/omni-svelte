---
title: Storage
description: The storage feature is planned for a future OmniSvelte release.
section: Planned Features
order: 1
label: soon
---

# Storage _(Planned)_

This feature is on the OmniSvelte roadmap and is not yet implemented.

See the [public roadmap](/docs/roadmap) for the target release and design notes.

## What's planned

- S3-compatible file storage (R2, AWS S3, MinIO)
- Local disk driver for development
- Direct upload URLs with signed tokens
- Image transformation hooks (resize, compress, convert)
- OmniPlugin adapter API for custom storage backends

## Proposed API

```js
// svelte.config.js (proposed)
omni: {
  storage: { enabled: true }
}
```

## Want to help build this?

Open a [GitHub Discussion](https://github.com/mudiageo/omni-svelte/discussions) to share ideas or contribute to the design.
