import * as ts from 'typescript';
import { readFileSync } from 'fs';
import type { Schema, FieldDefinition, SchemaConfig } from './types';

/**
 * Parser strategy interface
 */
export interface ISchemaParser {
  parseSchemas(filePath: string): Promise<Schema[]>;
}

/**
 * Main schema parser that wraps both AST and regex strategies
 */
export class SchemaParser implements ISchemaParser {
  private config: SchemaConfig;

  constructor(config: SchemaConfig) {
    this.config = config;
  }

  async parseSchemas(filePath: string): Promise<Schema[]> {
    const strategy = this.config.parsing?.strategy || 'regex';
    
    switch (strategy) {
      case 'ast':
        return this.parseWithAST(filePath);
      case 'regex':
      default:
        return this.parseWithRegex(filePath);
    }
  }

  private async parseWithAST(filePath: string): Promise<Schema[]> {
    try {
      const astParser = new ASTSchemaParser(this.config);
      return await astParser.parseSchemas(filePath);
    } catch (error) {
      if (this.config.dev?.logLevel !== 'silent') {
        console.error(`AST parsing failed for ${filePath}:`, error);
      }
      
      // Fallback to regex if enabled
      if (this.config.parsing?.fallbackToRegex) {
        if (this.config.dev?.logLevel === 'debug') {
          console.log(`Falling back to regex parsing for ${filePath}`);
        }
        return this.parseWithRegex(filePath);
      }
      
      return [];
    }
  }

  private async parseWithRegex(filePath: string): Promise<Schema[]> {
    const regexParser = new RegexSchemaParser(this.config);
    return await regexParser.parseSchemas(filePath);
  }
}

/**
 * Legacy regex-based parser for backward compatibility
 */
export class RegexSchemaParser implements ISchemaParser {
  constructor(private config: SchemaConfig) {}

