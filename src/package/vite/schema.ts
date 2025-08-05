import type { GeneratedOutput, Schema, SchemaConfig, UserSchemaConfig } from "../schema/types";
import type { OmniConfig, SvelteConfig } from "../config/types";
import { resolve } from "path";
import { existsSync, readFileSync } from "fs";
import { pathToFileURL } from "url";
import type { ImportGlobOptions, ViteDevServer } from "vite";
import chokidar, { type FSWatcher } from 'chokidar'
import { glob } from "glob";
import { DrizzleGenerator } from "../schema/generators/drizzle";
import { ZodGenerator } from "../schema/generators/zod";
import { ModelGenerator } from "../schema/generators/model";
import { writeFile, mkdir } from "fs/promises";
import { dirname } from "path";

let schemaConfig: SchemaConfig;
let schemas: Schema[] = []
let schemaWatcher: FSWatcher | null = null

// Helper functions
export async function initializeSchemaConfig(omniConfig: OmniConfig, root: string) {
    // Load schema configuration from svelte.config.js or separate config file
    const userSchemaConfig: UserSchemaConfig = omniConfig?.schema || await loadSchemaConfigFile(root);

    schemaConfig = mergeWithDefaults(userSchemaConfig);
    let schemas: Schema[] = [];
    
    // Apply SvelteKit-specific defaults
    applySvelteKitDefaults(schemaConfig);
    
    // Discover schemas
    if (schemaConfig.input?.patterns?.length) {
        schemas = await discoverSchemas(schemaConfig);
    }
    
    if (schemaConfig.dev?.logLevel !== 'silent') {
        console.log(`📋 Discovered ${schemas.length} schemas in ${schemaConfig.mode} mode`);
    }
    return schemaConfig
}

async function loadSchemaConfigFile(root: string): Promise<UserSchemaConfig> {
    const configFiles = [
        'schema.config.ts',
        'schema.config.js'
    ];

    for (const configFile of configFiles) {
        const configPath = resolve(root, configFile);
        if (existsSync(configPath)) {
            try {
                const module = await import(pathToFileURL(configPath) + '?t=' + Date.now());
                return module.default || {};
            } catch (error) {
                console.warn(`Could not load ${configFile}:`, error);
            }
        }
    }

    return {};
}
export function setupSchemaWatcher(server: ViteDevServer, schemaConfig: SchemaConfig, schemasRef: { current: Schema[] }): FSWatcher | null {
    // Close existing watcher
    if (schemaWatcher) {
        schemaWatcher.close();
    }

    if (!schemaConfig?.input?.patterns?.length) return null;
    schemaWatcher = chokidar.watch(schemaConfig.input.patterns, {
        ignored: schemaConfig.input.exclude || ['**/node_modules/**'],
        ignoreInitial: true
    });

    schemaWatcher.on('change', async (filePath) => {
        if (schemaConfig.dev?.logLevel !== 'silent') {
            console.log(`🔄 Schema file changed: ${filePath}`);
        }

        // Re-discover schemas and update reference
        const newSchemas = await discoverSchemas(schemaConfig);
        schemasRef.current.splice(0, schemasRef.current.length, ...newSchemas);

        // Regenerate files
        await generateSchemaFiles(schemasRef.current, schemaConfig, [filePath]);

        // Trigger HMR
        if (schemaConfig.dev?.hotReload !== false) {
            const affectedModules = findAffectedModules(filePath, schemasRef.current);
            affectedModules.forEach(moduleId => {
                const module = server.moduleGraph.getModuleById(moduleId);
                if (module) server.reloadModule(module);
            });
        }
    });

    schemaWatcher.on('add', async (filePath) => {
        const newSchemas = await discoverSchemas(schemaConfig);
        schemasRef.current.splice(0, schemasRef.current.length, ...newSchemas);
        if (schemaConfig.dev?.logLevel !== 'silent') {
            console.log(`➕ New schema file: ${filePath}`);
        }
    });

    schemaWatcher.on('unlink', async (filePath) => {
        const newSchemas = await discoverSchemas(schemaConfig);
        schemasRef.current.splice(0, schemasRef.current.length, ...newSchemas);
        if (schemaConfig.dev?.logLevel !== 'silent') {
            console.log(`➖ Schema file removed: ${filePath}`);
        }
    });
    return schemaWatcher
}

