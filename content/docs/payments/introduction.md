---
title: Payments
description: The payments feature is planned for a future OmniSvelte release.
section: Planned Features
order: 1
label: soon
---

# Payments _(Planned)_

This feature is on the OmniSvelte roadmap and is not yet implemented.

See the [public roadmap](/docs/roadmap) for the target release and design notes.

## What's planned

- Stripe plugin: subscriptions, one-time payments, webhooks
- Lemon Squeezy plugin: licensing, subscriptions
- Paystack plugin: African market payments
- `omni generate billing` scaffold for pricing pages and billing portal
- Plan upgrade/downgrade helpers

## Proposed API

```js
// svelte.config.js (proposed)
omni: {
  payments: { enabled: true }
}
```

## Want to help build this?

Open a [GitHub Discussion](https://github.com/mudiageo/omni-svelte/discussions) to share ideas or contribute to the design.
