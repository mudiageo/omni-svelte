# OmniSvelte Platform APIs — Final Spec

### Mail · Events · Jobs · Queue · Cache · Notifications

> **Design philosophy:** Zero config for the simple case. Every complexity is expressible. Types flow forward — you never re-declare what the framework already knows. Errors are named classes, not strings. Drivers are swappable at config time, not call time. One mechanism per concept — no two APIs quietly solve the same problem differently.

---

## Shared Foundations

### Driver Pattern

Every module follows the same three-layer pattern:

```
defineXxx(name, config)            ← registers a named, typed instance
useXxx(name?)                      ← retrieves it (default if no name given)
configureXxx({ default, drivers }) ← wires the whole module at startup
```

All drivers implement a shared `OmniDriver<TInterface>` interface and are resolved lazily — no connection opens until the first call.

### Shared Error Classes

`packages/core/src/errors.ts`, imported everywhere:

```ts
class OmniError extends Error {
  constructor(
    message: string,
    public context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

class MailError extends OmniError {
  constructor(public cause: unknown) {
    super("Mail send failed", { cause });
  }
}
class QueueError extends OmniError {
  constructor(
    public jobName: string,
    public cause: unknown,
  ) {
    super(`Job ${jobName} failed`, { cause });
  }
}
class CacheError extends OmniError {
  constructor(
    public key: string,
    public cause: unknown,
  ) {
    super(`Cache op failed for ${key}`, { cause });
  }
}
class LockTimeoutError extends CacheError {
  constructor(
    public key: string,
    public maxWaitMs: number,
  ) {
    super(key, `Lock not acquired within ${maxWaitMs}ms`);
  }
}
class NotificationError extends OmniError {
  constructor(
    public notification: string,
    public channel: string,
    public recipientId: string,
    public cause: unknown,
  ) {
    super(`${notification} failed on channel '${channel}' for ${recipientId}`, { cause });
  }
}
class JobTimeoutError extends QueueError {
  constructor(
    jobName: string,
    public timeoutMs: number,
  ) {
    super(jobName, `timed out after ${timeoutMs}ms`);
  }
}
class JobMaxAttemptsError extends QueueError {
  constructor(
    jobName: string,
    public attempts: number,
  ) {
    super(jobName, `exhausted ${attempts} attempts`);
  }
}
```

Every error carries enough structured context to say what to do next, not just what failed — this is checked as an explicit review item for any new error class added later.

---

## §E — Cache

> Wraps any KV store. Works in-memory out of the box; one config line to go Redis. One grouping primitive (tags) for everything that needs invalidation-by-group.

### E.1 Configuration

```ts
// omni.config.ts
import { defineConfig } from "omni-svelte";

export default defineConfig({
  cache: {
    default: "main",
    stores: {
      main: { driver: "memory", ttl: 3600 },
      redis: { driver: "redis", url: env.REDIS_URL, ttl: 86400, prefix: "app:" },
      sessions: { driver: "redis", url: env.REDIS_URL, prefix: "sess:", ttl: 604800 },
    },
  },
});
```

### E.2 Driver Interface

```ts
interface CacheStore {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: { ttl?: number }): Promise<void>;
  delete(key: string): Promise<boolean>;
  has(key: string): Promise<boolean>;
  increment(key: string, by?: number): Promise<number>; // atomic, useful for rate limiting
  decrement(key: string, by?: number): Promise<number>;
  ttl(key: string): Promise<number | null>; // seconds remaining, null = no-expire
  getMany<T>(keys: string[]): Promise<Map<string, T | null>>;
  setMany<T>(entries: [string, T][], options?: { ttl?: number }): Promise<void>;

  tags(...tags: string[]): TaggedCache; // THE grouping primitive — see E.3
}

interface TaggedCache extends Pick<CacheStore, "get" | "set" | "delete" | "has"> {
  flush(): Promise<void>; // clears only keys written under these tags
}
```

### E.3 Application API

