import { Model } from '../package/database/model';
import { posts } from './db/server/schema';
import { postsCreateSchema, postsUpdateSchema } from './posts.validation';
import type { Posts as PostsType, NewPosts as NewPostsType } from './db/server/schema';

export class PostsModel extends Model {
  static tableName = 'posts';
  static table = posts;
  static createSchema = postsCreateSchema;
  static updateSchema = postsUpdateSchema;
  
  static fillable = ['title', 'slug', 'content', 'published', 'userId'];
  static hidden = [];
  static casts = { published: 'boolean' as const };
}

export class Posts extends PostsModel {
  // Additional model methods and overrides can be added here
}

export default Posts;