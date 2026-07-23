---
title: "Tutorial: Zero to Hero SaaS"
description: Build a fully functional Customer Feedback SaaS in 15 minutes using OmniSvelte.
section: Getting Started
order: 4
---

<script>
  import Callout from '$lib/components/docs/Callout.svelte';
  import Steps from '$lib/components/docs/Steps.svelte';
  import Step from '$lib/components/docs/Step.svelte';
  import Visualize from '$lib/components/docs/Visualize.svelte';
  import FileTree from '$lib/components/docs/FileTree.svelte';
  import Folder from '$lib/components/docs/Folder.svelte';
  import File from '$lib/components/docs/File.svelte';
  import Playground from '$lib/components/docs/Playground.svelte';
</script>

# Build a SaaS in 15 Minutes

Welcome to the OmniSvelte Zero-to-Hero tutorial! In this guide, we won't just build a toy app—we will build a **Customer Feedback SaaS** (think Canny or UserVoice) from scratch. 

We will cover setting up your database, defining relationships, scaffolding the UI, securing API endpoints with authentication, and utilizing SvelteKit remote functions for real-time reactivity.

<Callout type="info" title="Prerequisites">
Before you start, make sure you have Node.js 18+ installed and a working terminal.
</Callout>

<Steps>

<Step title="Initialize your project">
First, use the OmniSvelte CLI to create a new project with our built-in authentication template.

```bash
omni init feedback-saas --with-auth
cd feedback-saas
```

Here's the structure of your newly created OmniSvelte project:

<FileTree>
  <Folder name="feedback-saas" defaultOpen={true}>
    <Folder name="src">
      <Folder name="lib">
        <File name="schema.ts" highlight={true} />
        <File name="db.ts" />
      </Folder>
      <Folder name="routes">
        <File name="+page.svelte" />
      </Folder>
    </Folder>
    <File name="omni.config.ts" />
    <File name="package.json" />
  </Folder>
</FileTree>

</Step>

<Step title="Define your SaaS Schema & Relationships">
A real SaaS needs complex data. Open `src/lib/schema.ts` and define a `Product` model and a `Feedback` model. We'll set up a one-to-many relationship so every piece of feedback belongs to a specific product.

```typescript
import { defineSchema, field } from '@omni-svelte/core';

export const Product = defineSchema('products', {
  name: field.string(),
  slug: field.string().unique(),
});

export const Feedback = defineSchema('feedback', {
  title: field.string(),
  description: field.text(),
  status: field.enum(['open', 'planned', 'shipped']).default('open'),
  upvotes: field.integer().default(0),
  productId: field.references(() => Product.id),
  userId: field.references(() => User.id) // Automatically injected by BetterAuth
});
```

The framework will automatically generate the database migrations, TypeScript types, and Zod validation schemas for you.

</Step>

<Step title="Generate the UI and APIs">
Instead of writing boilerplate, let OmniSvelte generate the CRUD operations, admin tables, and SvelteKit Remote Functions for your products.

```bash
omni generate resource Product
omni generate resource Feedback
```

This single command wires up the backend APIs, generates accessible forms using Zod, and creates the frontend views using `shadcn-svelte`.

<Visualize />

</Step>

<Step title="Secure your Remote Functions">
SaaS applications need authorization. Let's modify the generated `src/lib/server/feedback.remote.ts` to ensure only logged-in users can submit feedback. We'll use OmniSvelte's `$auth/server` virtual module.

```typescript
import { command } from '@omni-svelte/core/remote';
import { auth } from '$auth/server';
import { Feedback } from '$models/Feedback';

export const createFeedback = command()
  .schema(Feedback.insertSchema)
  .use(async ({ request, locals }) => {
    // Middleware: Ensure user is logged in
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw new Error("Unauthorized");
    
    locals.user = session.user;
  })
  .handler(async ({ input, locals }) => {
    // Handler: Create the feedback in the DB
    return await Feedback.create({
      ...input,
      userId: locals.user.id
    });
  });
```

<div class="my-6 flex flex-col rounded-xl border bg-background shadow-sm">
  <div class="border-b bg-muted/50 px-4 py-2 text-sm font-medium text-muted-foreground">Preview</div>
  <div class="flex items-center justify-center p-8 text-sm text-muted-foreground border-2 border-dashed m-4 rounded-lg bg-muted/20">
    This secure API endpoint is now accessible directly from your Svelte components!
  </div>
</div>

</Step>

<Step title="Build a Real-Time Feed">
Let's render a real-time list of feedback on our product page. OmniSvelte provides `query.live`, which streams updates directly to the client whenever the `Feedback` model is mutated.

```svelte
<script lang="ts">
  import { getFeedbackLive } from '$lib/server/feedback.remote';
  
  let { data } = $props();
  
  // This store will automatically update when anyone submits new feedback!
  const feedbackFeed = getFeedbackLive({ productId: data.product.id });
</script>

<div class="space-y-4">
  {#each $feedbackFeed as item}
    <div class="p-4 border rounded-md shadow-sm">
      <h3 class="font-bold">{item.title}</h3>
      <p class="text-sm text-muted-foreground">{item.description}</p>
      <span class="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
        {item.status}
      </span>
    </div>
  {/each}
</div>
```

<div class="my-6 flex flex-col rounded-xl border bg-background shadow-sm">
  <div class="border-b bg-muted/50 px-4 py-2 text-sm font-medium text-muted-foreground">Real-time Feed Preview</div>
  <div class="p-6 space-y-4">
    <div class="p-4 border rounded-md shadow-sm">
      <h3 class="font-bold">Add dark mode</h3>
      <p class="text-sm text-muted-foreground">We really need a dark mode for late night coding.</p>
      <span class="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">planned</span>
    </div>
    <div class="p-4 border rounded-md shadow-sm">
      <h3 class="font-bold">Faster search</h3>
      <p class="text-sm text-muted-foreground">Search takes too long on large tables.</p>
      <span class="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">open</span>
    </div>
  </div>
</div>

</Step>

<Step title="Run the application">
Run your migrations to sync your schema with the database, then start the dev server!

```bash
omni db push
npm run dev
```

</Step>

</Steps>

<Callout type="success" title="You built a SaaS!">
You've just built a secure, real-time Customer Feedback SaaS with database models, relationships, and authentication. As OmniSvelte adds new features like **Jobs** and **Payments**, this tutorial will be updated to show you how to charge your customers and send them email notifications!
</Callout>
