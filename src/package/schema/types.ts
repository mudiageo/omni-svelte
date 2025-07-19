import type { generateDrizzleSchema } from './generators/drizzle';
import type { generateZodSchemas } from './generators/zod';
import type { generateModel } from './generators/model';
import type { Relationship } from '../database/relationships';

export type FieldType = 
  | 'string' | 'integer' | 'boolean' | 'date' | 'timestamp' | 'json' | 'enum' | 'serial'
  | 'email' | 'password' | 'url' | 'money' | 'slug' | 'files' | 'richtext' | 'array' | 'belongsTo' | 'datetime' | 'unsigned' | `enum:${string}`;

export interface FieldDefinition {
  type: FieldType;
  primary?: boolean;
  length?: number;
  required?: boolean;
  unique?: boolean;
  default?: any;
  optional?: boolean;
  hidden?: boolean;
  hash?: boolean | 'bcrypt' | 'argon2'; // for passwords
  defaultValue?: any; // for serials, can be a function like () => Date
  storage?: StorageConfig;
  values?: string[]; // for enums
  unsigned?: boolean;
  validation?: ValidationRules;
  computed?: boolean;
  get?: (record: any) => any;
  relationship?: Relationship;

}
export interface StorageConfig {
  type?: 'local' | 's3' | 'gcs';
  options?: {
    bucket?: string;
    region?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  };
}

export interface ValidationRules {
  min?: number | string;
  max?: number | string;
  message?: string;
  requireUppercase?: boolean;
  requireNumbers?: boolean;
  [key: string]: any;
}

export interface SchemaConfig {
  timestamps?: boolean;
  softDeletes?: boolean;
  indexes?: (string | string[] | { fields: string[]; type?: string })[];
  fillable?: 'auto' | string[];
  hidden?: 'auto' | string[];
  validation?: {
    onCreate?: string[];
    onUpdate?: string[];
  };
  realtime?: {
    enabled: boolean;
    events?: ('created' | 'deleted' | 'updated' | string)[];
    channels?: (record: any) => string[];
  };
}

export interface Schema {
  name: string;
  fields: Record<string, FieldDefinition>;
  config: SchemaConfig;
}
export interface GeneratedSchema {
  name: string;
  fields: Record<string, FieldDefinition>;
  config: SchemaConfig;
  drizzle: ReturnType<typeof generateDrizzleSchema>;
  zod: ReturnType<typeof generateZodSchemas>;
  model: ReturnType<typeof generateModel>;
}
