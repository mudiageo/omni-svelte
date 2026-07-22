
export const userSchema = defineSchema('users', {
  id: {
    type: 'serial',
    primary: true,
  },
  name: {
    type: 'string',
    required: true,
    length: 100,
  },
  email: {
    type: 'email',
    unique: true,
  },
  active: {
    type: 'boolean',
    default: true,
  },
}, {
  timestamps: true,
  softDeletes: false,
});
