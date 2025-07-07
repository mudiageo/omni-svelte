# OmniSvelte 🚀

**Batteries Included Framework for SvelteKit**

note
Transform SvelteKit into a powerhouse with enterprise-grade features out of the box. OmniSvelte isn't just another library - it's a complete drop-in replacement that supercharges SvelteKit with everything you need for modern web development.

> **"SvelteKit, but with superpowers"** - Build production-ready applications in minutes, not months.

---

## 🌟 Why OmniSvelte?

✨ **Zero Configuration** - Works out of the box with sensible defaults  
⚡ **Lightning Fast** - Built on SvelteKit's performance with added optimizations  
🎯 **Type-Safe Everything** - Full TypeScript integration with Drizzle ORM  
🎨 **Beautiful by Default** - Integrated shadcn-svelte components  
🔧 **Developer First** - Powerful CLI tools for rapid development  

---

## 🚀 Features

### 🗄️ **Eloquent-Style ORM with Drizzle**
Laravel-inspired Active Record pattern with full TypeScript safety and Drizzle's performance.

```typescript
// Query like Laravel, but with full type safety
const posts = await Post
  .where('published', true)
  .with(['author', 'comments'])
  .latest()
  .paginate(10)

// Relationships made simple
class User extends Model {
  static relationships = {
    posts: hasMany(Post),
    profile: hasOne(Profile)
  }
}
```

### 🎨 **Beautiful UI Components**
One-command setup for production-ready, accessible components powered by shadcn-svelte.

```bash
# Get beautiful components instantly
omni ui init
omni ui add button card table form dialog
```

### 🛠️ **Powerful Code Generation**
Generate complete features faster than you can say "CRUD".

```bash
# Create everything you need in one command
omni make:resource BlogPost --admin --realtime
# ✅ Model + Migration + Factory
# ✅ CRUD routes + Forms  
# ✅ Admin interface
# ✅ Real-time updates
```

### 🔐 **Enterprise Authentication**
Production-ready auth with roles, permissions, and security best practices.

```typescript
// Protect routes with elegant middleware
export const load = authenticate(
  authorize(PostPolicy, 'update'),
  async ({ locals, params }) => {
    return { post: await Post.find(params.id) }
  }
)
```

### 📊 **Auto-Generated Admin**
Django-inspired admin interface that generates itself from your models.

```typescript
// Just define your model, get a full admin interface
class Product extends Model {
  static adminConfig = {
    listDisplay: ['name', 'price', 'category', 'created_at'],
    searchFields: ['name', 'description'],
    filters: ['category', 'in_stock']
  }
}
```

### ⚡ **Real-time Everything**
Built-in WebSocket and SSE support for live updates without the complexity.

```typescript
// Real-time updates with zero configuration
class ChatMessage extends Model {
  static realtime = true // That's it!
}

// In your Svelte component
{#each $liveMessages as message}
  <div>{message.content}</div>
{/each}
```

---

## 🚀 Quick Start

### Create a New Project

```bash
npm create omni-svelte@latest my-app
cd my-app
npm install
```

### Add to Existing SvelteKit Project

```bash
npm install omni-svelte
npx omni init
```

### Setup Your Database

```bash
# Configure environment
cp .env.example .env

# Run migrations and seed data
omni migrate
omni db:seed
```

### Build Your First Feature

```bash
# Generate a complete blog system
omni make:resource BlogPost --admin --realtime

# Start developing
npm run dev
```

🎉 **That's it!** You now have:
- A complete blog post model with CRUD operations
- Beautiful forms and data tables
- Admin interface at `/admin`
- Real-time updates across all clients

---

## 📖 Examples

### Define Models Like Laravel

```typescript
// src/lib/models/User.ts
import { Model, hasMany } from 'omni-svelte/database'
import { usersTable } from '../schema/users'

export class User extends Model {
  static table = usersTable
  static fillable = ['name', 'email', 'avatar_url']
  static hidden = ['password_hash']
  
  static relationships = {
    posts: hasMany(Post),
    comments: hasMany(Comment)
  }

  // Custom scopes (reusable query logic)
  static scopeActive(query) {
    return query.where('is_active', true)
  }

  static scopeWithPostCount(query) {
    return query.withCount('posts')
  }

  // Instance methods
  async fullName() {
    return `${this.first_name} ${this.last_name}`
  }
}
```

### Type-Safe Database Migrations

```typescript
// migrations/20250707132203_create_posts_table.ts
import { Migration } from 'omni-svelte/database'

export default class extends Migration {
  async up() {
    await this.createTable('posts', `
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255) UNIQUE NOT NULL,
      content TEXT NOT NULL,
      excerpt TEXT,
      featured_image VARCHAR(255),
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES categories(id),
      published_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `)
    
    await this.addIndex('posts', ['slug'])
    await this.addIndex('posts', ['published_at'])
  }

  async down() {
    await this.dropTable('posts')
  }
}
```