```ts
import { cache } from "$omni/cache";

// --- Basic ops (uses default store) — TTL is always an options object, always last ---
await cache.get<User>("user:1");
await cache.set("user:1", user, { ttl: 300 });
await cache.delete("user:1");
await cache.has("user:1");

// --- remember: get-or-compute. Same TTL shape/position as set() — no shape to relearn ---
const user = await cache.remember("user:1", () => User.find(1), { ttl: 300 });

// --- rememberForever: same signature, TTL option simply omitted — the name carries the meaning ---
const config = await cache.rememberForever("app:config", loadConfig);

// --- Named store ---
const sessionCache = cache.store("sessions");
await sessionCache.set("sess:abc", sessionData);

// --- Grouping: tags is the ONE mechanism. namespace() is sugar over it, not a separate feature ---
await cache.tags("posts", "user:1").set("posts:user:1", posts, { ttl: 600 });
await cache.tags("posts").flush(); // clears everything tagged 'posts'

const userCache = cache.namespace("user"); // == cache.tags('user'), documented as such
await userCache.set("1", user); // internally tagged 'user'
await userCache.flush(); // flushes only that tag group

// --- Locking: two distinct, unambiguous calls instead of one call with undefined contention behavior ---
await cache.lock("generate:report:1", { ttl: 30 }).block(() => buildHeavyReport());
// ^ waits for the lock (bounded by maxWait, default 10s) — throws LockTimeoutError if exceeded

const acquired = await cache.lock("send:digest:user:1", { ttl: 30 }).attempt(() => sendDigest());
// ^ tries once; returns false immediately if already held, never waits

// --- Low-level atomic ---
await cache.increment("rate:user:1:requests");
await cache.ttl("rate:user:1:requests"); // → 47 (seconds left)
```

### E.4 Built-in Drivers

| Driver       | Import path                    | Notes                                                 |
| ------------ | ------------------------------ | ----------------------------------------------------- |
| `memory`     | built-in                       | Default for dev/test. Not shared across instances.    |
| `redis`      | `omni-svelte/cache/redis`      | Requires `ioredis`. Tags implemented via Redis sets.  |
| `filesystem` | `omni-svelte/cache/filesystem` | Good for single-server deployments with large values. |
| `database`   | `omni-svelte/cache/database`   | Uses a `cache_entries` table via the ORM.             |
| `null`       | built-in                       | Always misses. Disables caching in tests.             |
| `array`      | built-in                       | In-request-only memory. For test assertions.          |

### E.5 Custom Driver

```ts
import { defineCacheDriver } from "omni-svelte/cache";

const memcachedDriver = defineCacheDriver<{ servers: string[] }>((config) => ({
  async get(key) {
    /* ... */
  },
  async set(key, value, options) {
    /* ... */
  },
  // ...rest of CacheStore
}));

export default defineConfig({
  cache: { stores: { mc: { driver: memcachedDriver, servers: ["..."] } } },
});
```

---

## §F — Queue & Jobs

> Class-based jobs with a strongly typed payload. Dispatch is one line. This is the ONE queueing mechanism in the framework — queued events (§H) and queued notifications (§I) are built on top of it, not parallel systems.

### F.1 Configuration

```ts
export default defineConfig({
  queue: {
    default: "main",
    connections: {
      main: { driver: "memory" }, // dev/test, no deps
      redis: { driver: "bullmq", url: env.REDIS_URL }, // production
      db: { driver: "database", pollInterval: 5000 }, // zero-infra fallback
    },
    queues: {
      default: { concurrency: 5 },
      emails: { concurrency: 10 },
      exports: { concurrency: 2, rateLimit: { max: 5, duration: 60_000 } },
      critical: { concurrency: 20, priority: 100 },
    },
  },
});
```

### F.2 Defining a Job

