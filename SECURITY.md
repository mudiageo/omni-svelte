# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | ✅ Yes    |
| < 0.1   | ❌ No     |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Instead, report them privately via one of these channels:

- **GitHub Private Vulnerability Reporting** (preferred): [Security Advisories](https://github.com/mudiageo/omni-svelte/security/advisories/new)
- **Email**: security@omni-svelte.dev

### What to include

Please provide as much of the following as possible:

- A description of the vulnerability and its impact
- Steps to reproduce the issue (proof of concept if possible)
- The version(s) affected
- Any suggested mitigations

### Response timeline

| Step | Target |
|------|--------|
| Initial acknowledgement | 48 hours |
| Triage and severity assessment | 5 business days |
| Fix / mitigation | Dependent on severity (critical = ASAP) |
| Public disclosure | Coordinated with reporter after fix is released |

## Security considerations for users

### Environment variables

Never commit secrets to source control. Use `.env` (gitignored) for local development:

```bash
DATABASE_URL=postgres://user:password@localhost:5432/mydb
BETTER_AUTH_SECRET=<at-least-32-random-chars>
BETTER_AUTH_URL=https://yourdomain.com
```

Generate a strong secret:

```bash
openssl rand -base64 32
```

### Virtual module access boundaries

omni-svelte enforces server-only access for sensitive modules at the Vite plugin level:

| Module | Boundary | Safe for client? |
|--------|----------|-----------------|
| `$db` | Server only | ❌ No |
| `$schema` | Server only | ❌ No |
| `$models/*` | Server only | ❌ No |
| `$validation/*` | Universal | ✅ Yes |
| `$auth/server` | Server only | ❌ No |
| `$auth/client` | Client safe | ✅ Yes |

Importing a server-only module from a universal context (`+page.ts`, `+layout.ts`) will trigger a build-time warning.

### Database security

- Always use parameterised queries (Drizzle handles this automatically).
- Do not expose raw database credentials to the client bundle.
- Use a least-privilege database user in production.

## Acknowledgements

We thank all security researchers who responsibly disclose vulnerabilities to us.
