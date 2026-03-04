class Config {
  constructor() {
    this.config = { ...defaultConfig };
  }

  /**
   * Set configuration values
   * @param {any} newConfig - Configuration object
   */
  set(newConfig) {
    this.config = this.mergeDeep(this.config, newConfig);
  }

  /**
   * Get configuration value
   * @param {string} path - Dot-separated path to config value
   */
  get(path) {
    return this.getNestedValue(this.config, path);
  }

  /**
   * Get all configuration
   */
  getAll() {
    return { ...this.config };
  }

  /**
   * Deep merge configuration objects
   * @param {any} target - Target object
   * @param {any} source - Source object
   */
  mergeDeep(target, source) {
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.mergeDeep(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  /**
   * Get nested value from object using dot notation
   * @param {any} obj - Object to search
   * @param {string} path - Dot-separated path
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

// Global configuration instance
export const config = new Config();

// Configuration helpers
export const configure = (newConfig) => config.set(newConfig);
export const getConfig = (path) => config.get(path);
export const getAllConfig = () => config.getAll();