```ts
// app/jobs/send-welcome-email.job.ts
import { defineJob } from "omni-svelte/queue";
import { z } from "zod";

export const SendWelcomeEmail = defineJob({
  name: "SendWelcomeEmail",
  queue: "emails",
  schema: z.object({
    // payload schema — `data` in handle() is inferred from THIS, not restated
    userId: z.string().uuid(),
    email: z.string().email(),
    name: z.string(),
  }),
  attempts: 3,
  backoff: { type: "exponential", delay: 2000 }, // 2s, 4s, 8s
  timeout: 30_000, // throws JobTimeoutError if exceeded

  async handle({ data, job, attempt }) {
    await mail.to(data.email).send(new WelcomeEmail(data));
  },
  async failed({ data, error, attempts }) {
    await notify(await User.find(data.userId), new JobFailedNotification({ error }));
  },
  async completed({ data, result }) {
    /* optional cleanup */
  },
});
```

### F.3 Dispatching

```ts
import { SendWelcomeEmail } from "$jobs/send-welcome-email.job";

await SendWelcomeEmail.dispatch({ userId: user.id, email: user.email, name: user.name });

await SendWelcomeEmail.dispatch(
  {/* ... */},
  {
    delay: "5m", // '5m' | '2h' | '1d', or a raw ms number
    priority: 10,
    queue: "critical", // override the job's default queue
    uniqueFor: "1h", // dedupe: skip if identical job already queued within 1h
  },
);

await SendWelcomeEmail.dispatchMany(
  users.map((u) => ({ userId: u.id, email: u.email, name: u.name })),
);

await JobChain.add(ProcessUpload, { fileId })
  .add(GenerateThumbnails, { fileId })
  .add(NotifyUploadComplete, { fileId })
  .dispatch();

const batch = await JobBatch.add(
  SendWelcomeEmail,
  users.map((u) => ({ ...u })),
)
  .then(async (batch) => {
    await batch.summary();
  }) // runs when ALL complete
  .catch(async (batch) => {
    await alertOps(batch.failedJobs());
  }) // runs if ANY fail
  .dispatch();

await batch.progress(); // { total, processed, failed, pending }

// Scheduled (cron) — declared at job level, no dispatch call needed
export const DailyDigest = defineJob({
  // ...
  cron: "0 9 * * *",
  timezone: "Africa/Lagos",
});
```

### F.4 Job Context API

```ts
async handle({ data, job, attempt, chain }) {
	// data  — typed payload, inferred from `schema`
	// job.id, job.queue — string
	// attempt — 1-indexed current attempt
	// chain — previous job's result, if inside a JobChain
	return { processedAt: new Date() };  // available to .then() and the next chain step
}
```

### F.5 Worker

```ts
// workers/main.worker.ts — run separately: `node workers/main.worker.ts`
import { startWorker } from "$omni/queue/worker";
import "$jobs";

await startWorker({
  connection: "redis",
  queues: ["default", "emails", "exports"],
  concurrency: 5,
  shutdown: { timeout: 30_000 }, // finish in-flight jobs before exiting
});
```

### F.6 Built-in Drivers

| Driver     | Notes                                                              |
| ---------- | ------------------------------------------------------------------ |
| `memory`   | In-process, no persistence, runs handlers inline — good for tests. |
| `bullmq`   | Production. Redis-backed. Supports all features.                   |
| `database` | Polls a `jobs` table. Zero new infra, fine for low throughput.     |

---

## §G — Mail

> Mailable classes carry their own template and recipient logic. Sending is always `mail.to(addr).send(mailable)`.

### G.1 Configuration

```ts
export default defineConfig({
  mail: {
    default: "main",
    mailers: {
      main: { driver: "resend", apiKey: env.RESEND_API_KEY },
      smtp: {
        driver: "smtp",
        host: env.SMTP_HOST,
        port: 587,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      },
      console: { driver: "console" },
      log: { driver: "log" },
    },
    from: { address: "hello@myapp.com", name: "My App" },
    replyTo: "support@myapp.com",
    to: env.NODE_ENV === "development" ? "dev@myapp.com" : undefined, // dev-mode redirect
  },
});
```

### G.2 Defining a Mailable

