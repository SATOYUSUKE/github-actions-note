/**
 * 設定管理システム
 * ワークフローパラメータのカスタマイゼーション、設定検証、プロンプトテンプレート管理を提供
 */

import { Logger } from './logger.js';
import { FileManager } from './file-manager.js';
import fs from 'fs';
import path from 'path';

/**
 * 設定カテゴリ定義
 */
export const ConfigCategories = {
  WORKFLOW: 'workflow',
  PROMPTS: 'prompts',
  API: 'api',
  QUALITY: 'quality',
  PUBLISHING: 'publishing',
  MONITORING: 'monitoring'
};

/**
 * 設定検証ルール
 */
export const ValidationRules = {
  REQUIRED: 'required',
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  ARRAY: 'array',
  OBJECT: 'object',
  EMAIL: 'email',
  URL: 'url',
  RANGE: 'range',
  ENUM: 'enum',
  PATTERN: 'pattern'
};

/**
 * メイン設定管理クラス
 */
export class ConfigManager {
  constructor() {
    this.configPath = 'config';
    this.defaultConfigPath = 'config/defaults';
    this.userConfigPath = 'config/user';
    this.templatesPath = 'config/templates';
    this.schemasPath = 'config/schemas';
    
    this.loadedConfigs = new Map();
    this.configSchemas = new Map();
    this.configWatchers = new Map();
  }

  /**
   * 設定システムを初期化
   */
  async initialize() {
    try {
      Logger.info('Initializing configuration system...');
      
      // 設定ディレクトリを作成
      await this.ensureConfigDirectories();
      
      // デフォルト設定を作成
      await this.createDefaultConfigs();
      
      // 設定スキーマを読み込み
      await this.loadConfigSchemas();
      
      // ユーザー設定を読み込み
      await this.loadUserConfigs();
      
      Logger.info('Configuration system initialized successfully');
      
    } catch (error) {
      Logger.error('Failed to initialize configuration system', error);
      throw error;
    }
  }

  /**
   * 設定ディレクトリを確保
   */
  async ensureConfigDirectories() {
    const directories = [
      this.configPath,
      this.defaultConfigPath,
      this.userConfigPath,
      this.templatesPath,
      this.schemasPath
    ];

    for (const dir of directories) {
      await FileManager.ensureDirectory(dir);
    }
  }

  /**
   * デフォルト設定を作成
   */
  async createDefaultConfigs() {
    // ワークフロー設定
    const workflowConfig = {
      version: '1.0.0',
      name: 'Note Automation Workflow',
      description: 'Automated article research, writing, fact-checking, and publishing',
      
      // 基本パラメータ
      parameters: {
        theme: {
          type: 'string',
          default: 'AI技術の最新動向',
          description: '記事のテーマ',
          required: true,
          maxLength: 100
        },
        target: {
          type: 'string',
          default: 'エンジニア初心者',
          description: '想定読者',
          required: true,
          maxLength: 50
        },
        message: {
          type: 'string',
          default: '技術の進歩で生産性向上',
          description: '伝えたい核メッセージ',
          required: true,
          maxLength: 200
        },
        cta: {
          type: 'string',
          default: '実際に試してみる',
          description: '読後のアクション',
          required: true,
          maxLength: 50
        },
        tags: {
          type: 'array',
          default: ['AI', '技術', '自動化'],
          description: '記事タグ',
          required: true,
          maxItems: 5,
          itemType: 'string',
          itemMaxLength: 20
        },
        isPublic: {
          type: 'boolean',
          default: false,
          description: '公開設定（true: 公開, false: 下書き）',
          required: true
        },
        dryRun: {
          type: 'boolean',
          default: true,
          description: 'テスト実行（true: 投稿スキップ, false: 実際に投稿）',
          required: true
        }
      },

      // 高度な設定
      advanced: {
        researchDepth: {
          type: 'enum',
          default: 'standard',
          options: ['basic', 'standard', 'deep'],
          description: 'リサーチの深度'
        },
        writingStyle: {
          type: 'enum',
          default: 'informative',
          options: ['casual', 'informative', 'technical', 'academic'],
          description: '記事の文体'
        },
        factCheckLevel: {
          type: 'enum',
          default: 'standard',
          options: ['basic', 'standard', 'strict'],
          description: 'ファクトチェックの厳密さ'
        },
        contentLength: {
          type: 'enum',
          default: 'medium',
          options: ['short', 'medium', 'long'],
          description: '記事の長さ'
        }
      },

      // 品質設定
      quality: {
        minQualityScore: {
          type: 'number',
          default: 0.7,
          min: 0.0,
          max: 1.0,
          description: '最低品質スコア'
        },
        minFactCheckScore: {
          type: 'number',
          default: 0.6,
          min: 0.0,
          max: 1.0,
          description: '最低ファクトチェックスコア'
        },
        requireManualReview: {
          type: 'boolean',
          default: false,
          description: '手動レビューを必須とする'
        }
      }
    };

    await FileManager.writeJSON(`${this.defaultConfigPath}/workflow.json`, workflowConfig);

    // API設定
    const apiConfig = {
      anthropic: {
        model: 'claude-3-5-sonnet-20241022',
        maxTokens: 4000,
        temperature: 0.7,
        timeout: 60000,
        retryAttempts: 3,
        retryDelay: 1000
      },
      tavily: {
        searchDepth: 'advanced',
        includeAnswer: true,
        includeRawContent: false,
        maxResults: 5,
        timeout: 30000,
        retryAttempts: 2,
        retryDelay: 2000
      },
      rateLimits: {
        anthropic: {
          requestsPerMinute: 50,
          tokensPerMinute: 40000
        },
        tavily: {
          requestsPerMinute: 100,
          requestsPerDay: 1000
        }
      }
    };

    await FileManager.writeJSON(`${this.defaultConfigPath}/api.json`, apiConfig);

    // モニタリング設定
    const monitoringConfig = {
      enabled: true,
      logLevel: 'info',
      metricsCollection: {
        performance: true,
        apiUsage: true,
        errors: true,
        quality: true
      },
      alerts: {
        errorThreshold: 5,
        performanceThreshold: 300000, // 5分
        quotaThreshold: 0.8 // 80%
      },
      reporting: {
        generateReports: true,
        reportInterval: 'daily',
        includeRecommendations: true
      }
    };

    await FileManager.writeJSON(`${this.defaultConfigPath}/monitoring.json`, monitoringConfig);
  }

