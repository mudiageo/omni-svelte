---
title: Testing Plugins
description: How to test OmniSvelte plugins in isolation with Vitest.
section: Plugin System
order: 5
---

# Testing Plugins

## Setup

```bash
pnpm add -D vitest @vitest/coverage-v8
```

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals:     true
  }
});
```

## Unit testing a plugin

```ts
// plugins/audit.test.ts
import { describe, it, expect, vi } from 'vitest';
import { auditPlugin } from './audit.js';

describe('auditPlugin', () => {
  it('registers the audit_logs table', () => {
    const plugin = auditPlugin();
    const tables = plugin.registerTables?.();
    expect(tables).toHaveProperty('auditLogs');
  });

  it('logs model events', async () => {
    const insertMock = vi.fn().mockResolvedValue([]);
    const plugin = auditPlugin({ db: { insert: () => ({ values: insertMock }) } as any });

    await plugin.onModelEvent?.({
      type:      'created',
      modelName: 'posts',
      data:      { id: 1, title: 'Test' }
    });

    expect(insertMock).toHaveBeenCalledOnce();
  });

  it('ignores creating/updating hooks', async () => {
    const insertMock = vi.fn();
    const plugin = auditPlugin({ db: { insert: () => ({ values: insertMock }) } as any });

    await plugin.onModelEvent?.({ type: 'creating', modelName: 'posts', data: {} });
    expect(insertMock).not.toHaveBeenCalled();
  });
});
```

## Testing handle hooks

```ts
import { describe, it, expect, vi } from 'vitest';
import { requestLogPlugin } from './request-log.js';

describe('requestLogPlugin handle', () => {
  it('logs request duration', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const plugin = requestLogPlugin();

    const mockEvent = { request: { method: 'GET' }, url: { pathname: '/test' } } as any;
    const mockResolve = vi.fn().mockResolvedValue({ status: 200 });

    await plugin.handle?.({ event: mockEvent, resolve: mockResolve });
    expect(log).toHaveBeenCalledWith(expect.stringContaining('GET /test → 200'));
  });
});
```