```ts
// app/mail/welcome.mail.ts
import { defineMailable } from "$omni/mail";

export class WelcomeEmail extends defineMailable() {
  // null = send synchronously. Same "off" convention as everywhere else — no bare `false`.
  queue: string | null = "emails";

  constructor(private user: { name: string; email: string }) {
    super();
  }

  build() {
    return this.subject(`Welcome to MyApp, ${this.user.name}!`)
      .from("welcome@myapp.com", "The MyApp Team")
      .replyTo("support@myapp.com")
      .template(WelcomeEmailTemplate, { user: this.user }) // or .html()/.text()/.markdown``
      .attach("guide.pdf", Buffer.from(/* ... */), { contentType: "application/pdf" })
      .tag("welcome", "onboarding");
  }
}
```

### G.3 Sending

```ts
import { mail } from "$omni/mail";

await mail.to(user.email).send(new WelcomeEmail(user));

await mail
  .to([user.email, manager.email])
  .cc("legal@myapp.com")
  .bcc("archive@myapp.com")
  .send(new InvoiceEmail(invoice));

await mail.mailer("smtp").to(user.email).send(new WelcomeEmail(user));

// Always queued regardless of the Mailable's own `queue` setting
await mail.to(user.email).later(new WelcomeEmail(user), { delay: "1h" });

await mail.bulk(users.map((u) => ({ to: u.email, mailable: new WelcomeEmail(u) })));
```

### G.4 Templates (Svelte Components)

```svelte
<!-- app/mail/templates/welcome-email.svelte -->
<script lang="ts">
	let { user } = $props<{ user: { name: string } }>();
</script>
<h1>Welcome, {user.name}!</h1>
<p>We're glad you're here.</p>
```

```ts
.template(WelcomeEmailTemplate, { user: this.user })
// Server-rendered, CSS auto-inlined, plain-text version auto-generated if not supplied
```

### G.5 Inline Template DSL

```ts
export class PasswordResetEmail extends defineMailable() {
  constructor(private url: string) {
    super();
  }
  build() {
    return this.subject("Reset your password").markdown`
			## Password Reset
			Click below to reset your password. This link expires in 1 hour.
			[Reset Password](${this.url})
			If you didn't request this, ignore this email.
		`;
  }
}
```

### G.6 Built-in Drivers

| Driver     | Notes                                          |
| ---------- | ---------------------------------------------- |
| `resend`   | Recommended. First-class support, tags, batch. |
| `smtp`     | Universal, via `nodemailer`.                   |
| `sendgrid` | Full API including templates.                  |
| `postmark` | Transactional focus, message streams.          |
| `ses`      | AWS SES via `@aws-sdk/client-ses`.             |
| `mailgun`  | Full API.                                      |
| `console`  | Pretty-prints to stdout. Default in dev.       |
| `log`      | Writes to a file.                              |
| `array`    | Captures in memory, for tests.                 |
| `null`     | Drops silently.                                |

---

## §H — Events

> Strongly typed event classes. Queued listeners dispatch through §F's Queue directly — same retry/backoff/dev-inspector machinery, not a second implementation.

### H.1 Defining an Event

```ts
// app/events/user-registered.event.ts
import { defineEvent } from "$omni/events";

export class UserRegistered extends defineEvent() {
  constructor(
    public readonly user: User,
    public readonly registeredAt: Date = new Date(),
  ) {
    super();
  }
}
```

### H.2 Defining a Listener

```ts
// app/listeners/send-welcome-email.listener.ts
import { defineListener } from "$omni/events";

export class SendWelcomeEmailListener extends defineListener<UserRegistered>() {
  queue = "emails"; // when set, the framework dispatches this listener as a Queue job internally —
  delay = "5m"; // same dispatch(), same retry/backoff, same omni:job:* dev-inspector events as F.3.
  // A listener with no `queue` runs synchronously, inline, as part of emit().

  async handle(event: UserRegistered) {
    await mail.to(event.user.email).send(new WelcomeEmail(event.user));
  }
  async failed(event: UserRegistered, error: Error) {
    console.error("Failed to send welcome email", error);
  }
}
```

### H.3 Registration

