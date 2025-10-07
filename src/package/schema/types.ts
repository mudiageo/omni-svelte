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
  path?: string;
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

export interface SchemaDefinitionConfig {
  timestamps?: boolean;
  softDeletes?: boolean;
  indexes?: (string | string[] | { fields: string[]; type?: string, unique?: boolean })[];
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
  config: SchemaDefinitionConfig;
  filePath?: string; // Added for file-based schema discovery
}
export interface GeneratedSchema {
  name: string;
  fields: Record<string, FieldDefinition>;
  config: SchemaDefinitionConfig;
  drizzle: ReturnType<typeof generateDrizzleSchema>;
  zod: ReturnType<typeof generateZodSchemas>;
  model: ReturnType<typeof generateModel>;
}


interface SchemaConfig {
  /**
   * Core generation strategy
   * - 'files': Generate physical files during development and build
   * - 'runtime': Generate schemas as runtime objects only
   * - 'hybrid': Files in development, runtime objects in production
   */
  mode: 'files' | 'runtime' | 'hybrid';

  /**
   * Schema discovery configuration
   */
  input: {
    /** Glob patterns to find schema definition files */
    patterns?: string[];
    /** Patterns to exclude from discovery */
    exclude?: string[];
    /** Explicit list of schema files (alternative to patterns) */
    files?: string[];
  };

  /**
   * Output configuration for file generation modes
   */
  output?: {
    /** Base directory for generated files */
    directory?: string;
    
    /** Drizzle schema output configuration */
    drizzle?: OutputTarget;
    
    /** Zod schema output configuration */
    zod?: OutputTarget;
    
    /** Model output configuration */
    model?: OutputTarget & {
      /** Include TypeScript type definitions */
      includeTypes?: boolean;
      /** Include CRUD method implementations */
      includeCrud?: boolean;
    };
    
    /** TypeScript type definitions output */
    types?: OutputTarget;
  };

  /**
   * Schema parsing configuration
   */
  parsing?: {
    /** Schema parsing strategy */
    strategy?: 'regex' | 'ast';
    /** Fallback to regex if AST parsing fails */
    fallbackToRegex?: boolean;
    /** Enable strict parsing validation */
    strict?: boolean;
  };

  /**
   * Development experience settings
   */
  dev?: {
    /** Watch schema files for changes */
    watch?: boolean;
    /** Enable hot module reloading */
    hotReload?: boolean;
    /** Generate schemas on development server start */
    generateOnStart?: boolean;
    /** Logging verbosity */
    logLevel?: 'silent' | 'error' | 'warn' | 'info' | 'debug';
  };

  /**
   * Production build optimizations
   */
  build?: {
    /** Switch to runtime mode in production (hybrid mode only) */
    useRuntime?: boolean;
    /** Tree shake unused schemas */
    treeShake?: boolean;
    /** Minify generated code */
    minify?: boolean;
    /** Bundle all schemas into single module */
    bundle?: boolean;
  };

  /**
   * Code generation options
   */
  generation?: {
    /** TypeScript compilation settings */
    typescript?: {
      strict?: boolean;
      declaration?: boolean;
      target?: 'ES5' | 'ES2015' | 'ES2017' | 'ES2018' | 'ES2019' | 'ES2020' | 'ES2021' | 'ES2022' | 'ESNext';
    };
    
    /** Drizzle-specific generation options */
    drizzle?: {
      /** Database dialect */
      dialect?: 'postgresql' | 'mysql' | 'sqlite';
      /** Generate relation definitions */
      relations?: boolean;
      /** Generate index definitions */
      indexes?: boolean;
    };
    
    /** Zod-specific generation options */
    zod?: {
      /** Include custom error maps */
      errorMap?: boolean;
      /** Include transform functions */
      transforms?: boolean;
      /** Include refinement validations */
      refinements?: boolean;
    };
    
    /** Model-specific generation options */
    model?: {
      /** CRUD operations to generate */
      crud?: {
        create?: boolean;
        read?: boolean;
        update?: boolean;
        delete?: boolean;
        list?: boolean;
      };
      /** Validation integration strategy */
      validation?: 'auto' | 'manual' | 'disabled';
      /** Serialization method */
      serialization?: 'json' | 'custom';
    };
  };

  /**
   * Plugin system for extensibility
   */
  plugins?: (string | PluginDefinition)[];

  /**
   * Runtime behavior configuration
   */
  runtime?: {
    /** Lazy load schemas on demand */
    lazy?: boolean;
    /** Cache compiled schemas in memory */
    cache?: boolean;
    /** Enable development tools and debugging */
    devTools?: boolean;
  };
}

/**
 * Output target configuration for generated files
 */
interface OutputTarget {
  /** Output file or directory path */
  path?: string;
  /** File organization strategy */
  format?: 'single-file' | 'per-schema' | 'grouped';
  /** Naming convention for generated identifiers */
  naming?: 'camelCase' | 'snake_case' | 'PascalCase';
  /** Export strategy */
  exports?: 'named' | 'default';
}

/**
 * Plugin definition for extending generation capabilities
 */
interface PluginDefinition {
  /** Plugin name or identifier */
  name: string;
  /** Plugin configuration options */
  options?: Record<string, any>;
  /** Plugin implementation or path to plugin module */
  plugin: string | PluginImplementation;
}

/**
 * Plugin implementation interface
 */
interface PluginImplementation {
  /** Plugin initialization */
  setup?(config: SchemaConfig): void | Promise<void>;
  /** Transform schema definition */
  transformSchema?(schema: any): any | Promise<any>;
  /** Generate additional output */
  generate?(schemas: any[]): GeneratedOutput[] | Promise<GeneratedOutput[]>;
  /** Post-generation hook */
  afterGenerate?(outputs: GeneratedOutput[]): void | Promise<void>;
}

/**
 * Generated output representation
 */
interface GeneratedOutput {
  /** Output file path */
  path: string;
  /** Generated content */
  content: string;
  /** Content type */
  type: 'drizzle' | 'zod' | 'model' | 'types' | 'custom';
}

/**
 * Default configuration factory
 */
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * User-provided configuration (all optional with defaults)
 */
type UserSchemaConfig = DeepPartial<SchemaConfig> & {
  mode?: SchemaConfig['mode'];
};

export type {
  SchemaConfig,
  OutputTarget,
  PluginDefinition,
  PluginImplementation,
  GeneratedOutput,
  UserSchemaConfig
};