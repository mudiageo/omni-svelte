import { describe, it, expect, beforeEach } from 'vitest';
import { RegexSchemaParser, ASTSchemaParser, ParserFactory } from '../../package/schema/parser';
import type { SchemaConfig } from '../../package/schema/types';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const TEST_DIR = join(process.cwd(), 'test-schemas');

describe('Schema Parsing Strategies', () => {
  let regexConfig: SchemaConfig;
  let astConfig: SchemaConfig;
  
  beforeEach(() => {
    // Clean up test directory
    try {
      rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {}
    
    mkdirSync(TEST_DIR, { recursive: true });
    
    // Base config for testing
    const baseConfig = {
      mode: 'files' as const,
      input: { patterns: ['**/*.schema.ts'] },
      parsing: {
        fallbackToRegex: true,
        strict: false
      },
      dev: { logLevel: 'silent' as const }
    };
    
    regexConfig = {
      ...baseConfig,
      parsing: { ...baseConfig.parsing, strategy: 'regex' as const }
    };
    
    astConfig = {
      ...baseConfig,
      parsing: { ...baseConfig.parsing, strategy: 'ast' as const }
    };
  });

  describe('ParserFactory', () => {
    it('should create regex parser by default', () => {
      const config = { ...regexConfig };
      delete config.parsing?.strategy;
      
      const parser = ParserFactory.createParser(config);
      expect(parser).toBeInstanceOf(RegexSchemaParser);
    });

    it('should create regex parser when specified', () => {
      const parser = ParserFactory.createParser(regexConfig);
      expect(parser).toBeInstanceOf(RegexSchemaParser);
    });

    it('should create AST parser when specified', () => {
      const parser = ParserFactory.createParser(astConfig);
      expect(parser).toBeInstanceOf(ASTSchemaParser);
    });
  });

  describe('Regex Parser', () => {
    let parser: RegexSchemaParser;
    
    beforeEach(() => {
      parser = new RegexSchemaParser(regexConfig);
    });

    it('should parse simple schema definition', async () => {
      const schemaContent = `
import { defineSchema } from 'omni-svelte';

export const userSchema = defineSchema('users', {
  id: {
    type: 'serial',
    primary: true,
  },
  name: {
    type: 'string',
    required: true,
    length: 255,
  },
  email: {
    type: 'email',
    unique: true,
  },
}, {
  timestamps: true,
  softDeletes: false,
});
`;
      
      const filePath = join(TEST_DIR, 'user.schema.ts');
      writeFileSync(filePath, schemaContent);
      
      const schemas = await parser.parseSchemas(filePath);
      
      expect(schemas).toHaveLength(1);
      expect(schemas[0].name).toBe('users');
      expect(schemas[0].fields.id.type).toBe('serial');
      expect(schemas[0].fields.id.primary).toBe(true);
      expect(schemas[0].fields.name.type).toBe('string');
      expect(schemas[0].fields.name.required).toBe(true);
      expect(schemas[0].fields.name.length).toBe(255);
      expect(schemas[0].fields.email.type).toBe('email');
      expect(schemas[0].fields.email.unique).toBe(true);
      expect(schemas[0].config.timestamps).toBe(true);
    });

    it('should parse schema with validation rules', async () => {
      const schemaContent = `
export const userSchema = defineSchema('users', {
  password: {
    type: 'password',
    required: true,
    validation: {
      min: 8,
      requireUppercase: true,
      requireNumbers: true,
      message: 'Password must be strong'
    },
    hash: 'bcrypt',
  },
  status: {
    type: 'enum',
    values: ['active', 'inactive', 'suspended'],
    default: 'active',
  },
}, {
  timestamps: true,
});
`;
      
      const filePath = join(TEST_DIR, 'user-validation.schema.ts');
      writeFileSync(filePath, schemaContent);
      
      const schemas = await parser.parseSchemas(filePath);
      
      expect(schemas).toHaveLength(1);
      expect(schemas[0].fields.password.validation.min).toBe(8);
      expect(schemas[0].fields.password.validation.requireUppercase).toBe(true);
      expect(schemas[0].fields.password.validation.requireNumbers).toBe(true);
      expect(schemas[0].fields.password.hash).toBe('bcrypt');
      expect(schemas[0].fields.status.values).toEqual(['active', 'inactive', 'suspended']);
      expect(schemas[0].fields.status.default).toBe('active');
    });

    it('should handle multiple schemas in one file', async () => {
      const schemaContent = `
export const userSchema = defineSchema('users', {
  id: { type: 'serial', primary: true },
}, {});

export const postSchema = defineSchema('posts', {
  id: { type: 'serial', primary: true },
  title: { type: 'string', required: true },
}, {});
`;
      
      const filePath = join(TEST_DIR, 'multiple.schema.ts');
      writeFileSync(filePath, schemaContent);
      
      const schemas = await parser.parseSchemas(filePath);
      
      expect(schemas).toHaveLength(2);
      expect(schemas.map(s => s.name)).toEqual(['users', 'posts']);
    });

    it('should return empty array for files without schemas', async () => {
      const nonSchemaContent = `
export const someConstant = 'value';
export function someFunction() {}
`;
      
      const filePath = join(TEST_DIR, 'no-schema.ts');
      writeFileSync(filePath, nonSchemaContent);
      
      const schemas = await parser.parseSchemas(filePath);
      
      expect(schemas).toHaveLength(0);
    });
  });

  describe('AST Parser', () => {
    let parser: ASTSchemaParser;
    
    beforeEach(() => {
      parser = new ASTSchemaParser(astConfig);
    });

    it('should parse simple schema definition', async () => {
      const schemaContent = `
import { defineSchema } from 'omni-svelte';

export const userSchema = defineSchema('users', {
  id: {
    type: 'serial',
    primary: true,
  },
  name: {
    type: 'string',
    required: true,
    length: 255,
  },
}, {
  timestamps: true,
});
`;
      
      const filePath = join(TEST_DIR, 'user-ast.schema.ts');
      writeFileSync(filePath, schemaContent);
      
      const schemas = await parser.parseSchemas(filePath);
      
      expect(schemas).toHaveLength(1);
      expect(schemas[0].name).toBe('users');
      expect(schemas[0].fields.id.type).toBe('serial');
      expect(schemas[0].fields.name.type).toBe('string');
    });

    it('should fallback to regex when AST parsing fails', async () => {
      // Malformed TypeScript that AST can't parse but regex might handle
      const malformedContent = `
export const userSchema = defineSchema('users', {
  id: { type: 'serial', primary: true ],  // Syntax error
}, {});
`;
      
      const filePath = join(TEST_DIR, 'malformed.schema.ts');
      writeFileSync(filePath, malformedContent);
      
      const schemas = await parser.parseSchemas(filePath);
      
      // Should still get results thanks to fallback
      expect(schemas).toHaveLength(1);
      expect(schemas[0].name).toBe('users');
    });
  });

  describe('Parser Comparison', () => {
    it('should produce similar results for well-formed schemas', async () => {
      const schemaContent = `
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
`;
      
      const filePath = join(TEST_DIR, 'comparison.schema.ts');
      writeFileSync(filePath, schemaContent);
      
      const regexParser = new RegexSchemaParser(regexConfig);
      const astParser = new ASTSchemaParser(astConfig);
      
      const regexResults = await regexParser.parseSchemas(filePath);
      const astResults = await astParser.parseSchemas(filePath);
      
      expect(regexResults).toHaveLength(1);
      expect(astResults).toHaveLength(1);
      
      const regexSchema = regexResults[0];
      const astSchema = astResults[0];
      
      expect(regexSchema.name).toBe(astSchema.name);
      expect(Object.keys(regexSchema.fields)).toEqual(Object.keys(astSchema.fields));
      
      // Compare key field properties
      expect(regexSchema.fields.id.type).toBe(astSchema.fields.id.type);
      expect(regexSchema.fields.name.length).toBe(astSchema.fields.name.length);
      expect(regexSchema.fields.email.unique).toBe(astSchema.fields.email.unique);
    });
  });
});
