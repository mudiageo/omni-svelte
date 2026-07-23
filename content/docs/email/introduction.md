---
title: Email
description: The email feature is planned for a future OmniSvelte release.
section: Planned Features
order: 1
label: soon
---

# Email _(Planned)_

This feature is on the OmniSvelte roadmap and is not yet implemented.

See the [public roadmap](/docs/roadmap) for the target release and design notes.

## What's planned

- Template-based email via Resend and Nodemailer
- `omni generate email <name>` scaffolding
- OmniPlugin registration API for email templates
- Welcome, password reset, magic link, notification templates built-in

## Proposed API

```js
// svelte.config.js (proposed)
omni: {
  email: { enabled: true }
}
```

## Want to help build this?

Open a [GitHub Discussion](https://github.com/mudiageo/omni-svelte/discussions) to share ideas or contribute to the design.
