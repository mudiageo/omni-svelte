import { Model } from '../package/database/model';
import { users } from './db/server/schema';
import { usersCreateSchema, usersUpdateSchema } from './users.validation';
import type { Users as UsersType, NewUsers as NewUsersType } from './db/server/schema';

export class UsersModel extends Model {
  static tableName = 'users';
  static table = users;
  static createSchema = usersCreateSchema;
  static updateSchema = usersUpdateSchema;
  
  static fillable = ['name', 'email', 'active'];
  static hidden = ['password'];
  static casts = { active: 'boolean' as const };
  
  static realtimeConfig = {
    enabled: true,
    events: ["created", "updated"],
    channels: () => [`users`]
  };
}

export class Users extends UsersModel {
  // Additional model methods and overrides can be added here
}

export default Users;