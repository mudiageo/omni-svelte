export interface OmniPlugin {
  name: string;
  version?: string;
  registerTables?: () => Record<string, any>;
  registerCommands?: () => any[];
  handle?: any;
  onModelEvent?: (event: ModelEvent) => Promise<void> | void;
  vitePlugins?: any[];
  authProviders?: any[];
  authPlugins?: any[];
  onSetup?: (ctx: PluginContext) => Promise<void> | void;
  onBuild?: (ctx: PluginContext) => Promise<void> | void;
  onDestroy?: (ctx: PluginContext) => void;
}

export interface PluginContext {
  config: any;
  db: any;
  auth: any;
  logger: {
    info(msg: string): void;
    warn(msg: string): void;
    error(msg: string): void;
    debug(msg: string): void;
  };
}

export type ModelEventType = 'created' | 'updated' | 'deleted' | 'creating' | 'updating' | 'deleting';

export interface ModelEvent {
  type: ModelEventType;
  modelName: string;
  data: Record<string, unknown>;
  previous?: Record<string, unknown>;
}

export interface PluginCommand {
  name: string;
  description: string;
  args?: any[];
  flags?: any[];
  run: (args: Record<string, string>, flags: Record<string, boolean | string>) => Promise<void>;
}

export interface FeatureConfig {
  enabled: boolean;
  [key: string]: any;
}
