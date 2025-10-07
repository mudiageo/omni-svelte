import { defineSchema } from '$pkg/schema'

export const userSchema = defineSchema('users', {
  id: {
    type: 'serial',
    primary: true,
  },
  
  name: {
    type: 'string',
    length: 255,
    required: true,
    validation: {
      min: 2,
      max: 100,
      message: 'Name must be between 2-100 characters'
    },
  },
  
  email: {
    type: 'email',
    unique: true,
    required: true,
  },
  
  password: {
    type: 'password',
    required: true,
    validation: {
      min: 8,
      requireUppercase: true,
      requireNumbers: true
    },
    hidden: true,
    hash: 'bcrypt',
  },
  
  // avatar: {
  //   type: 'url',
  //   optional: true,
  //   storage: { type: 'local', path: 'avatars' },
  // },
  
  // settings: {
  //   type: 'json',
  //   default: {},
  //   validation: {
  //     theme: 'string?',
  //     notifications: 'boolean?',
  //     language: { enum: ['en', 'es', 'fr'] }
  //   },
  // },
  
  // status: {
  //   type: 'enum',
  //   values: ['active', 'inactive', 'suspended'],
  //   default: 'active',
  // },
  active: {
    type: 'boolean',
    default: true
  },
  
  fullName: {
    type: 'string',
    computed: true,
    get: (record) => `${record.firstName} ${record.lastName}`.trim(),
  },
}, {
  timestamps: true,
  indexes: ['email', ['name', 'active']],
  fillable: 'auto',
  hidden: 'auto',
  validation: {
    onCreate: ['name', 'email', 'password'],
  },
  realtime: {
    enabled: true,
    events: ['created', 'updated'],
    channels: (user) => [`users`, `user:${user.id}`]
  }
});

export const User = userSchema.model;