export async function generateSchemaFiles(schemas: Schema[], config: SchemaConfig, changedFiles?: string[]) {
    if (!schemas.length) return;

    const outputs = await generateAllSchemas(schemas, config, changedFiles);
    
    for (const output of outputs) {
        await writeGeneratedFile(output);
        if (config.dev?.logLevel === 'info' || config.dev?.logLevel === 'debug') {
            console.log(`✅ Generated ${output.type}: ${output.path}`);
        }
    }
}

function findAffectedModules(changedFile: string, schemas: Schema[]): string[] {
    // Find modules that import from changed schema files
    const affectedModules: string[] = [];
    
    // Add virtual modules that might be affected
    affectedModules.push('virtual:omni-schemas');
    
    // Add specific schema virtual modules
    schemas.forEach(schema => {
        if (schema.filePath === changedFile) {
            affectedModules.push(`virtual:omni-schema/${schema.name}`);
        }
    });

    return affectedModules;
}

function isSchemaFile(id: string, config: SchemaConfig): boolean {
    if (!config.input?.patterns) return false;
    
    // Simple pattern matching - in real implementation, use minimatch
    return config.input.patterns.some(pattern => 
        id.includes(pattern.replace('**/', '').replace('*', ''))
    );
}

// Utility functions (these would be implemented in separate modules)
function mergeWithDefaults(userConfig: UserSchemaConfig): SchemaConfig {
    // Implementation for merging user config with defaults
    return {
        mode: userConfig.mode || 'hybrid',
        input: {
            patterns: ['src/**/*.schema.ts'],
            exclude: ['**/node_modules/**', '**/*.test.ts'],
            ...userConfig.input
        },
        dev: {
            watch: true,
            hotReload: true,
            generateOnStart: true,
            logLevel: 'info',
            ...userConfig.dev
        },
        // ... other defaults
    } as SchemaConfig;
}

function applySvelteKitDefaults(config: SchemaConfig) {
    // Apply SvelteKit-specific defaults
    if (!config.output) {
        config.output = {
            directory: './src/lib/generated',
            drizzle: { path: './src/lib/db/server/schema.ts', format: 'single-file' },
            zod: { path: './src/lib/validation', format: 'per-schema' },
            model: { path: './src/lib/servermodels', format: 'per-schema' },
            types: { path: './src/lib/types/schemas.d.ts', format: 'single-file' }
        };
    }
}