### Powerful Route Handlers

```typescript
// src/routes/blog/+page.server.ts
import { Post, Category } from '$lib/models'
import { validateWith, BlogPostRequest } from 'omni-svelte/validation'

export const load = async ({ url, locals }) => {
  const page = Number(url.searchParams.get('page')) || 1
  const category = url.searchParams.get('category')
  
  let query = Post.with(['author', 'category']).published()
  
  if (category) {
    query = query.whereHas('category', q => q.where('slug', category))
  }
  
  const [posts, categories] = await Promise.all([
    query.latest().paginate(12, page),
    Category.withCount('posts').get()
  ])
  
  return { posts, categories }
}

export const actions = {
  create: validateWith(BlogPostRequest, async ({ request, locals }) => {
    const data = await request.formData()
    
    const post = await Post.create({
      ...Object.fromEntries(data),
      user_id: locals.user.id,
      slug: generateSlug(data.get('title'))
    })
    
    // Real-time update to all connected clients
    await post.broadcast('created')
    
    return { success: true, post }
  })
}
```

### Beautiful Components Out of the Box

```svelte
<!-- src/routes/blog/+page.svelte -->
<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'
  import { Badge } from '$lib/components/ui/badge'
  import { EnhancedDataTable } from '$lib/components/ui/enhanced-data-table'
  
  export let data
  
  $: ({ posts, categories } = data)
</script>

<div class="container mx-auto py-8 space-y-8">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-4xl font-bold">Blog</h1>
      <p class="text-xl text-muted-foreground">Latest posts and updates</p>
    </div>
    <Button href="/blog/create" size="lg">
      Write Post
    </Button>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
    <!-- Category Filter -->
    <aside class="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
        </CardHeader>
        <CardContent class="space-y-2">
          {#each categories as category}
            <Button 
              href="/blog?category={category.slug}" 
              variant="ghost" 
              class="w-full justify-between"
            >
              {category.name}
              <Badge variant="secondary">{category.posts_count}</Badge>
            </Button>
          {/each}
        </CardContent>
      </Card>
    </aside>

    <!-- Posts Grid -->
    <div class="md:col-span-3">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each posts.data as post}
          <Card class="overflow-hidden hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle class="line-clamp-2">{post.title}</CardTitle>
              <p class="text-sm text-muted-foreground">
                by {post.author.name} • {post.created_at}
              </p>
            </CardHeader>
            <CardContent>
              <p class="text-sm line-clamp-3">{post.excerpt}</p>
              <Button href="/blog/{post.slug}" class="mt-4" variant="outline">
                Read More
              </Button>
            </CardContent>
          </Card>
        {/each}
      </div>
      
      <!-- Pagination -->
      <div class="mt-8">
        <Pagination 
          currentPage={posts.meta.current_page}
          totalPages={posts.meta.last_page}
          href="/blog"
        />
      </div>
    </div>
  </div>
</div>
```

---

## 🎯 CLI Commands

### 🔨 **Code Generation**

```bash
# Models & Database
omni make:model User --migration --factory
omni make:migration add_avatar_to_users --table=users
omni make:factory ProductFactory --model=Product

# Controllers & API
omni make:controller PostController --resource --api
omni make:middleware RateLimitMiddleware
omni make:policy PostPolicy

# Complete Features
omni make:resource Product --admin --realtime --api
omni make:auth  # Complete authentication system
```

### 🎨 **UI Generation**

```bash
# shadcn-svelte Setup
omni ui init --style new-york --base-color blue
omni ui add button card table form dialog sheet
omni ui list  # Show available components

# Custom Components
omni ui component ProductCard --type=display --props="product:Product"
omni ui form ProductForm --model=Product --fields="name,price,description"
omni ui page Dashboard --layout=admin --sections="stats,charts,tables"

# Layouts & Templates
omni ui layout AdminLayout --sidebar --header --breadcrumbs
omni ui template LandingPage --sections="hero,features,pricing,contact"
```

### 🗄️ **Database Management**

```bash
# Migrations
omni migrate                    # Run pending migrations
omni migrate:rollback --step=3  # Rollback last 3 migrations
omni migrate:reset --force      # Reset all migrations
omni migrate:fresh --seed       # Fresh migrate + seed
omni migrate:status             # Show migration status

# Seeding & Data
omni db:seed                    # Run all seeders
omni db:seed --class=UserSeeder # Run specific seeder
omni make:seeder ProductSeeder  # Create new seeder
omni db:fresh --seed            # Fresh start with data

# Schema Management
omni schema:dump                # Export current schema
omni schema:load                # Load schema from dump
```

