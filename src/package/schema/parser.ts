import fs from 'fs';
import path from 'path';
// import { glob } from 'glob'; // Will need to be installed
import type { Schema } from './types';

export class SchemaParser {
  private config: any;

  constructor(config?: any) {
    this.config = config || this.loadConfigFromSvelteConfig();
  }

  private loadConfigFromSvelteConfig(): any {
    try {
      // Try to load svelte.config.js
      const configPath = path.resolve('./svelte.config.js');
      if (fs.existsSync(configPath)) {
        // For now, return the embedded config since dynamic import is complex
        return {
          input: {
            patterns: ['src/**/*.schema.ts'],
            exclude: ['**/node_modules/**']
          },
          output: {
            drizzle: { path: './src/lib/db/server/schema.ts', format: 'single-file' },
            zod: { path: './src/lib/validation', format: 'per-schema' },
            model: { path: './src/lib/models', format: 'per-schema' }
          }
        };
      }
    } catch (error) {
      console.warn('Could not load svelte.config.js:', error.message);
    }
    
    // Default config
    return {
      input: {
        patterns: ['src/**/*.schema.ts'],
        exclude: ['**/node_modules/**']
      },
      output: {
        drizzle: { path: './src/lib/db/server/schema.ts', format: 'single-file' },
        zod: { path: './src/lib/validation', format: 'per-schema' },
        model: { path: './src/lib/models', format: 'per-schema' }
      }
    };
  }

  async discoverAndParseSchemas(basePath?: string): Promise<Schema[]> {
    const patterns = this.config.input?.patterns || ['src/**/*.schema.ts'];
    
    console.log('🔍 Discovering schemas with patterns:', patterns);
    
    const schemaFiles: string[] = [];
    
    // Simple file discovery for now (replace with glob later)
    for (const pattern of patterns) {
      const files = this.findSchemaFiles(basePath || process.cwd(), pattern);
      schemaFiles.push(...files);
    }
    
    console.log(`📄 Found ${schemaFiles.length} schema files:`, schemaFiles);
    
    const schemas: Schema[] = [];
    const schemaNames = new Set<string>();
    
    for (const file of schemaFiles) {
      try {
        const fullPath = path.resolve(basePath || process.cwd(), file);
        const schema = await this.parseSchemaFile(fullPath);
        
        if (schema) {
          // Handle duplicate schema names
          if (schemaNames.has(schema.name)) {
            console.warn(`⚠️  Duplicate schema name "${schema.name}" found in ${file}. Skipping...`);
            continue;
          }
          
          schemaNames.add(schema.name);
          schemas.push(schema);
          console.log(`✅ Parsed schema: ${schema.name} from ${file}`);
        }
      } catch (error) {
        console.error(`❌ Error parsing ${file}:`, error.message);
      }
    }
    
    return schemas;
  }