```ts
// app/events/index.ts — one file, all wiring in one place
import { EventMap } from "$omni/events";

export default {
  [UserRegistered.name]: [
    SendWelcomeEmailListener,
    CreateOnboardingTasksListener,
    TrackSignupAnalyticsListener, // queued — won't block the response
  ],
  [OrderPlaced.name]: [
    SendOrderConfirmationListener,
    UpdateInventoryListener,
    NotifySalesTeamListener,
  ],
} satisfies EventMap;
```

```ts
// omni.config.ts
import events from "./app/events";
export default defineConfig({ events });
```

### H.4 Firing Events

```ts
import { emit } from "$omni/events";

await emit(new UserRegistered(user)); // runs sync listeners inline, queues the rest via §F
emit.async(new UserRegistered(user)); // fire-and-forget, never awaited
const results = await emit.sync(new UserRegistered(user)); // waits for EVERYTHING incl. queued, for tests
await emit.when(user.isNew, new UserRegistered(user)); // conditional emit
```

### H.5 Low-Level API

```ts
import { events } from "$omni/events";

const unsub = events.on(UserRegistered, async (event) => {
  /* ... */
});
events.once(OrderPlaced, async (event) => {
  /* ... */
});
events.onAny(async (event) => {
  await auditLog.record(event);
});
unsub();

events.listeners(UserRegistered); // → registered listener classes/fns
events.eventNames(); // → string[]
```

### H.6 Model Events (ORM hook integration)

```ts
// Auto-fired by ORM hooks: 'model:creating', 'model:created', 'model:updating', 'model:updated',
// 'model:deleting', 'model:deleted', 'model:restored'

events.on("model:created", async ({ model, instance }) => {
  if (model.name === "Post") await emit(new PostPublished(instance as Post));
});

// Or declared on the event class directly (preferred):
export class PostCreatedEvent extends defineEvent() {
  static fires = "model:created";
  static when = (post: Post) => post.status === "published";
}
```

---

## §I — Notifications

> One `notify()` call, many channels. Notification classes declare which channels they _might_ use — that declaration is type-checked against which `toXxx` renderers are implemented. Queued sends (`notify.later`) dispatch through §F, same as queued listeners. The in-app realtime feed uses the framework's `query.live` primitive, not a separate SSE implementation.

### I.1 Defining a Notification

```ts
// app/notifications/order-shipped.notification.ts
import { defineNotification } from "$omni/notifications";

// The generic lists every channel this notification might ever use — the base class then
// requires a matching toXxx() for each one, so "declared a channel" and "implemented its
// renderer" can never silently drift apart.
export class OrderShipped extends defineNotification<"database" | "mail" | "sms" | "push">() {
  constructor(private order: Order) {
    super();
  }

  // Runtime subset of the declared channels — still fully dynamic per-notifiable
  via(notifiable: User): NotificationChannel[] {
    const channels: NotificationChannel[] = ["database", "mail"];
    if (notifiable.phone) channels.push("sms");
    if (notifiable.pushTokens?.length) channels.push("push");
    return channels;
  }

  toMail(): MailMessage {
    return {
      subject: `Your order #${this.order.number} has shipped!`,
      template: OrderShippedEmailTemplate,
      data: { order: this.order },
    };
  }
  toSms(): string {
    return `Your order #${this.order.number} shipped! Track: ${this.order.trackingUrl}`;
  }
  toPush(): PushMessage {
    return {
      title: "Order Shipped",
      body: `Order #${this.order.number} is on its way!`,
      data: { orderId: this.order.id },
      icon: "/icons/shipping.png",
    };
  }
  toDatabase(): DatabaseNotificationData {
    return {
      type: "order_shipped",
      title: `Order #${this.order.number} shipped`,
      body: "Your order is on its way",
      actionUrl: `/orders/${this.order.id}`,
      metadata: { orderId: this.order.id, trackingUrl: this.order.trackingUrl },
    };
  }
}
```

### I.2 Sending

```ts
import { notify } from "$omni/notifications";

await notify(user, new OrderShipped(order));
await notify([user, admin], new OrderShipped(order));

// Queued — dispatches via §F's Queue internally, same retry/backoff as any other job
await notify.later(user, new OrderShipped(order));
await notify.later(user, new OrderShipped(order), { delay: "2m", queue: "notifications" });

