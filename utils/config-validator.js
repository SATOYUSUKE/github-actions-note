/**
 * 設定検証システム
 * 設定値の検証、エラーチェック、推奨事項の提供を行う
 */

import { Logger } from './logger.js';
import { ValidationRules } from './config-manager.js';

/**
 * 検証結果クラス
 */
export class ValidationResult {
  constructor() {
    this.valid = true;
    this.errors = [];
    this.warnings = [];
    this.suggestions = [];
  }

  addError(message, field = null, code = null) {
    this.valid = false;
    this.errors.push({ message, field, code, severity: 'error' });
  }

  addWarning(message, field = null, code = null) {
    this.warnings.push({ message, field, code, severity: 'warning' });
  }

  addSuggestion(message, field = null, action = null) {
    this.suggestions.push({ message, field, action, severity: 'info' });
  }

  merge(other) {
    if (!other.valid) this.valid = false;
    this.errors.push(...other.errors);
    this.warnings.push(...other.warnings);
    this.suggestions.push(...other.suggestions);
  }

  getIssueCount() {
    return {
      errors: this.errors.length,
      warnings: this.warnings.length,
      suggestions: this.suggestions.length,
      total: this.errors.length + this.warnings.length + this.suggestions.length
    };
  }

  toJSON() {
    return {
      valid: this.valid,
      errors: this.errors,
      warnings: this.warnings,
      suggestions: this.suggestions,
      issueCount: this.getIssueCount()
    };
  }
}

/**
 * 設定検証クラス
 */
export class ConfigValidator {
  constructor() {
    this.validators = new Map();
    this.customRules = new Map();
    this.setupDefaultValidators();
  }

  /**
   * デフォルトバリデーターを設定
   */
  setupDefaultValidators() {
    // 基本型バリデーター
    this.validators.set(ValidationRules.REQUIRED, this.validateRequired.bind(this));
    this.validators.set(ValidationRules.STRING, this.validateString.bind(this));
    this.validators.set(ValidationRules.NUMBER, this.validateNumber.bind(this));
    this.validators.set(ValidationRules.BOOLEAN, this.validateBoolean.bind(this));
    this.validators.set(ValidationRules.ARRAY, this.validateArray.bind(this));
    this.validators.set(ValidationRules.OBJECT, this.validateObject.bind(this));
    this.validators.set(ValidationRules.EMAIL, this.validateEmail.bind(this));
    this.validators.set(ValidationRules.URL, this.validateURL.bind(this));
    this.validators.set(ValidationRules.RANGE, this.validateRange.bind(this));
    this.validators.set(ValidationRules.ENUM, this.validateEnum.bind(this));
    this.validators.set(ValidationRules.PATTERN, this.validatePattern.bind(this));
  }

  /**
   * 設定を包括的に検証
   */
  validateConfig(config, schema, context = {}) {
    const result = new ValidationResult();
    
    try {
      // 基本構造検証
      const structureResult = this.validateStructure(config, schema, context);
      result.merge(structureResult);
      
      // ビジネスロジック検証
      const businessResult = this.validateBusinessLogic(config, context);
      result.merge(businessResult);
      
      // パフォーマンス検証
      const performanceResult = this.validatePerformance(config, context);
      result.merge(performanceResult);
      
      // セキュリティ検証
      const securityResult = this.validateSecurity(config, context);
      result.merge(securityResult);
      
      // 互換性検証
      const compatibilityResult = this.validateCompatibility(config, context);
      result.merge(compatibilityResult);
      
    } catch (error) {
      result.addError(`Validation error: ${error.message}`, null, 'VALIDATION_ERROR');
    }
    
    return result;
  }