  private findSchemaFiles(basePath: string, pattern: string): string[] {
    const files: string[] = [];
    
    // Simple recursive search for .schema.ts files
    const searchDir = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.lstatSync(fullPath);
        
        if (stat.isDirectory() && !item.includes('node_modules')) {
          searchDir(fullPath);
        } else if (item.endsWith('.schema.ts')) {
          const relativePath = path.relative(basePath, fullPath);
          files.push(relativePath);
        }
      }
    };
    
    searchDir(basePath);
    return files;
  }

  private async parseSchemaFile(filePath: string): Promise<Schema | null> {
    try {
      // Read the file content
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Look for defineSchema calls
      const schemaMatches = content.match(/export\s+const\s+(\w+Schema)\s*=\s*defineSchema\s*\(\s*['"`](\w+)['"`]\s*,\s*\{([\s\S]*?)\}\s*(?:,\s*\{([\s\S]*?)\})?\s*\)/g);
      
      if (!schemaMatches) {
        console.warn(`No schema definitions found in ${filePath}`);
        return null;
      }
      
      // Parse the first schema found (handle multiple later)
      const match = schemaMatches[0];
      const nameMatch = match.match(/defineSchema\s*\(\s*['"`](\w+)['"`]/);
      
      if (!nameMatch) {
        console.warn(`Could not extract schema name from ${filePath}`);
        return null;
      }
      
      const schemaName = nameMatch[1];
      
      // For now, create a basic schema structure
      // In a real implementation, you'd parse the actual field definitions
      const schema: Schema = {
        name: schemaName,
        fields: this.extractFields(content, schemaName),
        config: this.extractConfig(content, schemaName)
      };
      
      return schema;
      
    } catch (error) {
      console.error(`Error reading schema file ${filePath}:`, error);
      return null;
    }
  }

  private extractFields(content: string, schemaName: string): Record<string, any> {
    // Enhanced field extraction that handles the actual defineSchema format
    const fields: Record<string, any> = {};
    
    // Look for the schema definition
    const schemaRegex = new RegExp(`defineSchema\\s*\\(\\s*['"\`]${schemaName}['"\`]\\s*,\\s*\\{([\\s\\S]*?)\\}(?:\\s*,|\\s*\\))`);
    const schemaMatch = content.match(schemaRegex);
    
    if (!schemaMatch) {
      console.warn(`Could not find schema definition for ${schemaName}`);
      return this.extractFieldsLegacy(content);
    }
    
    const fieldsContent = schemaMatch[1];
    
    // Parse field definitions more carefully
    // Handle nested objects and complex field definitions
    let depth = 0;
    let currentField = '';
    let currentFieldName = '';
    let inString = false;
    let stringChar = '';
    
    for (let i = 0; i < fieldsContent.length; i++) {
      const char = fieldsContent[i];
      const nextChar = fieldsContent[i + 1];
      
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
        
        if (depth === 0 && char === ',') {
          // End of field definition
          if (currentFieldName && currentField) {
            fields[currentFieldName] = this.parseFieldDefinition(currentField);
          }
          currentField = '';
          currentFieldName = '';
        } else if (depth === 0 && char === ':' && !currentFieldName) {
          // Field name
          currentFieldName = currentField.trim();
          currentField = '';
        } else {
          currentField += char;
        }
      } else {
        currentField += char;
      }
    }
    
    // Handle the last field
    if (currentFieldName && currentField) {
      fields[currentFieldName] = this.parseFieldDefinition(currentField);
    }
    
    return fields;
  }

  private parseFieldDefinition(fieldDef: string): any {
    const field: any = {};
    
    try {
      // Remove extra whitespace and clean up
      fieldDef = fieldDef.trim().replace(/^\s*\{\s*/, '').replace(/\s*\}\s*$/, '');
      
      // Extract type
      const typeMatch = fieldDef.match(/type:\s*['"`](\w+)['"`]/);
      if (typeMatch) field.type = typeMatch[1];
      
      // Extract boolean properties
      if (fieldDef.includes('primary: true')) field.primary = true;
      if (fieldDef.includes('required: true')) field.required = true;
      if (fieldDef.includes('unique: true')) field.unique = true;
      if (fieldDef.includes('hidden: true')) field.hidden = true;
      if (fieldDef.includes('computed: true')) field.computed = true;
      
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
        }
      }
      
      // Extract validation object
      const validationMatch = fieldDef.match(/validation:\s*\{([^}]+)\}/);
      if (validationMatch) {
        field.validation = this.parseValidationObject(validationMatch[1]);
      }
      
    } catch (error) {
      console.warn(`Error parsing field definition: ${fieldDef}`, error);
    }
    
    return field;
  }

  private parseValidationObject(validationStr: string): any {
    const validation: any = {};
    
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
    
    return validation;
  }

  private extractFieldsLegacy(content: string): Record<string, any> {
    // Fallback to simple field extraction
    const fields: Record<string, any> = {};
    
    // Look for field patterns like: fieldName: { type: 'string', ... }
    const fieldMatches = content.match(/(\w+):\s*\{([^}]+)\}/g);
    
    if (fieldMatches) {
      for (const fieldMatch of fieldMatches) {
        const [, fieldName, fieldDef] = fieldMatch.match(/(\w+):\s*\{([^}]+)\}/) || [];
        if (fieldName && fieldDef) {
          fields[fieldName] = this.parseFieldDefinition(`{${fieldDef}}`);
        }
      }
    }
    
    return fields;
  }

  private extractConfig(content: string, schemaName: string): any {
    // Extract configuration from the third parameter of defineSchema
    const configMatch = content.match(/defineSchema\s*\([^,]+,[^,]+,\s*\{([^}]+)\}/);
    
    const config: any = {
      timestamps: true, // default
      fillable: 'auto',
      hidden: 'auto'
    };
    
    if (configMatch) {
      const configStr = configMatch[1];
      
      // Parse basic config properties
      if (configStr.includes('timestamps: false')) config.timestamps = false;
      if (configStr.includes('realtime:')) {
        config.realtime = { enabled: true, events: [], channels: [] };
      }
    }
    
    return config;
  }

  getOutputConfig(): any {
    return this.config.output || {};
  }
}