// Notifiable mixin (see I.5)
await user.notify(new OrderShipped(order));
await user.notifyLater(new OrderShipped(order));
```

### I.3 Reading Notifications (in-app feed)

```ts
import { notifications } from "$omni/notifications";

const feed = await notifications.for(user).paginate({ page: 1, perPage: 20 });
// { data: Notification[], total, unreadCount, page, lastPage }

const unread = await notifications.for(user).unread().get();
const count = await notifications.for(user).unreadCount();

await notifications.markRead(notificationId);
await notifications.markAllRead(userId);
await notifications.markRead([id1, id2, id3]);

await notifications.delete(notificationId);
await notifications.flush(userId);
```

### I.4 Configuration

```ts
export default defineConfig({
  notifications: {
    channels: {
      mail: { driver: "mail", mailer: "main" },
      sms: { driver: "termii", apiKey: env.TERMII_API_KEY },
      sms_at: { driver: "africas-talking", apiKey: env.AT_API_KEY, username: env.AT_USERNAME },
      push: { driver: "firebase", serviceAccount: env.FCM_JSON },
      push_web: {
        driver: "web-push",
        vapidKeys: { public: env.VAPID_PUBLIC, private: env.VAPID_PRIVATE },
      },
      slack: { driver: "slack", webhookUrl: env.SLACK_WEBHOOK },
      database: { driver: "database" }, // always enabled, uses the ORM
    },
    queue: "notifications", // default queue for notify.later()
    pruneAfter: "90d",
  },
});
```

### I.5 Notifiable Mixin

```ts
// models/user.ts
import { Notifiable } from "$omni/notifications";

export const User = createModel(userSchema, { mixins: [Notifiable] });

// Now on any User instance:
await user.notify(new OrderShipped(order));
await user.notifyLater(new WelcomeNotification());
const unread = await user.unreadNotifications();
const all = await user.notifications().paginate({ page: 1, perPage: 20 });
```

### I.6 Database Schema (auto-migrated)

```
notifications
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
  type            text NOT NULL
  notifiable_type text NOT NULL   -- e.g. 'User'
  notifiable_id   uuid NOT NULL
  title           text
  body            text
  action_url      text
  metadata        jsonb DEFAULT '{}'
  read_at         timestamptz
  created_at      timestamptz DEFAULT now()
  INDEX (notifiable_id, notifiable_type, read_at)
```

### I.7 Realtime Feed — built on `query.live`, not a bespoke SSE route

```ts
// routes/notifications.remote.ts — same shape as any other live remote function in the framework
import { query } from "$app/server";
import { notifications, onNotificationEvent } from "$omni/notifications";

export const notificationFeed = query.live(async function* (ctx) {
  const userId = requireUser(ctx).id;
  // Database-channel writes already emit an internal event on send (I.4's `database` driver) —
  // this generator yields whenever that fires for this user. Same query.live mechanism as
  // every other live feed in the framework, not a separate realtime implementation.
  for await (const _ of onNotificationEvent(userId)) {
    yield await notifications.for(userId).unread().get();
  }
});
```

```svelte
<script lang="ts">
	import { notificationFeed } from './notifications.remote';
</script>
<span class="badge">{(await notificationFeed()).length}</span>
```

No separate `+server.ts`, no separate client hook — standard remote-functions usage, identical to how any other `query.live` feed elsewhere in the app is consumed.

---

## Cross-Cutting: Fake Drivers (Testing)

```ts
// vitest.setup.ts
import { useFakes } from "$omni/testing";

useFakes(); // enables array/fake drivers for mail, queue, cache, notifications
useFakes(["mail", "queue"]); // or selectively
```

```ts
import { fakeMail, fakeQueue, fakeCache, fakeNotifications } from "$omni/testing";

expect(fakeMail.sent()).toHaveLength(1);
expect(fakeMail.sentTo("user@x.com")).toHaveLength(1);
fakeMail.assertSent(WelcomeEmail);
fakeMail.assertNothingSent();

