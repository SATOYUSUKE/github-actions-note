/**
 * 環境変数検証ユーティリティ
 */

import { Logger } from './logger.js';

export class EnvValidator {
  /**
   * Anthropic API キーを検証
   */
  static validateAnthropicKey() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    
    if (apiKey.length < 20) {
      throw new Error('ANTHROPIC_API_KEY appears to be invalid (too short)');
    }
    
    if (!apiKey.startsWith('sk-ant-')) {
      Logger.warn('ANTHROPIC_API_KEY does not start with expected prefix "sk-ant-"');
    }
    
    Logger.info('Anthropic API key validation passed');
    return true;
  }

  /**
   * Tavily API キーを検証
   */
  static validateTavilyKey() {
    const apiKey = process.env.TAVILY_API_KEY;
    
    if (!apiKey) {
      throw new Error('TAVILY_API_KEY environment variable is required');
    }
    
    if (apiKey.length < 10) {
      throw new Error('TAVILY_API_KEY appears to be invalid (too short)');
    }
    
    Logger.info('Tavily API key validation passed');
    return true;
  }

  /**
   * Note認証情報を検証
   */
  static validateNoteCredentials() {
    const storageState = process.env.NOTE_STORAGE_STATE_JSON;
    
    if (!storageState) {
      throw new Error('NOTE_STORAGE_STATE_JSON environment variable is required');
    }
    
    try {
      const parsed = JSON.parse(storageState);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid storage state format');
      }
      Logger.info('Note credentials validation passed');
      return true;
    } catch (error) {
      throw new Error(`Invalid NOTE_STORAGE_STATE_JSON format: ${error.message}`);
    }
  }

  /**
   * 互換メソッド: NOTE_STORAGE_STATE の検証
   * Publishing Job からの呼び出しに対応するためのエイリアス
   */
  static validateNoteStorageState() {
    return this.validateNoteCredentials();
  }

  /**
   * GitHub Actions環境を検証
   */
  static validateGitHubEnvironment() {
    const requiredVars = ['GITHUB_RUN_ID', 'GITHUB_JOB'];
    
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        Logger.warn(`GitHub environment variable ${varName} is not set`);
      }
    }
    
    Logger.info('GitHub environment validation completed');
    return true;
  }

  /**
   * 全環境変数を検証
   */
  static validateAll() {
    const results = {
      anthropic: false,
      tavily: false,
      note: false,
      github: false,
    };
    
    try {
      results.anthropic = this.validateAnthropicKey();
    } catch (error) {
      Logger.error('Anthropic validation failed', error.message);
    }
    
    try {
      results.tavily = this.validateTavilyKey();
    } catch (error) {
      Logger.warn('Tavily validation failed (optional)', error.message);
    }
    
    try {
      results.note = this.validateNoteCredentials();
    } catch (error) {
      Logger.warn('Note validation failed (optional)', error.message);
    }
    
    try {
      results.github = this.validateGitHubEnvironment();
    } catch (error) {
      Logger.warn('GitHub validation failed', error.message);
    }
    
    Logger.info('Environment validation completed', results);
    return results;
  }
}

