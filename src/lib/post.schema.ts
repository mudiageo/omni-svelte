import { defineSchema } from '$pkg/schema'

export const postSchema = defineSchema('posts', {
  id: {
    type: 'serial',
    primary: true,
  },
  
  title: {
    type: 'string',
    length: 255,
    required: true,
    validation: {
      min: 5,
      max: 255,
      message: 'Title must be between 5-255 characters'
    },
  },
  
  slug: {
    type: 'slug',
    unique: true,
    required: true,
  },
  
  content: {
    type: 'richtext',
    required: true,
  },
  
  published: {
    type: 'boolean',
    default: false
  },
  
  userId: {
    type: 'integer',
    required: true,
    relationship: {
      type: 'belongsTo',
      model: 'User',
      foreignKey: 'userId',
      onDelete: 'cascade'
    }
  }
}, {
  timestamps: true,
  indexes: ['slug', 'published', ['userId', 'published']],
  fillable: 'auto',
  hidden: 'auto',
  validation: {
    onCreate: ['title', 'content', 'userId'],
    onUpdate: ['title', 'content'],
  }
});

export const Post = postSchema.model;