export async function discoverSchemas(config: SchemaConfig): Promise<Schema[]> {
    if (!config.input?.patterns) return [];
    
    const files = await glob(config.input.patterns, {
        ignore: config.input.exclude || []
    });
    
    const schemas: Schema[] = [];
    
    for (const file of files) {
        try {
            // Parse the file as text instead of importing to avoid alias issues
            const fileContent = readFileSync(file, 'utf-8');
            
            // Extract schema definitions using regex parsing
            const schemaMatches = fileContent.matchAll(/export\s+const\s+(\w+)\s*=\s*defineSchema\s*\(\s*['"`](\w+)['"`]\s*,\s*(\{[\s\S]*?\})\s*,\s*(\{[\s\S]*?\})\s*\);?/g);
            
            for (const match of schemaMatches) {
                const [, exportName, tableName, fieldsStr, configStr] = match;
                
                try {
                    if (config.dev?.logLevel === 'debug') {
                        console.log(`Parsing schema: ${exportName} -> ${tableName}`);
                        console.log('Fields string:', fieldsStr.substring(0, 100) + '...');
                        console.log('Config string:', configStr.substring(0, 100) + '...');
                    }
                    
                    // Parse the field definitions and config
                    const fields = parseFieldsObject(fieldsStr);
                    const configObj = parseConfigObject(configStr);
                    
                    schemas.push({
                        name: tableName,
                        fields: fields,
                        config: configObj,
                        filePath: file
                    });
                    
                    if (config.dev?.logLevel !== 'silent') {
                        console.log(`✅ Found schema: ${exportName} -> ${tableName} (${Object.keys(fields).length} fields)`);
                    }
                } catch (parseError) {
                    if (config.dev?.logLevel !== 'silent') {
                        console.warn(`Could not parse schema definition ${exportName} in ${file}:`, parseError);
                    }
                }
            }
        } catch (error) {
            if (config.dev?.logLevel !== 'silent') {
                console.warn(`Could not read schema file ${file}:`, error);
            }
        }
    }
    
    return schemas;
}

async function generateAllSchemas(
    schemas: Schema[], 
    config: SchemaConfig, 
    changedFiles?: string[]
): Promise<GeneratedOutput[]> {
    const outputs: GeneratedOutput[] = [];
    
    // Filter schemas if only specific files changed
    const schemasToProcess = changedFiles 
        ? schemas.filter(schema => schema.filePath && changedFiles.includes(schema.filePath))
        : schemas;

    if (!schemasToProcess.length) return outputs;
    for (const schema of schemasToProcess) {
        if (config.dev?.logLevel !== 'silent') {
            console.log(`🔧 Processing schema: ${schema.name}`);
        }
    }
    
    // Initialize generators for batch processing
    // Generate Drizzle schemas
    if (config.output?.drizzle) {
        const drizzleGenerator = new DrizzleGenerator(schemasToProcess[0]); // Initialize with first schema
        const drizzleOutputs = await drizzleGenerator.generateFiles(schemasToProcess, config.output.drizzle);
        outputs.push(...drizzleOutputs);
    }

    // Generate Zod schemas
    if (config.output?.zod) {
        const zodGenerator = new ZodGenerator(schemasToProcess[0]); // Initialize with first schema
        const zodOutputs = await zodGenerator.generateFiles(schemasToProcess, config.output.zod);
        outputs.push(...zodOutputs);
    }

    // Generate model types
    if (config.output?.model) {
        const modelGenerator = new ModelGenerator(schemasToProcess[0]); // Initialize with first schema
        const modelOutputs = await modelGenerator.generateFiles(schemasToProcess, config.output.model);
        outputs.push(...modelOutputs);
    }

    // Generate TypeScript types
    if (config.output?.types) {
        const typeOutputs = await generateTypeDefinitions(schemasToProcess, config.output.types);
        outputs.push(...typeOutputs);
    }
    return outputs;
}

async function writeGeneratedFile(output: GeneratedOutput) {
    try {
        // Ensure directory exists
        await mkdir(dirname(output.path), { recursive: true });
        
        // Write file with generated content
        await writeFile(output.path, output.content, 'utf-8');
    } catch (error) {
        console.error(`Failed to write generated file ${output.path}:`, error);
        throw error;
    }
}

async function generateTypeDefinitions(schemas: Schema[], typeConfig: any): Promise<GeneratedOutput[]> {
    const typeContent = schemas.map(schema => {
        const typeName = `${schema.name}Type`;
        return `export interface ${typeName} {\n  // Generated from ${schema.filePath}\n  [key: string]: any;\n}`;
    }).join('\n\n');

    return [{
        type: 'types',
        path: typeConfig.path,
        content: `// Auto-generated type definitions\n\n${typeContent}\n`
    }];
}

// Helper functions for parsing schema objects from string representation
function parseFieldsObject(fieldsStr: string): Record<string, any> {
    try {
        // Remove comments and normalize the object string
        const cleanStr = fieldsStr
            .replace(/\/\/.*$/gm, '')  // Remove single-line comments
            .replace(/\/\*[\s\S]*?\*\//g, '')  // Remove multi-line comments
            .replace(/,(\s*[}\]])/g, '$1');  // Remove trailing commas
        
        // Use a safe eval approach or simple object parser
        // For now, return a basic parsed object
        const fields: Record<string, any> = {};
        
        // Extract field definitions using regex
        const fieldRegex = /(\w+):\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
        let fieldMatch;
        
        while ((fieldMatch = fieldRegex.exec(cleanStr)) !== null) {
            const [, fieldName, fieldDefStr] = fieldMatch;
            fields[fieldName] = parseFieldDefinition(fieldDefStr);
        }
        
        return fields;
    } catch (error) {
        console.warn('Error parsing fields object:', error);
        return {};
    }
}

function parseFieldDefinition(fieldDefStr: string): any {
    const fieldDef: any = {};
    
    // Extract type
    const typeMatch = fieldDefStr.match(/type:\s*['"`]([^'"`]+)['"`]/);
    if (typeMatch) fieldDef.type = typeMatch[1];
    
    // Extract boolean properties
    if (fieldDefStr.includes('primary: true')) fieldDef.primary = true;
    if (fieldDefStr.includes('required: true')) fieldDef.required = true;
    if (fieldDefStr.includes('unique: true')) fieldDef.unique = true;
    if (fieldDefStr.includes('hidden: true')) fieldDef.hidden = true;
    if (fieldDefStr.includes('computed: true')) fieldDef.computed = true;
    
    // Extract length
    const lengthMatch = fieldDefStr.match(/length:\s*(\d+)/);
    if (lengthMatch) fieldDef.length = parseInt(lengthMatch[1]);
    
    // Extract default value
    const defaultMatch = fieldDefStr.match(/default:\s*([^,\n}]+)/);
    if (defaultMatch) {
        const defaultValue = defaultMatch[1].trim();
        if (defaultValue === 'true') fieldDef.default = true;
        else if (defaultValue === 'false') fieldDef.default = false;
        else if (!isNaN(Number(defaultValue))) fieldDef.default = Number(defaultValue);
        else fieldDef.default = defaultValue.replace(/['"]/g, '');
    }
    
    // Extract validation object (simplified)
    const validationMatch = fieldDefStr.match(/validation:\s*\{([^{}]*)\}/);
    if (validationMatch) {
        fieldDef.validation = parseValidationObject(validationMatch[1]);
    }
    
    return fieldDef;
}

function parseValidationObject(validationStr: string): any {
    const validation: any = {};
    
    // Extract min/max
    const minMatch = validationStr.match(/min:\s*(\d+)/);
    if (minMatch) validation.min = parseInt(minMatch[1]);
    
    const maxMatch = validationStr.match(/max:\s*(\d+)/);
    if (maxMatch) validation.max = parseInt(maxMatch[1]);
    
    // Extract message
    const messageMatch = validationStr.match(/message:\s*['"`]([^'"`]+)['"`]/);
    if (messageMatch) validation.message = messageMatch[1];
    
    // Extract boolean flags
    if (validationStr.includes('requireUppercase: true')) validation.requireUppercase = true;
    if (validationStr.includes('requireNumbers: true')) validation.requireNumbers = true;
    
    return validation;
}

function parseConfigObject(configStr: string): any {
    const config: any = {};
    
    // Extract boolean properties
    if (configStr.includes('timestamps: true')) config.timestamps = true;
    if (configStr.includes('timestamps: false')) config.timestamps = false;
    
    // Extract indexes array (simplified)
    const indexesMatch = configStr.match(/indexes:\s*\[([^\]]*)\]/);
    if (indexesMatch) {
        const indexesStr = indexesMatch[1];
        config.indexes = parseIndexes(indexesStr);
    }
    
    // Extract fillable/hidden
    if (configStr.includes("fillable: 'auto'")) config.fillable = 'auto';
    if (configStr.includes("hidden: 'auto'")) config.hidden = 'auto';
    
    // Extract validation config
    const validationMatch = configStr.match(/validation:\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/);
    if (validationMatch) {
        config.validation = parseValidationConfig(validationMatch[1]);
    }
    
    // Extract realtime config (simplified)
    if (configStr.includes('realtime:')) {
        config.realtime = { enabled: true };
    }
    
    return config;
}

function parseIndexes(indexesStr: string): (string | string[])[] {
    const indexes: (string | string[])[] = [];
    
    // Simple parsing for indexes like 'email', ['name', 'active']
    const parts = indexesStr.split(',').map(s => s.trim());
    
    for (const part of parts) {
        if (part.startsWith('[') && part.endsWith(']')) {
            // Array index
            const arrayContent = part.slice(1, -1);
            const columns = arrayContent.split(',').map(s => s.trim().replace(/['"]/g, ''));
            indexes.push(columns);
        } else {
            // Single column index
            const column = part.replace(/['"]/g, '');
            if (column) indexes.push(column);
        }
    }
    
    return indexes;
}

function parseValidationConfig(validationStr: string): any {
    const validation: any = {};
    
    // Extract onCreate array
    const onCreateMatch = validationStr.match(/onCreate:\s*\[([^\]]*)\]/);
    if (onCreateMatch) {
        validation.onCreate = onCreateMatch[1]
            .split(',')
            .map(s => s.trim().replace(/['"]/g, ''))
            .filter(s => s);
    }
    
    // Extract onUpdate array
    const onUpdateMatch = validationStr.match(/onUpdate:\s*\[([^\]]*)\]/);
    if (onUpdateMatch) {
        validation.onUpdate = onUpdateMatch[1]
            .split(',')
            .map(s => s.trim().replace(/['"]/g, ''))
            .filter(s => s);
    }
    
    return validation;
}