  /**
   * 構造検証
   */
  validateStructure(config, schema, context) {
    const result = new ValidationResult();
    
    if (!schema) {
      result.addWarning('No schema provided for validation');
      return result;
    }

    // 必須フィールドチェック
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in config)) {
          result.addError(`Required field missing: ${field}`, field, 'REQUIRED_FIELD_MISSING');
        }
      }
    }

    // プロパティ検証
    if (schema.properties) {
      for (const [field, fieldSchema] of Object.entries(schema.properties)) {
        if (field in config) {
          const fieldResult = this.validateField(config[field], fieldSchema, field, context);
          result.merge(fieldResult);
        }
      }
    }

    // 追加プロパティチェック
    if (schema.additionalProperties === false) {
      const allowedFields = new Set(Object.keys(schema.properties || {}));
      for (const field of Object.keys(config)) {
        if (!allowedFields.has(field)) {
          result.addWarning(`Unknown field: ${field}`, field, 'UNKNOWN_FIELD');
        }
      }
    }

    return result;
  }

  /**
   * フィールド検証
   */
  validateField(value, schema, fieldName, context) {
    const result = new ValidationResult();
    
    // 型検証
    if (schema.type) {
      const validator = this.validators.get(schema.type);
      if (validator) {
        const typeResult = validator(value, schema, fieldName, context);
        result.merge(typeResult);
      }
    }

    // カスタムルール検証
    if (schema.customRules) {
      for (const ruleName of schema.customRules) {
        const customRule = this.customRules.get(ruleName);
        if (customRule) {
          const customResult = customRule(value, schema, fieldName, context);
          result.merge(customResult);
        }
      }
    }

    return result;
  }

  /**
   * ビジネスロジック検証
   */
  validateBusinessLogic(config, context) {
    const result = new ValidationResult();
    
    // ワークフロー設定の検証
    if (context.category === 'workflow') {
      result.merge(this.validateWorkflowLogic(config));
    }
    
    // API設定の検証
    if (context.category === 'api') {
      result.merge(this.validateAPILogic(config));
    }
    
    // 品質設定の検証
    if (context.category === 'quality') {
      result.merge(this.validateQualityLogic(config));
    }

    return result;
  }

  /**
   * ワークフローロジック検証
   */
  validateWorkflowLogic(config) {
    const result = new ValidationResult();
    
    // パラメータの整合性チェック
    if (config.parameters) {
      // タグ数の妥当性
      if (config.parameters.tags && config.parameters.tags.default) {
        const tags = config.parameters.tags.default;
        if (Array.isArray(tags) && tags.length > 5) {
          result.addWarning('Too many default tags (max 5 recommended)', 'parameters.tags.default');
        }
      }
      
      // テーマと対象読者の整合性
      if (config.parameters.theme && config.parameters.target) {
        const theme = config.parameters.theme.default;
        const target = config.parameters.target.default;
        
        if (theme.includes('技術') && !target.includes('エンジニア') && !target.includes('開発者')) {
          result.addSuggestion(
            'Technical theme with non-technical audience may need adjustment',
            'parameters',
            'Consider aligning theme and target audience'
          );
        }
      }
    }

    // 高度な設定の整合性
    if (config.advanced) {
      const { researchDepth, writingStyle, contentLength } = config.advanced;
      
      // 深いリサーチと短い記事の組み合わせ
      if (researchDepth === 'deep' && contentLength === 'short') {
        result.addWarning(
          'Deep research with short content may not utilize research effectively',
          'advanced'
        );
      }
      
      // 学術的スタイルと初心者向けの組み合わせ
      if (writingStyle === 'academic' && config.parameters?.target?.default?.includes('初心者')) {
        result.addWarning(
          'Academic style may be too complex for beginners',
          'advanced.writingStyle'
        );
      }
    }

    return result;
  }

  /**
   * APIロジック検証
   */
  validateAPILogic(config) {
    const result = new ValidationResult();
    
    // Anthropic設定検証
    if (config.anthropic) {
      const { maxTokens, temperature, timeout } = config.anthropic;
      
      // トークン数と温度の関係
      if (maxTokens > 4000 && temperature < 0.3) {
        result.addSuggestion(
          'High token count with low temperature may produce repetitive content',
          'anthropic',
          'Consider increasing temperature for longer content'
        );
      }
      
      // タイムアウト設定
      if (timeout < 30000) {
        result.addWarning(
          'Short timeout may cause failures for complex requests',
          'anthropic.timeout'
        );
      }
    }

    // レート制限設定検証
    if (config.rateLimits) {
      for (const [service, limits] of Object.entries(config.rateLimits)) {
        if (limits.requestsPerMinute > 100) {
          result.addWarning(
            `High rate limit for ${service} may exceed API limits`,
            `rateLimits.${service}.requestsPerMinute`
          );
        }
      }
    }

    return result;
  }

  /**
   * 品質ロジック検証
   */
  validateQualityLogic(config) {
    const result = new ValidationResult();
    
    if (config.minQualityScore && config.minFactCheckScore) {
      // 品質スコアとファクトチェックスコアの関係
      if (config.minQualityScore > config.minFactCheckScore + 0.2) {
        result.addSuggestion(
          'Quality score threshold much higher than fact-check score',
          'quality',
          'Consider balancing quality and fact-check thresholds'
        );
      }
    }

    return result;
  }

  /**
   * パフォーマンス検証
   */
  validatePerformance(config, context) {
    const result = new ValidationResult();
    
    // API設定のパフォーマンス影響
    if (context.category === 'api' && config.anthropic) {
      const { maxTokens, retryAttempts } = config.anthropic;
      
      // 高いトークン数とリトライ回数
      if (maxTokens > 3000 && retryAttempts > 3) {
        result.addWarning(
          'High token count with many retries may cause long execution times',
          'anthropic'
        );
      }
    }

    // ワークフロー設定のパフォーマンス影響
    if (context.category === 'workflow' && config.advanced) {
      const { researchDepth, factCheckLevel } = config.advanced;
      
      if (researchDepth === 'deep' && factCheckLevel === 'strict') {
        result.addWarning(
          'Deep research with strict fact-checking may significantly increase execution time',
          'advanced'
        );
      }
    }

    return result;
  }

  /**
   * セキュリティ検証
   */
  validateSecurity(config, context) {
    const result = new ValidationResult();
    
    // API設定のセキュリティチェック
    if (context.category === 'api') {
      // タイムアウト設定が長すぎる場合
      if (config.anthropic?.timeout > 300000) { // 5分
        result.addWarning(
          'Very long timeout may cause resource exhaustion',
          'anthropic.timeout'
        );
      }
      
      // リトライ回数が多すぎる場合
      if (config.anthropic?.retryAttempts > 5) {
        result.addWarning(
          'Too many retry attempts may cause API abuse',
          'anthropic.retryAttempts'
        );
      }
    }

    return result;
  }

  /**
   * 互換性検証
   */
  validateCompatibility(config, context) {
    const result = new ValidationResult();
    
    // バージョン互換性チェック
    if (config.version) {
      const version = config.version;
      const [major] = version.split('.').map(Number);
      
      if (major > 1) {
        result.addWarning(
          `Configuration version ${version} may not be fully compatible`,
          'version'
        );
      }
    }

    return result;
  }

  // 基本バリデーター実装

  validateRequired(value, schema, fieldName) {
    const result = new ValidationResult();
    if (value === undefined || value === null || value === '') {
      result.addError(`Field is required`, fieldName, 'REQUIRED');
    }
    return result;
  }

  validateString(value, schema, fieldName) {
    const result = new ValidationResult();
    
    if (typeof value !== 'string') {
      result.addError(`Expected string, got ${typeof value}`, fieldName, 'TYPE_MISMATCH');
      return result;
    }

    if (schema.minLength && value.length < schema.minLength) {
      result.addError(`String too short (min: ${schema.minLength})`, fieldName, 'MIN_LENGTH');
    }

    if (schema.maxLength && value.length > schema.maxLength) {
      result.addError(`String too long (max: ${schema.maxLength})`, fieldName, 'MAX_LENGTH');
    }

    return result;
  }

  validateNumber(value, schema, fieldName) {
    const result = new ValidationResult();
    
    if (typeof value !== 'number' || isNaN(value)) {
      result.addError(`Expected number, got ${typeof value}`, fieldName, 'TYPE_MISMATCH');
      return result;
    }

    if (schema.minimum !== undefined && value < schema.minimum) {
      result.addError(`Number too small (min: ${schema.minimum})`, fieldName, 'MIN_VALUE');
    }

    if (schema.maximum !== undefined && value > schema.maximum) {
      result.addError(`Number too large (max: ${schema.maximum})`, fieldName, 'MAX_VALUE');
    }

    return result;
  }

  validateBoolean(value, schema, fieldName) {
    const result = new ValidationResult();
    
    if (typeof value !== 'boolean') {
      result.addError(`Expected boolean, got ${typeof value}`, fieldName, 'TYPE_MISMATCH');
    }

    return result;
  }

  validateArray(value, schema, fieldName) {
    const result = new ValidationResult();
    
    if (!Array.isArray(value)) {
      result.addError(`Expected array, got ${typeof value}`, fieldName, 'TYPE_MISMATCH');
      return result;
    }

    if (schema.minItems && value.length < schema.minItems) {
      result.addError(`Array too short (min: ${schema.minItems})`, fieldName, 'MIN_ITEMS');
    }

    if (schema.maxItems && value.length > schema.maxItems) {
      result.addError(`Array too long (max: ${schema.maxItems})`, fieldName, 'MAX_ITEMS');
    }

    // 配列要素の検証
    if (schema.items) {
      value.forEach((item, index) => {
        const itemResult = this.validateField(item, schema.items, `${fieldName}[${index}]`);
        result.merge(itemResult);
      });
    }

    return result;
  }

  validateObject(value, schema, fieldName) {
    const result = new ValidationResult();
    
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      result.addError(`Expected object, got ${typeof value}`, fieldName, 'TYPE_MISMATCH');
      return result;
    }

    return result;
  }

  validateEmail(value, schema, fieldName) {
    const result = new ValidationResult();
    
    if (typeof value !== 'string') {
      result.addError(`Expected string for email`, fieldName, 'TYPE_MISMATCH');
      return result;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      result.addError(`Invalid email format`, fieldName, 'INVALID_EMAIL');
    }

    return result;
  }

  validateURL(value, schema, fieldName) {
    const result = new ValidationResult();
    
    if (typeof value !== 'string') {
      result.addError(`Expected string for URL`, fieldName, 'TYPE_MISMATCH');
      return result;
    }

    try {
      new URL(value);
    } catch {
      result.addError(`Invalid URL format`, fieldName, 'INVALID_URL');
    }

    return result;
  }

  validateRange(value, schema, fieldName) {
    const result = new ValidationResult();
    
    if (typeof value !== 'number') {
      result.addError(`Expected number for range validation`, fieldName, 'TYPE_MISMATCH');
      return result;
    }

    if (schema.min !== undefined && value < schema.min) {
      result.addError(`Value below range (min: ${schema.min})`, fieldName, 'BELOW_RANGE');
    }

    if (schema.max !== undefined && value > schema.max) {
      result.addError(`Value above range (max: ${schema.max})`, fieldName, 'ABOVE_RANGE');
    }

    return result;
  }

  validateEnum(value, schema, fieldName) {
    const result = new ValidationResult();
    
    if (!schema.options || !Array.isArray(schema.options)) {
      result.addError(`Enum options not defined`, fieldName, 'ENUM_OPTIONS_MISSING');
      return result;
    }

    if (!schema.options.includes(value)) {
      result.addError(`Value not in allowed options: ${schema.options.join(', ')}`, fieldName, 'INVALID_ENUM');
    }

    return result;
  }

  validatePattern(value, schema, fieldName) {
    const result = new ValidationResult();
    
    if (typeof value !== 'string') {
      result.addError(`Expected string for pattern validation`, fieldName, 'TYPE_MISMATCH');
      return result;
    }

    if (schema.pattern) {
      const regex = new RegExp(schema.pattern);
      if (!regex.test(value)) {
        result.addError(`Value does not match pattern: ${schema.pattern}`, fieldName, 'PATTERN_MISMATCH');
      }
    }

    return result;
  }

  /**
   * カスタムルールを追加
   */
  addCustomRule(name, validator) {
    this.customRules.set(name, validator);
  }

  /**
   * 設定の健全性チェック
   */
  performHealthCheck(config, context = {}) {
    const result = new ValidationResult();
    
    try {
      // 基本的な健全性チェック
      if (!config || typeof config !== 'object') {
        result.addError('Configuration is not a valid object');
        return result;
      }

      // 循環参照チェック
      try {
        JSON.stringify(config);
      } catch (error) {
        result.addError('Configuration contains circular references');
      }

      // 深度チェック
      const depth = this.calculateObjectDepth(config);
      if (depth > 10) {
        result.addWarning(`Configuration is very deeply nested (depth: ${depth})`);
      }

      // サイズチェック
      const size = JSON.stringify(config).length;
      if (size > 100000) { // 100KB
        result.addWarning(`Configuration is very large (${Math.round(size / 1024)}KB)`);
      }

    } catch (error) {
      result.addError(`Health check failed: ${error.message}`);
    }

    return result;
  }

  /**
   * オブジェクトの深度を計算
   */
  calculateObjectDepth(obj, depth = 0) {
    if (typeof obj !== 'object' || obj === null) {
      return depth;
    }

    let maxDepth = depth;
    for (const value of Object.values(obj)) {
      if (typeof value === 'object' && value !== null) {
        const childDepth = this.calculateObjectDepth(value, depth + 1);
        maxDepth = Math.max(maxDepth, childDepth);
      }
    }

    return maxDepth;
  }
}

/**
 * グローバル設定バリデーターインスタンス
 */
export const globalValidator = new ConfigValidator();

export default ConfigValidator;