  async parseSchemas(filePath: string): Promise<Schema[]> {
    try {
      const content = readFileSync(filePath, 'utf8');
      
      // Look for defineSchema calls
      const schemaMatches = content.match(/export\s+const\s+(\w+Schema)\s*=\s*defineSchema\s*\(\s*['"`](\w+)['"`]\s*,\s*\{([\s\S]*?)\}\s*(?:,\s*\{([\s\S]*?)\})?\s*\)/g);
      
      if (!schemaMatches) {
        if (this.config.dev?.logLevel === 'debug') {
          console.warn(`No schema definitions found in ${filePath}`);
        }
        return [];
      }
      
      const schemas: Schema[] = [];
      
      for (const match of schemaMatches) {
        const schema = this.parseSchemaFromMatch(match, filePath);
        if (schema) {
          schemas.push(schema);
        }
      }
      
      return schemas;
    } catch (error) {
      if (this.config.dev?.logLevel !== 'silent') {
        console.error(`Error parsing schema file ${filePath}:`, error);
      }
      return [];
    }
  }

  private parseSchemaFromMatch(match: string, filePath: string): Schema | null {
    try {
      const nameMatch = match.match(/defineSchema\s*\(\s*['"`](\w+)['"`]/);
      
      if (!nameMatch) {
        console.warn(`Could not extract schema name from ${filePath}`);
        return null;
      }
      
      const schemaName = nameMatch[1];
      
      // Extract fields and config using regex
      const fieldsMatch = match.match(/defineSchema\s*\([^,]+,\s*\{([\s\S]*?)\}(?:\s*,\s*\{([\s\S]*?)\})?\s*\)/);
      
      if (!fieldsMatch) {
        console.warn(`Could not extract fields from schema ${schemaName} in ${filePath}`);
        return null;
      }
      
      const fieldsContent = fieldsMatch[1];
      const configContent = fieldsMatch[2] || '';
      
      const schema: Schema = {
        name: schemaName,
        fields: this.extractFields(fieldsContent),
        config: this.extractConfig(configContent),
        filePath
      };
      
      return schema;
    } catch (error) {
      console.warn(`Error parsing schema match in ${filePath}:`, error);
      return null;
    }
  }

  private extractFields(fieldsContent: string): Record<string, any> {
    const fields: Record<string, any> = {};
    
    try {
      // Enhanced field extraction that handles nested objects
      let depth = 0;
      let currentField = '';
      let currentFieldName = '';
      let inString = false;
      let stringChar = '';
      let i = 0;
      
      while (i < fieldsContent.length) {
        const char = fieldsContent[i];
        
        // Handle string boundaries
        if (!inString && (char === '"' || char === "'" || char === '`')) {
          inString = true;
          stringChar = char;
        } else if (inString && char === stringChar && fieldsContent[i - 1] !== '\\') {
          inString = false;
          stringChar = '';
        }
        
        if (!inString) {
          if (char === '{') depth++;
          if (char === '}') depth--;
          
          // Field separator at root level
          if (depth === 0 && char === ',') {
            if (currentFieldName && currentField) {
              fields[currentFieldName] = this.parseFieldDefinition(currentField);
            }
            currentField = '';
            currentFieldName = '';
            i++;
            continue;
          }
          
          // Field name separator
          if (depth === 0 && char === ':' && !currentFieldName) {
            currentFieldName = currentField.trim();
            currentField = '';
            i++;
            continue;
          }
        }
        
        currentField += char;
        i++;
      }
      
      // Handle the last field
      if (currentFieldName && currentField) {
        fields[currentFieldName] = this.parseFieldDefinition(currentField);
      }
    } catch (error) {
      console.warn('Error extracting fields:', error);
    }
    
    return fields;
  }

  private parseFieldDefinition(fieldDef: string): any {
    const field: any = {};
    
    try {
      // Clean up the field definition
      fieldDef = fieldDef.trim().replace(/^\s*\{\s*/, '').replace(/\s*\}\s*$/, '');
      
      // Extract type
      const typeMatch = fieldDef.match(/type:\s*['"`](\w+)['"`]/);
      if (typeMatch) field.type = typeMatch[1];
      
      // Extract boolean properties
      const booleanProps = ['primary', 'required', 'unique', 'hidden', 'computed', 'optional'];
      for (const prop of booleanProps) {
        if (new RegExp(`${prop}:\\s*true`).test(fieldDef)) {
          field[prop] = true;
        }
      }
      
      // Extract numeric properties
      const lengthMatch = fieldDef.match(/length:\s*(\d+)/);
      if (lengthMatch) field.length = parseInt(lengthMatch[1]);
      
      // Extract default values
      const defaultMatch = fieldDef.match(/default:\s*([^,}]+)/);
      if (defaultMatch) {
        const defaultValue = defaultMatch[1].trim();
        if (defaultValue === 'true') field.default = true;
        else if (defaultValue === 'false') field.default = false;
        else if (/^\d+$/.test(defaultValue)) field.default = parseInt(defaultValue);
        else if (/^['"`](.*)['"`]$/.test(defaultValue)) {
          field.default = defaultValue.slice(1, -1);
        } else {
          field.default = defaultValue;
        }
      }
      
      // Extract arrays (like values for enums)
      const valuesMatch = fieldDef.match(/values:\s*\[([\s\S]*?)\]/);
      if (valuesMatch) {
        const valuesStr = valuesMatch[1].trim();

        // This regex handles quoted strings that may contain commas.
        const valueRegex = /(?:['"`])([^'"`]+)(?:['"`])/g;
         let match;
         const values = [];
         while ((match = valueRegex.exec(valuesStr)) !== null) {
           values.push(match[1]);
         }
         field.values = values;
       }
      
      // Extract validation object
      const validationMatch = fieldDef.match(/validation:\s*\{([^}]+)\}/);
      if (validationMatch) {
        field.validation = this.parseValidationObject(validationMatch[1]);
      }
      
      // Extract hash property
      const hashMatch = fieldDef.match(/hash:\s*['"`](\w+)['"`]/);
      if (hashMatch) field.hash = hashMatch[1];
      
    } catch (error) {
      console.warn(`Error parsing field definition: ${fieldDef}`, error);
    }
    
    return field;
  }

  private parseValidationObject(validationStr: string): any {
    const validation: any = {};
    
    try {
      // Parse min/max
      const minMatch = validationStr.match(/min:\s*(\d+)/);
      if (minMatch) validation.min = parseInt(minMatch[1]);
      
      const maxMatch = validationStr.match(/max:\s*(\d+)/);
      if (maxMatch) validation.max = parseInt(maxMatch[1]);
      
      // Parse message
      const messageMatch = validationStr.match(/message:\s*['"`]([^'"`]+)['"`]/);
      if (messageMatch) validation.message = messageMatch[1];
      
      // Parse boolean flags
      if (validationStr.includes('requireUppercase: true')) validation.requireUppercase = true;
      if (validationStr.includes('requireNumbers: true')) validation.requireNumbers = true;
    } catch (error) {
      console.warn('Error parsing validation object:', error);
    }
    
    return validation;
  }

  private extractConfig(configContent: string): any {
    const config: any = {
      timestamps: true, // default
      fillable: 'auto',
      hidden: 'auto'
    };
    
    if (!configContent.trim()) {
      return config;
    }
    
    try {
      // Parse basic config properties
      if (configContent.includes('timestamps: false')) config.timestamps = false;
      if (configContent.includes('softDeletes: true')) config.softDeletes = true;
      
      // Parse realtime config
      if (configContent.includes('realtime:')) {
        config.realtime = { enabled: true, events: [], channels: [] };
      }
      
      // Parse indexes
      const indexMatch = configContent.match(/indexes:\s*\[([\s\S]*?)\]/);
      if (indexMatch) {
        config.indexes = [];
        // Simple parsing for now - could be enhanced
      }
    } catch (error) {
      console.warn('Error parsing config:', error);
    }
    
    return config;
  }
}

/**
 * AST-based parser implementation
 */
export class ASTSchemaParser implements ISchemaParser {
  private sourceFile: ts.SourceFile | null = null;
  private checker: ts.TypeChecker | null = null;
  private filePath: string = '';

  constructor(private config: SchemaConfig) {}

  async parseSchemas(filePath: string): Promise<Schema[]> {
    this.filePath = filePath;
    
    try {
      const fileContent = readFileSync(filePath, 'utf-8');
      
      // Create a simple source file without a full program to avoid module resolution issues
      this.sourceFile = ts.createSourceFile(
        filePath,
        fileContent,
        ts.ScriptTarget.ES2020,
        true,
        ts.ScriptKind.TS
      );

      if (!this.sourceFile) {
        throw new Error(`Could not parse file: ${filePath}`);
      }

      return this.extractSchemas();
    } catch (error) {
      console.warn(`Failed to parse schema file ${filePath}:`, error);
      
      // Fallback to regex if enabled
      if (this.config.parsing?.fallbackToRegex) {
        if (this.config.dev?.logLevel === 'debug') {
          console.log(`Falling back to regex parsing for ${filePath}`);
        }
        const regexParser = new RegexSchemaParser(this.config);
        return await regexParser.parseSchemas(filePath);
      }
      
      return [];
    }
  }

  /**
   * Extract schema definitions from the AST
   */
  private extractSchemas(): Schema[] {
    if (!this.sourceFile) return [];

    const schemas: Schema[] = [];

    const visit = (node: ts.Node) => {
      // Look for variable declarations with defineSchema calls
      if (ts.isVariableDeclaration(node) && node.initializer) {
        const schema = this.parseSchemaDeclaration(node);
        if (schema) {
          schemas.push(schema);
        }
      }

      ts.forEachChild(node, visit);
    };

    ts.forEachChild(this.sourceFile, visit);
    return schemas;
  }

  /**
   * Parse a schema declaration node
   */
  private parseSchemaDeclaration(node: ts.VariableDeclaration): Schema | null {
    if (!node.initializer || !ts.isCallExpression(node.initializer)) {
      return null;
    }

    const callExpr = node.initializer;
    
    // Check if it's a defineSchema call
    if (!this.isDefineSchemaCall(callExpr)) {
      return null;
    }

    const args = callExpr.arguments;
    if (args.length < 2) {
      return null;
    }

    try {
      // Extract schema name from first argument
      const nameArg = args[0];
      const schemaName = this.extractStringLiteral(nameArg);
      if (!schemaName) {
        return null;
      }

      // Extract fields from second argument
      const fieldsArg = args[1];
      const fields = this.parseFieldsObject(fieldsArg);

      // Extract config from third argument (optional)
      const configArg = args[2];
      const config = configArg ? this.parseConfigObject(configArg) : {};

      return {
        name: schemaName,
        fields,
        config,
        filePath: this.filePath
      };
    } catch (error) {
      console.warn(`Error parsing schema declaration in ${this.filePath}:`, error);
      return null;
    }
  }

  /**
   * Check if a call expression is a defineSchema call
   */
  private isDefineSchemaCall(callExpr: ts.CallExpression): boolean {
    const expression = callExpr.expression;
    
    if (ts.isIdentifier(expression)) {
      return expression.text === 'defineSchema';
    }
    
    if (ts.isPropertyAccessExpression(expression)) {
      return ts.isIdentifier(expression.name) && expression.name.text === 'defineSchema';
    }
    
    return false;
  }

  /**
   * Extract string literal value
   */
  private extractStringLiteral(node: ts.Node): string | null {
    if (ts.isStringLiteral(node)) {
      return node.text;
    }
    return null;
  }

  /**
   * Parse fields object literal
   */
  private parseFieldsObject(node: ts.Node): Record<string, FieldDefinition> {
    const fields: Record<string, FieldDefinition> = {};

    if (!ts.isObjectLiteralExpression(node)) {
      return fields;
    }

    for (const property of node.properties) {
      if (ts.isPropertyAssignment(property) && ts.isIdentifier(property.name)) {
        const fieldName = property.name.text;
        const fieldDef = this.parseFieldDefinition(property.initializer);
        if (fieldDef) {
          fields[fieldName] = fieldDef;
        }
      }
    }

    return fields;
  }

  /**
   * Parse a field definition object
   */
  private parseFieldDefinition(node: ts.Node): FieldDefinition | null {
    if (!ts.isObjectLiteralExpression(node)) {
      return null;
    }

    const fieldDef: Partial<FieldDefinition> = {};

    for (const property of node.properties) {
      if (ts.isPropertyAssignment(property) && ts.isIdentifier(property.name)) {
        const propName = property.name.text;
        const value = this.parsePropertyValue(property.initializer);

        switch (propName) {
          case 'type':
            if (typeof value === 'string') {
              fieldDef.type = value as any;
            }
            break;
          case 'primary':
          case 'required':
          case 'unique':
          case 'hidden':
          case 'computed':
          case 'optional':
            if (typeof value === 'boolean') {
              (fieldDef as any)[propName] = value;
            }
            break;
          case 'length':
            if (typeof value === 'number') {
              fieldDef.length = value;
            }
            break;
          case 'default':
            fieldDef.default = value;
            break;
          case 'values':
            if (Array.isArray(value)) {
              fieldDef.values = value as string[];
            }
            break;
          case 'validation':
            if (typeof value === 'object' && value !== null) {
              fieldDef.validation = value;
            }
            break;
          case 'hash':
            if (typeof value === 'string') {
              fieldDef.hash = value as 'bcrypt' | 'argon2';
            }
            break;
          case 'storage':
            if (typeof value === 'object' && value !== null) {
              fieldDef.storage = value as any;
            }
            break;
          case 'get':
            // For computed properties, we'll store the function as text
            if (ts.isFunctionExpression(property.initializer) || ts.isArrowFunction(property.initializer)) {
              fieldDef.get = this.extractFunctionText(property.initializer);
            }
            break;
        }
      }
    }

    // Ensure type is present
    if (!fieldDef.type) {
      return null;
    }

    return fieldDef as FieldDefinition;
  }

  /**
   * Parse config object literal
   */
  private parseConfigObject(node: ts.Node): Partial<SchemaConfig> {
    const config: Partial<SchemaConfig> = {};

    if (!ts.isObjectLiteralExpression(node)) {
      return config;
    }

    for (const property of node.properties) {
      if (ts.isPropertyAssignment(property) && ts.isIdentifier(property.name)) {
        const propName = property.name.text;
        const value = this.parsePropertyValue(property.initializer);

        switch (propName) {
          case 'timestamps':
          case 'softDeletes':
            if (typeof value === 'boolean') {
              (config as any)[propName] = value;
            }
            break;
          case 'indexes':
            if (Array.isArray(value)) {
              config.indexes = value;
            }
            break;
          case 'fillable':
          case 'hidden':
            if (typeof value === 'string' || Array.isArray(value)) {
              (config as any)[propName] = value;
            }
            break;
          case 'validation':
            if (typeof value === 'object' && value !== null) {
              config.validation = value;
            }
            break;
          case 'realtime':
            if (typeof value === 'object' && value !== null) {
              config.realtime = value;
            }
            break;
        }
      }
    }

    return config;
  }

  /**
   * Parse property value from AST node
   */
  private parsePropertyValue(node: ts.Node): any {
    if (ts.isStringLiteral(node)) {
      return node.text;
    }
    
    if (ts.isNumericLiteral(node)) {
      return Number(node.text);
    }
    
    if (node.kind === ts.SyntaxKind.TrueKeyword) {
      return true;
    }
    
    if (node.kind === ts.SyntaxKind.FalseKeyword) {
      return false;
    }
    
    if (node.kind === ts.SyntaxKind.NullKeyword) {
      return null;
    }
    
    if (ts.isArrayLiteralExpression(node)) {
      return node.elements.map(element => this.parsePropertyValue(element));
    }
    
    if (ts.isObjectLiteralExpression(node)) {
      const obj: any = {};
      for (const property of node.properties) {
        if (ts.isPropertyAssignment(property) && ts.isIdentifier(property.name)) {
          obj[property.name.text] = this.parsePropertyValue(property.initializer);
        }
      }
      return obj;
    }
    
    // For template literals, identifiers, etc., return string representation
    if (ts.isTemplateExpression(node) || ts.isIdentifier(node) || ts.isCallExpression(node)) {
      return node.getText(this.sourceFile);
    }
    
    return undefined;
  }

  /**
   * Extract function text for computed properties
   */
  private extractFunctionText(node: ts.FunctionExpression | ts.ArrowFunction): any {
    // Return a simple representation for now
    // In a full implementation, we might evaluate or transform the function
    return node.getText(this.sourceFile);
  }
}

/**
 * Parser factory that creates the appropriate parser based on configuration
 */
export class ParserFactory {
  static createParser(config: SchemaConfig): ISchemaParser {
    const strategy = config.parsing?.strategy || 'regex'; // Default to regex
    
    switch (strategy) {
      case 'ast':
        return new ASTSchemaParser(config);
      case 'regex':
      default:
        return new RegexSchemaParser(config);
    }
  }
}
