import { Model } from '$pkg/database'
import { posts } from '$lib/server/db/schema'
import { User } from './user.js'

export class Post extends Model {
  static table = posts
  static fillable = ['title', 'content', 'user_id', 'published']
  
  static casts = {
    published: 'boolean' as const,
    created_at: 'date' as const,
    updated_at: 'date' as const
  }
  
  static relationships = {
    author: this.belongsTo(User, 'user_id', 'id')
  }
}

// Register the model
Post.register('Posts')
