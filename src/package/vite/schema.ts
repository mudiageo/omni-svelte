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
import { ParserFactory } from "../schema/parser";
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

function mergeWithDefaults(userConfig: UserSchemaConfig): SchemaConfig {
    // Implementation for merging user config with defaults
    return {
        mode: userConfig.mode || 'hybrid',
        input: {
            patterns: ['src/**/*.schema.ts'],
            exclude: ['**/node_modules/**', '**/*.test.ts'],
            ...userConfig.input
        },
        parsing: {
            strategy: 'regex', // Default to regex for stability
            fallbackToRegex: true,
            strict: false,
            ...userConfig.parsing
        },
        output: {
            directory: './src/lib/generated',
            drizzle: {
                path: './src/lib/db/server/schema.ts',
                format: 'single-file',
                ...userConfig.output?.drizzle
            },
            zod: {
                path: './src/lib/validation.ts',
                format: 'single-file',
                ...userConfig.output?.zod
            },
            model: {
                path: './src/lib/models/index.ts',
                format: 'single-file',
                includeTypes: true,
                includeCrud: true,
                ...userConfig.output?.model
            },
            types: {
                path: './src/lib/types/index.ts',
				format: 'single-file',
                ...userConfig.output?.types
            },
            ...userConfig.output
        },
        dev: {
            watch: true,
            hotReload: true,
            generateOnStart: true,
            logLevel: 'info',
            ...userConfig.dev
        },
        build: {
            useRuntime: false,
            treeShake: true,
            minify: false,
            bundle: false,
            ...userConfig.build
        },
        generation: {
            typescript: {
                strict: true,
                declaration: true,
                target: 'ES2020',
                ...userConfig.generation?.typescript
            },
            drizzle: {
                dialect: 'postgresql',
                relations: true,
                indexes: true,
                ...userConfig.generation?.drizzle
            },
            zod: {
                errorMap: false,
                transforms: true,
                refinements: true,
                ...userConfig.generation?.zod
            },
            model: {
                crud: {
                    create: true,
                    read: true,
                    update: true,
                    delete: true,
                    list: true,
                    ...userConfig.generation?.model?.crud
                },
                validation: 'auto',
                serialization: 'json',
                ...userConfig.generation?.model
            },
            ...userConfig.generation
        },
        plugins: userConfig.plugins || [],
        runtime: {
            lazy: false,
            cache: true,
            devTools: false,
            ...userConfig.runtime
        }
    } as SchemaConfig;
}

export async function discoverSchemas(config: SchemaConfig): Promise<Schema[]> {
    if (!config.input?.patterns) return [];
    
    const files = await glob(config.input.patterns, {
        ignore: config.input.exclude || []
    });
    
    const schemas: Schema[] = [];
    const parser = ParserFactory.createParser(config);
    
    if (config.dev?.logLevel === 'debug') {
        console.log(`🔍 Using ${config.parsing?.strategy || 'regex'} parsing strategy`);
        console.log(`📁 Discovered ${files.length} schema files`);
    }
    
    for (const file of files) {
        try {
            const fileSchemas = await parser.parseSchemas(file);
            
            for (const schema of fileSchemas) {
                // Check for duplicate schema names
                const existingSchema = schemas.find(s => s.name === schema.name);
                if (existingSchema) {
                    if (config.dev?.logLevel !== 'silent') {
                        console.warn(`⚠️  Duplicate schema name "${schema.name}" found in ${file}. Skipping...`);
                    }
                    continue;
                }
                
                schemas.push(schema);
                
                if (config.dev?.logLevel !== 'silent') {
                    console.log(`✅ Found schema: ${schema.name} (${Object.keys(schema.fields).length} fields)`);
                }
            }
        } catch (error) {
            if (config.dev?.logLevel !== 'silent') {
                console.warn(`Could not parse schema file ${file}:`, error);
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
        const drizzleOutputs = await drizzleGenerator.generateFiles(schemasToProcess, {
            ...config.output.drizzle,
            drizzle: config.output.drizzle,
            zod: config.output.zod,
            model: config.output.model
        });
        outputs.push(...drizzleOutputs);
    }

    // Generate Zod schemas
    if (config.output?.zod) {
        const zodGenerator = new ZodGenerator(schemasToProcess[0]); // Initialize with first schema
        const zodOutputs = await zodGenerator.generateFiles(schemasToProcess, {
            ...config.output.zod,
            drizzle: config.output.drizzle,
            zod: config.output.zod,
            model: config.output.model
        });
        outputs.push(...zodOutputs);
    }

    // Generate model types
    if (config.output?.model) {
        const modelGenerator = new ModelGenerator(schemasToProcess[0]); // Initialize with first schema
        const modelOutputs = await modelGenerator.generateFiles(schemasToProcess, {
            ...config.output.model,
            drizzle: config.output.drizzle,
            zod: config.output.zod,
            model: config.output.model
        });
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


