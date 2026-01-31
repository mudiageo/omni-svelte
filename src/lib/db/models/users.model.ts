import { Model } from '$pkg/database/model';
import { users } from '../server/schema';
import { usersCreateSchema, usersUpdateSchema } from '../validation/users.validation';
import type { Users as UsersType, NewUsers as NewUsersType } from '../server/schema';

export class UsersModel extends Model {
  static tableName = 'users';
  static table = users;
  static validation = {
     create: usersCreateSchema,
     update: usersUpdateSchema,
     base: usersCreateSchema,
  };
  
  static fillable = ['name', 'email', '// avatar', '// settings', '// status', 'active'];
  static hidden = ['password'];
  static casts = { // settings: 'json' as const, active: 'boolean' as const };
  
  static realtime = {
    enabled: true,
    events: [],
    channels: () => [`users`]
  };

  static hooks = {
    creating: [async (data: any) => {

      if (data.password) {
        data.password = await this.hashPassword(data.password);
      }
      return data;
      }],
    updating: [async (data: any) => {

      if (data.password && data.isDirtyField("password")) {
        data.password = await this.hashPassword(data.password);
      }
      return data;
      }]
  };
}




export class Users extends UsersModel {
  // Additional model methods and overrides can be added here
}

export default Users;