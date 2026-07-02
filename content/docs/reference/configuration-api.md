---
title: Configuration API
description: Full TypeScript type reference for the omni config block in svelte.config.js.
section: Reference
order: 1
---

# Configuration API

Complete TypeScript types for the `omni` config key.

```ts
interface OmniConfig {
  database?:       DatabaseConfig;
  schema?:         SchemaConfig;
  auth?:           AuthConfig;
  plugins?:        OmniPlugin[];
  logging?:        { enabled: boolean };
  cors?:           { enabled: boolean; origins?: string[] };
  analytics?:      { enabled: boolean };
  errorReporting?: { enabled: boolean };
}
```

## `DatabaseConfig`

```ts
interface DatabaseConfig {
  enabled:    boolean;
  connection: { url: string };
  schema?:    string | null;   // custom Drizzle schema path
}
```

## `SchemaConfig`

```ts
interface SchemaConfig {
  mode?:   'files';      // only mode currently supported
  input?:  {
    patterns?: string[];   // default: ['src/**/*.schema.ts']
    exclude?:  string[];
  };
  output?: {
    drizzle?: { path?: string; format?: 'single-file' };
    zod?:     { path?: string; format?: 'per-schema' | 'single-file' };
    model?:   { path?: string; format?: 'per-schema' | 'single-file' };
  };
  dev?: {
    watch?:           boolean;  // default: true
    generateOnStart?: boolean;  // default: true
  };
}
```

## `AuthConfig`

```ts
interface AuthConfig {
  enabled:          boolean;
  secret:           string;
  baseURL?:         string;           // default: http://localhost:5173
  basePath?:        string;           // default: /api/auth
  emailAndPassword?: {
    enabled:                   boolean;
    autoSignIn?:               boolean;
    requireEmailVerification?: boolean;
  };
  session?: {
    expiresIn?: number;               // seconds, default: 604800 (7 days)
    updateAge?: number;               // seconds, default: 86400 (1 day)
    cookieCache?: {
      enabled?: boolean;
      maxAge?:  number;
    };
  };
  socialProviders?: {
    google?:    { clientId: string; clientSecret: string };
    github?:    { clientId: string; clientSecret: string };
    discord?:   { clientId: string; clientSecret: string };
    twitter?:   { clientId: string; clientSecret: string };
    microsoft?: { clientId: string; clientSecret: string };
    apple?:     { clientId: string; clientSecret: string };
    // ...any Better-Auth provider
  };
  plugins?: {
    magicLink?:  boolean;
    twoFactor?:  boolean;
    passkey?:    boolean;
    username?:   boolean;
  };
}
```

## `SchemaOptions` (in `defineSchema`)

```ts
interface SchemaOptions {
  timestamps?:  boolean;
  softDeletes?: boolean;
  indexes?:     (string | string[])[];
  fillable?:    'auto' | string[];
  hidden?:      'auto' | string[];
  hooks?: {
    creating?: (data: any) => any;
    created?:  (record: any) => void;
    updating?: (data: any) => any;
    updated?:  (record: any) => void;
    deleting?: (record: any) => void;
    deleted?:  (record: any) => void;
  };
  relationships?: {
    [key: string]: RelationshipDefinition;
  };
  realtime?: {
    enabled:  boolean;
    events?:  ('created' | 'updated' | 'deleted')[];
    channels?: (record: any) => string[];
  };
}
```