### ⚡ **Real-time & Background Jobs**

```bash
# Real-time Setup
omni realtime:init              # Setup WebSocket server
omni realtime:channels          # List active channels
omni realtime:broadcast "New post published!" --channel=blog

# Background Jobs
omni make:job SendEmailJob      # Create background job
omni queue:work                 # Start queue worker
omni queue:status               # Show queue status
omni queue:retry --failed       # Retry failed jobs

# Scheduled Tasks
omni make:task DailyReportTask  # Create scheduled task
omni schedule:run               # Run scheduled tasks
omni schedule:list              # List all scheduled tasks
```

### 🛠️ **Development Tools**

```bash
# Interactive Development
omni tinker                     # Interactive shell
omni serve --with-admin         # Dev server with admin panel
omni serve --realtime           # Dev server with WebSocket support

# Code Quality
omni lint                       # Lint your code
omni format                     # Format code with prettier
omni test --coverage            # Run tests with coverage

# Documentation
omni docs:generate              # Generate API documentation
omni docs:serve                 # Serve docs locally

# Deployment
omni build:production           # Optimized production build
omni deploy --env=staging       # Deploy to staging environment
```

### 📊 **Monitoring & Debug**

```bash
# Performance & Monitoring
omni monitor:queries            # Monitor slow queries
omni monitor:realtime           # Monitor WebSocket connections
omni cache:clear                # Clear application cache
omni cache:stats                # Show cache statistics

# Debugging
omni debug:routes               # List all routes
omni debug:models               # List all models and relationships
omni debug:permissions          # Show permission matrix
omni debug:config               # Show current configuration

# Help System
omni help                       # Show all commands
omni help make:resource         # Detailed help for specific command
omni --version                  # Show version information
```

---

## 🏗️ Architecture

### 📁 **Framework Structure**
```
omni-svelte/
├── packages/
│   ├── core/              # Framework core and utilities
│   ├── database/          # Drizzle ORM wrapper with Active Record
│   ├── auth/              # Authentication and authorization
│   ├── admin/             # Auto-generated admin interface
│   ├── ui/                # shadcn-svelte integration
│   ├── validation/        # Form validation and rules
│   ├── realtime/          # WebSocket and SSE support
│   ├── jobs/              # Background job processing
│   ├── storage/           # File storage abstraction
│   ├── mail/              # Email system with templates
│   ├── cli/               # Command line interface
│   └── testing/           # Testing utilities and helpers
├── templates/
│   ├── starter/           # Basic project template
│   ├── blog/              # Blog template with admin
│   ├── ecommerce/         # E-commerce template
│   └── saas/              # SaaS application template
├── docs/                  # Comprehensive documentation
└── examples/              # Example applications
```

### 📂 **Generated Project Structure**
```
my-omni-app/
├── src/
│   ├── lib/
│   │   ├── models/        # Eloquent-style models
│   │   ├── schema/        # Drizzle database schemas
│   │   ├── factories/     # Model factories for testing
│   │   ├── policies/      # Authorization policies
│   │   ├── jobs/          # Background job classes
│   │   ├── mail/          # Email templates and classes
│   │   ├── components/    # UI components
│   │   │   ├── ui/        # shadcn-svelte components
│   │   │   ├── forms/     # Form components
│   │   │   └── layout/    # Layout components
│   │   ├── middleware/    # Custom middleware
│   │   └── utils/         # Utility functions
│   ├── routes/
│   │   ├── admin/         # Auto-generated admin interface
│   │   ├── api/           # API endpoints
│   │   ├── auth/          # Authentication routes
│   │   └── (app)/         # Main application routes
│   ├── hooks.server.ts    # Server-side hooks
│   ├── hooks.client.ts    # Client-side hooks
│   └── app.html
├── migrations/            # Database migrations
├── seeders/               # Database seeders
├── tests/                 # Test files
├── storage/
│   ├── logs/              # Application logs
│   ├── uploads/           # File uploads
│   └── cache/             # Cache files
├── jobs/                  # Background job definitions
├── config/                # Configuration files
├── components.json        # shadcn-svelte configuration
├── omni.config.js         # OmniSvelte configuration
└── drizzle.config.ts      # Drizzle configuration
```

---

## 🗺️ Roadmap