  /**
   * 設定スキーマを読み込み
   */
  async loadConfigSchemas() {
    // ワークフロー設定スキーマ
    const workflowSchema = {
      type: 'object',
      properties: {
        version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
        name: { type: 'string', minLength: 1, maxLength: 100 },
        description: { type: 'string', maxLength: 500 },
        parameters: {
          type: 'object',
          properties: {
            theme: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['string'] },
                default: { type: 'string' },
                description: { type: 'string' },
                required: { type: 'boolean' },
                maxLength: { type: 'number', minimum: 1 }
              },
              required: ['type', 'default', 'description', 'required']
            }
            // 他のパラメータも同様に定義
          }
        }
      },
      required: ['version', 'name', 'parameters']
    };

    this.configSchemas.set('workflow', workflowSchema);

    // API設定スキーマ
    const apiSchema = {
      type: 'object',
      properties: {
        anthropic: {
          type: 'object',
          properties: {
            model: { type: 'string' },
            maxTokens: { type: 'number', minimum: 1, maximum: 8000 },
            temperature: { type: 'number', minimum: 0, maximum: 2 },
            timeout: { type: 'number', minimum: 1000 },
            retryAttempts: { type: 'number', minimum: 0, maximum: 10 },
            retryDelay: { type: 'number', minimum: 100 }
          },
          required: ['model', 'maxTokens', 'temperature']
        }
      }
    };

    this.configSchemas.set('api', apiSchema);
  }

  /**
   * ユーザー設定を読み込み
   */
  async loadUserConfigs() {
    try {
      const configFiles = ['workflow.json', 'api.json', 'monitoring.json'];
      
      for (const configFile of configFiles) {
        const userConfigPath = `${this.userConfigPath}/${configFile}`;
        const defaultConfigPath = `${this.defaultConfigPath}/${configFile}`;
        const configName = path.basename(configFile, '.json');
        
        // デフォルト設定を読み込み
        let config = await FileManager.readJSON(defaultConfigPath);
        
        // ユーザー設定が存在する場合はマージ
        if (fs.existsSync(userConfigPath)) {
          const userConfig = await FileManager.readJSON(userConfigPath);
          config = this.mergeConfigs(config, userConfig);
        }
        
        // 設定を検証
        const validation = this.validateConfig(configName, config);
        if (!validation.valid) {
          Logger.warn(`Configuration validation failed for ${configName}:`, validation.errors);
          // デフォルト設定を使用
          config = await FileManager.readJSON(defaultConfigPath);
        }
        
        this.loadedConfigs.set(configName, config);
        Logger.debug(`Loaded configuration: ${configName}`);
      }
      
    } catch (error) {
      Logger.error('Failed to load user configurations', error);
      throw error;
    }
  }

  /**
   * 設定を取得
   */
  getConfig(category, key = null) {
    const config = this.loadedConfigs.get(category);
    if (!config) {
      throw new Error(`Configuration category not found: ${category}`);
    }
    
    if (key === null) {
      return config;
    }
    
    return this.getNestedValue(config, key);
  }

  /**
   * 設定を更新
   */
  async updateConfig(category, key, value) {
    try {
      const config = this.loadedConfigs.get(category);
      if (!config) {
        throw new Error(`Configuration category not found: ${category}`);
      }
      
      // 値を設定
      this.setNestedValue(config, key, value);
      
      // 設定を検証
      const validation = this.validateConfig(category, config);
      if (!validation.valid) {
        throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
      }
      
      // メモリ内の設定を更新
      this.loadedConfigs.set(category, config);
      
      // ユーザー設定ファイルに保存
      const userConfigPath = `${this.userConfigPath}/${category}.json`;
      await FileManager.writeJSON(userConfigPath, config);
      
      Logger.info(`Configuration updated: ${category}.${key} = ${JSON.stringify(value)}`);
      
      // 設定変更イベントを発火
      this.emitConfigChange(category, key, value);
      
    } catch (error) {
      Logger.error(`Failed to update configuration: ${category}.${key}`, error);
      throw error;
    }
  }

  /**
   * 設定をリセット
   */
  async resetConfig(category) {
    try {
      const defaultConfigPath = `${this.defaultConfigPath}/${category}.json`;
      const defaultConfig = await FileManager.readJSON(defaultConfigPath);
      
      this.loadedConfigs.set(category, defaultConfig);
      
      // ユーザー設定ファイルを削除
      const userConfigPath = `${this.userConfigPath}/${category}.json`;
      if (fs.existsSync(userConfigPath)) {
        fs.unlinkSync(userConfigPath);
      }
      
      Logger.info(`Configuration reset to defaults: ${category}`);
      
    } catch (error) {
      Logger.error(`Failed to reset configuration: ${category}`, error);
      throw error;
    }
  }

  /**
   * 設定を検証
   */
  validateConfig(category, config) {
    const validation = {
      valid: true,
      errors: []
    };

    try {
      const schema = this.configSchemas.get(category);
      if (!schema) {
        validation.errors.push(`No schema found for category: ${category}`);
        validation.valid = false;
        return validation;
      }

      // 基本的な型チェック
      const typeValidation = this.validateType(config, schema);
      if (!typeValidation.valid) {
        validation.errors.push(...typeValidation.errors);
        validation.valid = false;
      }

      // カスタム検証ルール
      const customValidation = this.validateCustomRules(category, config);
      if (!customValidation.valid) {
        validation.errors.push(...customValidation.errors);
        validation.valid = false;
      }

    } catch (error) {
      validation.errors.push(`Validation error: ${error.message}`);
      validation.valid = false;
    }

    return validation;
  }

  /**
   * 型検証
   */
  validateType(value, schema) {
    const validation = { valid: true, errors: [] };

    if (schema.type === 'object' && typeof value === 'object' && value !== null) {
      if (schema.properties) {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          if (schema.required && schema.required.includes(key) && !(key in value)) {
            validation.errors.push(`Required property missing: ${key}`);
            validation.valid = false;
          } else if (key in value) {
            const propValidation = this.validateType(value[key], propSchema);
            if (!propValidation.valid) {
              validation.errors.push(...propValidation.errors.map(err => `${key}.${err}`));
              validation.valid = false;
            }
          }
        }
      }
    } else if (schema.type === 'string' && typeof value !== 'string') {
      validation.errors.push(`Expected string, got ${typeof value}`);
      validation.valid = false;
    } else if (schema.type === 'number' && typeof value !== 'number') {
      validation.errors.push(`Expected number, got ${typeof value}`);
      validation.valid = false;
    } else if (schema.type === 'boolean' && typeof value !== 'boolean') {
      validation.errors.push(`Expected boolean, got ${typeof value}`);
      validation.valid = false;
    }

    // 範囲チェック
    if (schema.minimum !== undefined && value < schema.minimum) {
      validation.errors.push(`Value ${value} is below minimum ${schema.minimum}`);
      validation.valid = false;
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      validation.errors.push(`Value ${value} is above maximum ${schema.maximum}`);
      validation.valid = false;
    }

    return validation;
  }

  /**
   * カスタム検証ルール
   */
  validateCustomRules(category, config) {
    const validation = { valid: true, errors: [] };

    if (category === 'workflow') {
      // ワークフロー固有の検証
      if (config.parameters) {
        for (const [key, param] of Object.entries(config.parameters)) {
          if (param.type === 'string' && param.maxLength && param.default && param.default.length > param.maxLength) {
            validation.errors.push(`Default value for ${key} exceeds maxLength`);
            validation.valid = false;
          }
        }
      }
    } else if (category === 'api') {
      // API設定固有の検証
      if (config.anthropic && config.anthropic.temperature > 2) {
        validation.errors.push('Anthropic temperature must be <= 2');
        validation.valid = false;
      }
    }

    return validation;
  }

  /**
   * 設定をマージ
   */
  mergeConfigs(defaultConfig, userConfig) {
    const merged = JSON.parse(JSON.stringify(defaultConfig));
    
    function deepMerge(target, source) {
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          if (!target[key]) target[key] = {};
          deepMerge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
    }
    
    deepMerge(merged, userConfig);
    return merged;
  }

  /**
   * ネストした値を取得
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * ネストした値を設定
   */
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * 設定変更イベントを発火
   */
  emitConfigChange(category, key, value) {
    const listeners = this.configWatchers.get(`${category}.${key}`) || [];
    listeners.forEach(listener => {
      try {
        listener(value, key, category);
      } catch (error) {
        Logger.warn('Config change listener error:', error);
      }
    });
  }

  /**
   * 設定変更を監視
   */
  watchConfig(category, key, callback) {
    const watchKey = `${category}.${key}`;
    if (!this.configWatchers.has(watchKey)) {
      this.configWatchers.set(watchKey, []);
    }
    this.configWatchers.get(watchKey).push(callback);
  }

  /**
   * 設定エクスポート
   */
  async exportConfig(category = null) {
    try {
      const exportData = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        configs: {}
      };

      if (category) {
        exportData.configs[category] = this.loadedConfigs.get(category);
      } else {
        for (const [key, config] of this.loadedConfigs) {
          exportData.configs[key] = config;
        }
      }

      const filename = `config-export-${Date.now()}.json`;
      const exportPath = `outputs/${filename}`;
      
      await FileManager.ensureDirectory('outputs');
      await FileManager.writeJSON(exportPath, exportData);
      
      Logger.info(`Configuration exported to: ${exportPath}`);
      return exportPath;
      
    } catch (error) {
      Logger.error('Failed to export configuration', error);
      throw error;
    }
  }

  /**
   * 設定インポート
   */
  async importConfig(importPath) {
    try {
      const importData = await FileManager.readJSON(importPath);
      
      if (!importData.configs) {
        throw new Error('Invalid import file format');
      }

      for (const [category, config] of Object.entries(importData.configs)) {
        // 設定を検証
        const validation = this.validateConfig(category, config);
        if (!validation.valid) {
          Logger.warn(`Skipping invalid configuration for ${category}:`, validation.errors);
          continue;
        }

        // 設定を更新
        this.loadedConfigs.set(category, config);
        
        // ユーザー設定ファイルに保存
        const userConfigPath = `${this.userConfigPath}/${category}.json`;
        await FileManager.writeJSON(userConfigPath, config);
        
        Logger.info(`Configuration imported: ${category}`);
      }
      
    } catch (error) {
      Logger.error('Failed to import configuration', error);
      throw error;
    }
  }

  /**
   * 設定サマリーを取得
   */
  getConfigSummary() {
    const summary = {
      categories: [],
      totalSettings: 0,
      customizations: 0
    };

    for (const [category, config] of this.loadedConfigs) {
      const categoryInfo = {
        name: category,
        settingsCount: this.countSettings(config),
        hasCustomizations: fs.existsSync(`${this.userConfigPath}/${category}.json`)
      };

      summary.categories.push(categoryInfo);
      summary.totalSettings += categoryInfo.settingsCount;
      if (categoryInfo.hasCustomizations) {
        summary.customizations++;
      }
    }

    return summary;
  }

  /**
   * 設定数をカウント
   */
  countSettings(obj, count = 0) {
    for (const value of Object.values(obj)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        count = this.countSettings(value, count);
      } else {
        count++;
      }
    }
    return count;
  }
}

/**
 * グローバル設定マネージャーインスタンス
 */
export const globalConfig = new ConfigManager();

export default ConfigManager;