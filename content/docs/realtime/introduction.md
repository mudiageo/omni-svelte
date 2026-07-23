---
title: Realtime
description: The realtime feature is planned for a future OmniSvelte release.
section: Planned Features
order: 1
label: soon
---

# Realtime _(Planned)_

This feature is on the OmniSvelte roadmap and is not yet implemented.

See the [public roadmap](/docs/roadmap) for the target release and design notes.

## What's planned

- WebSocket channels via [CrossWS](https://github.com/unjs/crossws)
- SSE (Server-Sent Events) for lighter use cases
- Model-level broadcast: `Post.subscribe('created', handler)`
- OmniPlugin channel registration API
- `omni monitor:realtime` connection inspector

## Proposed API

```js
// svelte.config.js (proposed)
omni: {
  realtime: { enabled: true }
}
```

## Want to help build this?

Open a [GitHub Discussion](https://github.com/mudiageo/omni-svelte/discussions) to share ideas or contribute to the design.
