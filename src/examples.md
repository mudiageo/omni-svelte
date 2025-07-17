# Examples


## Query helpers example
```typescript
// In any +page.server.ts or +layout.server.ts
export async function load({ locals }) {
    const users = await locals.query.model(User).where('active', true).get()
    
    const customResult = await locals.query.raw(`SELECT * FROM users WHERE created_at > ${new Date('2024-01-01')}`)
    
    return {
        users,
        customResult
    }
}
```
## Query helpers register model and autoregistration example
```typescript
// Register your models (in your app initialization)
import { User, Post } from './models'

User.register('Users')
Post.register('Posts')

// Or use the decorator
@RegisterModel('Users')
class User extends Model {
  // ...
}

// In your routes
export async function load({ locals }) {
    const users = await locals.query.Users.where('active', true).get()
    const posts = await locals.query.Posts.with(['author']).latest().get()
    
    return { users, posts }
}```


