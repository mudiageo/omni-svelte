import { Model } from '$pkg/database'
import { users } from '$lib/server/db/schema'

export class User extends Model {
  static table = users
  static fillable = ['name', 'email', 'password', 'active']
  static hidden = ['password']
  
  static casts = {
    active: 'boolean' as const,
    created_at: 'date' as const,
    updated_at: 'date' as const
  }
}

// Register the model
User.register('Users')