### ✅ **Phase 1: Foundation** (Completed - July 2025)
- [x] Core ORM with Drizzle integration
- [x] Active Record pattern implementation  
- [x] Advanced query builder with relationships
- [x] Migration and seeding system
- [x] Model factories for testing
- [x] CLI code generation tools
- [x] shadcn-svelte UI integration
- [x] Auto-generated admin interface
- [x] Authentication and authorization system
- [x] Form validation framework

### 🚧 **Phase 2: Real-time & Enterprise** (In Progress - Q3 2025)
- [x] Enhanced CLI with comprehensive help system
- [x] Resource scaffolding with templates
- [ ] **Real-time WebSocket support** with CrossWS integration
  - [ ] Live model updates across clients
  - [ ] Real-time notifications and alerts
  - [ ] Live chat and messaging systems
  - [ ] Collaborative editing features
- [ ] **Server-Sent Events (SSE)** for live data streaming
  - [ ] Live dashboards and analytics
  - [ ] Progress tracking for long-running operations
  - [ ] Real-time form validation feedback
- [ ] **Background job queues** with Redis/BullMQ
  - [ ] Email sending and notifications
  - [ ] Image processing and file uploads
  - [ ] Data import/export operations
  - [ ] Scheduled recurring tasks
- [ ] **File storage** abstraction layer
  - [ ] Local filesystem support
  - [ ] AWS S3 integration
  - [ ] Cloudflare R2 support
  - [ ] Image optimization and CDN integration

### 🌟 **Phase 3: Advanced Platform Features** (Q4 2025)
- [ ] **Email system** with beautiful templates
  - [ ] Transactional email support
  - [ ] Email template builder
  - [ ] Newsletter and marketing campaigns
  - [ ] Email tracking and analytics
- [ ] **Advanced caching** strategies
  - [ ] Redis integration
  - [ ] Database query caching
  - [ ] Page and component caching
  - [ ] Cache invalidation strategies
- [ ] **API rate limiting** and security
  - [ ] Request throttling and quotas
  - [ ] API key management
  - [ ] CORS and security headers
  - [ ] Request logging and monitoring
- [ ] **Monitoring and observability**
  - [ ] Application performance monitoring
  - [ ] Error tracking and alerting
  - [ ] Database query analysis
  - [ ] Real-time metrics dashboard

### 🚀 **Phase 4: Enterprise & Scale** (2026)
- [ ] **Multi-tenancy** support
  - [ ] Tenant isolation strategies
  - [ ] Subdomain and path-based routing
  - [ ] Per-tenant databases and configurations
  - [ ] Tenant management interface
- [ ] **Event sourcing** and CQRS patterns
  - [ ] Event store implementation
  - [ ] Command and query separation
  - [ ] Event replay and time travel debugging
  - [ ] Distributed event processing
- [ ] **Microservices** architecture support
  - [ ] Service mesh integration
  - [ ] Inter-service communication
  - [ ] Distributed tracing
  - [ ] Service discovery and load balancing
- [ ] **Advanced deployment** and DevOps
  - [ ] Docker containerization
  - [ ] Kubernetes deployment charts
  - [ ] CI/CD pipeline templates
  - [ ] Infrastructure as code templates
- [ ] **Plugin ecosystem** and extensibility
  - [ ] Third-party integrations marketplace
  - [ ] Custom plugin development framework
  - [ ] Plugin dependency management
  - [ ] Community-contributed plugins

### 🔮 **Future Innovations** (2026+)
- [ ] **AI-powered development** assistance
  - [ ] Code generation from natural language
  - [ ] Intelligent debugging suggestions
  - [ ] Performance optimization recommendations
  - [ ] Automated testing generation
- [ ] **Edge computing** support
  - [ ] Edge function deployment
  - [ ] Distributed caching strategies
  - [ ] Global data replication
  - [ ] CDN integration and optimization
- [ ] **Blockchain** and Web3 integration
  - [ ] Wallet authentication
  - [ ] Smart contract interaction
  - [ ] Decentralized storage support
  - [ ] NFT and token management

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
git clone https://github.com/omni-svelte/omni-svelte.git
cd omni-svelte
npm install
npm run dev
```

### Community

- **Discord**: [Join our community](https://discord.gg/omni-svelte)
- **GitHub Discussions**: [Ask questions and share ideas](https://github.com/omni-svelte/omni-svelte/discussions)
- **Twitter**: [@omnisvelte](https://twitter.com/omnisvelte)

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

Built with love on top of these amazing projects:
- [SvelteKit](https://kit.svelte.dev/) - The foundation
- [Drizzle](https://github.com/your-org/omni-svelte/issues)
- 📧 [CrossWS](mailto:support@omni-svelte.dev)
- 📧 [svelte-guardian](mailto:support@omni-svelte.dev) - For authentication

---

Built with ❤️ by the OmniSvelte team