fakeQueue.assertDispatched(SendWelcomeEmail);
fakeQueue.assertDispatchedWith(SendWelcomeEmail, { userId: user.id });
fakeQueue.assertNotDispatched(CriticalJob);
fakeQueue.assertCount(SendWelcomeEmail, 3);
fakeQueue.assertBatched(SendWelcomeEmail);
// Note: because queued listeners/notifications now dispatch through Queue directly (§H/§I),
// fakeQueue's assertions also cover them — no separate fakeListener/fakeNotificationQueue needed.

await fakeCache.set("key", "value");
expect(fakeCache.has("key")).toBe(true);
fakeCache.flush();

fakeNotifications.assertSentTo(user, OrderShipped);
fakeNotifications.assertSentVia("sms", OrderShipped);
fakeNotifications.assertNothingSent();
fakeNotifications.assertCount(user, 2);
```

---

## Cross-Cutting: Dev Inspector (§M.4 integration)

| Event                               | Data                                      |
| ----------------------------------- | ----------------------------------------- |
| `omni:mail:sent`                    | `{ mailable, to, mailer, durationMs }`    |
| `omni:mail:failed`                  | `{ mailable, to, error }`                 |
| `omni:job:dispatched`               | `{ job, queue, delay }`                   |
| `omni:job:started`                  | `{ job, attempt }`                        |
| `omni:job:completed`                | `{ job, durationMs }`                     |
| `omni:job:failed`                   | `{ job, error, attempts }`                |
| `omni:cache:hit` / `:miss` / `:set` | `{ key, store }` (+ `ttl` for set)        |
| `omni:notification:sent`            | `{ notification, channels, recipientId }` |
| `omni:notification:failed`          | `{ notification, channel, error }`        |
| `omni:event:emitted`                | `{ event, listenersCount }`               |

Because queued listeners and `notify.later()` now dispatch through Queue (§H/§I), they emit the _same_ `omni:job:*` events as any other job — the inspector shows one unified timeline of background work instead of three differently-shaped event families. Consumed by `/__omni/inspector` with zero extra wiring.

---

## Module Exports Summary

```ts
// $omni/cache
export { cache, defineCacheDriver, type CacheDriver, type CacheStore, type TaggedCache };

// $omni/queue
export { defineJob, JobChain, JobBatch, startWorker, type JobContext };

// $omni/mail
export { mail, defineMailable, type MailMessage, type MailDriver };

// $omni/events
export { emit, events, defineEvent, defineListener, type EventMap };

// $omni/notifications
export { notify, notifications, defineNotification, Notifiable };
export type { NotificationChannel, DatabaseNotificationData, PushMessage };

// $omni/testing
export { useFakes, fakeMail, fakeQueue, fakeCache, fakeNotifications };
```

---

## Implementation Build Order

```
1. Cache        — no deps. Unblocks rate limiting (§C.2) and queue persistence.
2. Queue        — memory driver first. Build BEFORE events/notifications: both route
                   their queued paths through this, not a parallel mechanism.
3. Events       — low-level emit/on/defineEvent; queued listeners wrap Queue from step 2.
4. Mail         — console driver first, then real providers.
5. Notifications — depends on mail + queue + events + ORM; realtime feed (I.7) depends
                   on the framework's query.live/resource() plumbing being in place.
6. Fake drivers — last; they mirror stable interfaces, so must come after those settle.
```

## Design principles this spec holds itself to

1. **Zero required config for the simple case; complex case still reachable** — every option object above is fully optional.
2. **Types inferred, never restated** — job payloads come from `schema`, notification channel/method pairing is compile-time linked, not two independently-maintained lists.
3. **Boundary failures are typed, named error classes** with structured context — never a bare `Error` or a silent falsy return.
4. **One mechanism per concept** — a single Queue underlies jobs, queued listeners, and queued notifications; a single Tags primitive underlies cache grouping; a single `query.live` underlies every realtime feed in the framework, notifications included.
5. **No API requires reading its implementation to use correctly** — `lock().block()` vs `.attempt()` says what happens on contention without needing a doc lookup; `queue: string | null` says what "off" means using the same convention as everywhere else.
