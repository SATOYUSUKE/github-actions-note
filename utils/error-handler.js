/**
 * 包括的なエラーハンドリングシステム
 * ジョブレベルのエラーハンドリング、リトライロジック、サービス固有のエラーハンドラーを提供
 */

import { Logger } from './logger.js';
import { FileManager } from './file-manager.js';

/**
 * エラータイプの定義
 */
export const ErrorTypes = {
  API_ERROR: 'api_error',
  NETWORK_ERROR: 'network_error',
  AUTHENTICATION_ERROR: 'authentication_error',
  VALIDATION_ERROR: 'validation_error',
  TIMEOUT_ERROR: 'timeout_error',
  RATE_LIMIT_ERROR: 'rate_limit_error',
  QUOTA_EXCEEDED_ERROR: 'quota_exceeded_error',
  SERVICE_UNAVAILABLE_ERROR: 'service_unavailable_error',
  BROWSER_ERROR: 'browser_error',
  FILE_ERROR: 'file_error',
  UNKNOWN_ERROR: 'unknown_error'
};

/**
 * エラー重要度レベル
 */
export const ErrorSeverity = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

/**
 * ジョブエラークラス
 */
export class JobError extends Error {
  constructor(jobName, errorType, message, details = {}, retryable = false, severity = ErrorSeverity.HIGH) {
    super(message);
    this.name = 'JobError';
    this.jobName = jobName;
    this.errorType = errorType;
    this.details = details;
    this.retryable = retryable;
    this.severity = severity;
    this.timestamp = new Date().toISOString();
    this.errorId = this.generateErrorId();
  }

  generateErrorId() {
    return `${this.jobName}-${this.errorType}-${Date.now()}`;
  }

  toJSON() {
    return {
      errorId: this.errorId,
      jobName: this.jobName,
      errorType: this.errorType,
      message: this.message,
      details: this.details,
      retryable: this.retryable,
      severity: this.severity,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

/**
 * メインエラーハンドラークラス
 */
export class WorkflowErrorHandler {
  constructor() {
    this.errorHistory = [];
    this.retryAttempts = new Map();
    this.maxRetries = 3;
    this.baseRetryDelay = 1000; // 1秒
  }

  /**
   * ジョブエラーを処理
   */
  async handleJobError(error, context = {}) {
    Logger.error('Handling job error', {
      errorId: error.errorId,
      jobName: error.jobName,
      errorType: error.errorType,
      message: error.message
    });

    // エラー履歴に記録
    this.errorHistory.push(error);

    // エラーレポートを保存
    await this.saveErrorReport(error, context);

    // エラータイプ別の処理
    switch (error.errorType) {
      case ErrorTypes.API_ERROR:
        return await this.handleAPIError(error, context);
      
      case ErrorTypes.NETWORK_ERROR:
        return await this.handleNetworkError(error, context);
      
      case ErrorTypes.AUTHENTICATION_ERROR:
        return await this.handleAuthenticationError(error, context);
      
      case ErrorTypes.RATE_LIMIT_ERROR:
        return await this.handleRateLimitError(error, context);
      
      case ErrorTypes.TIMEOUT_ERROR:
        return await this.handleTimeoutError(error, context);
      
      case ErrorTypes.BROWSER_ERROR:
        return await this.handleBrowserError(error, context);
      
      case ErrorTypes.VALIDATION_ERROR:
        return await this.handleValidationError(error, context);
      
      default:
        return await this.handleUnknownError(error, context);
    }
  }

  /**
   * APIエラーの処理
   */
  async handleAPIError(error, context) {
    const { details } = error;
    
    // レート制限エラー
    if (details.statusCode === 429 || details.message?.includes('rate limit')) {
      return await this.handleRateLimitError(error, context);
    }
    
    // クォータ超過エラー
    if (details.statusCode === 402 || details.message?.includes('quota') || details.message?.includes('billing')) {
      const quotaError = new JobError(
        error.jobName,
        ErrorTypes.QUOTA_EXCEEDED_ERROR,
        'API quota exceeded',
        details,
        false,
        ErrorSeverity.CRITICAL
      );
      throw quotaError;
    }
    
    // サーバーエラー（5xx）
    if (details.statusCode >= 500) {
      if (error.retryable && this.shouldRetry(error)) {
        return await this.retryWithBackoff(error, context);
      }
    }
    
    // クライアントエラー（4xx）
    if (details.statusCode >= 400 && details.statusCode < 500) {
      // 認証エラー
      if (details.statusCode === 401 || details.statusCode === 403) {
        const authError = new JobError(
          error.jobName,
          ErrorTypes.AUTHENTICATION_ERROR,
          'API authentication failed',
          details,
          false,
          ErrorSeverity.CRITICAL
        );
        throw authError;
      }
      
      // その他のクライアントエラーは再試行しない
      throw error;
    }
    
    // その他のAPIエラー
    if (error.retryable && this.shouldRetry(error)) {
      return await this.retryWithBackoff(error, context);
    }
    
    throw error;
  }

  /**
   * ネットワークエラーの処理
   */
  async handleNetworkError(error, context) {
    Logger.warn('Network error detected, attempting retry', {
      errorId: error.errorId,
      attempt: this.getRetryCount(error) + 1
    });

    if (this.shouldRetry(error)) {
      return await this.retryWithBackoff(error, context);
    }

    throw error;
  }

  /**
   * 認証エラーの処理
   */
  async handleAuthenticationError(error, context) {
    Logger.error('Authentication error - credentials may be invalid or expired', {
      errorId: error.errorId,
      jobName: error.jobName
    });

    // 認証エラーは通常再試行不可
    const enhancedError = new JobError(
      error.jobName,
      ErrorTypes.AUTHENTICATION_ERROR,
      `Authentication failed: ${error.message}. Please check and update credentials.`,
      {
        ...error.details,
        troubleshooting: this.getAuthTroubleshootingSteps(error.jobName)
      },
      false,
      ErrorSeverity.CRITICAL
    );

    throw enhancedError;
  }

  /**
   * レート制限エラーの処理
   */
  async handleRateLimitError(error, context) {
    const retryAfter = error.details.retryAfter || this.calculateBackoffDelay(error);
    
    Logger.warn('Rate limit exceeded, waiting before retry', {
      errorId: error.errorId,
      retryAfter: retryAfter,
      attempt: this.getRetryCount(error) + 1
    });

    if (this.shouldRetry(error)) {
      await this.wait(retryAfter);
      return await this.retryOperation(error, context);
    }

    throw error;
  }

  /**
   * タイムアウトエラーの処理
   */
  async handleTimeoutError(error, context) {
    Logger.warn('Timeout error detected', {
      errorId: error.errorId,
      timeout: error.details.timeout
    });

    if (this.shouldRetry(error)) {
      // タイムアウト値を増加させて再試行
      const newTimeout = (error.details.timeout || 30000) * 1.5;
      const newContext = {
        ...context,
        timeout: newTimeout
      };
      
      return await this.retryWithBackoff(error, newContext);
    }

    throw error;
  }

  /**
   * ブラウザエラーの処理
   */
  async handleBrowserError(error, context) {
    Logger.warn('Browser error detected', {
      errorId: error.errorId,
      details: error.details
    });

    // ブラウザの再起動が必要な場合
    if (error.details.needsBrowserRestart) {
      if (context.restartBrowser && typeof context.restartBrowser === 'function') {
        Logger.info('Restarting browser due to error');
        await context.restartBrowser();
      }
    }

    if (this.shouldRetry(error)) {
      return await this.retryWithBackoff(error, context);
    }

    throw error;
  }

  /**
   * バリデーションエラーの処理
   */
  async handleValidationError(error, context) {
    Logger.error('Validation error - input data is invalid', {
      errorId: error.errorId,
      validationDetails: error.details
    });

    // バリデーションエラーは通常再試行不可
    const enhancedError = new JobError(
      error.jobName,
      ErrorTypes.VALIDATION_ERROR,
      `Validation failed: ${error.message}`,
      {
        ...error.details,
        suggestions: this.getValidationSuggestions(error.details)
      },
      false,
      ErrorSeverity.HIGH
    );

    throw enhancedError;
  }

  /**
   * 未知のエラーの処理
   */
  async handleUnknownError(error, context) {
    Logger.error('Unknown error type detected', {
      errorId: error.errorId,
      originalError: error.message
    });

    // 未知のエラーは慎重に再試行
    if (error.retryable && this.getRetryCount(error) < 1) {
      return await this.retryWithBackoff(error, context);
    }

    throw error;
  }

  /**
   * 指数バックオフでリトライ
   */
  async retryWithBackoff(error, context) {
    const retryCount = this.getRetryCount(error);
    const delay = this.calculateBackoffDelay(error, retryCount);
    
    Logger.info('Retrying with exponential backoff', {
      errorId: error.errorId,
      attempt: retryCount + 1,
      delay: delay
    });

    await this.wait(delay);
    return await this.retryOperation(error, context);
  }

  /**
   * 操作をリトライ
   */
  async retryOperation(error, context) {
    const retryCount = this.incrementRetryCount(error);
    
    if (context.retryFunction && typeof context.retryFunction === 'function') {
      try {
        return await context.retryFunction(retryCount, context);
      } catch (retryError) {
        // リトライ中にエラーが発生した場合
        const newError = this.wrapRetryError(error, retryError, retryCount);
        return await this.handleJobError(newError, context);
      }
    }

    throw new JobError(
      error.jobName,
      ErrorTypes.UNKNOWN_ERROR,
      'Retry function not provided',
      { originalError: error },
      false,
      ErrorSeverity.HIGH
    );
  }

  /**
   * リトライすべきかどうかを判定
   */
  shouldRetry(error) {
    if (!error.retryable) {
      return false;
    }

    const retryCount = this.getRetryCount(error);
    return retryCount < this.maxRetries;
  }

  /**
   * リトライ回数を取得
   */
  getRetryCount(error) {
    return this.retryAttempts.get(error.errorId) || 0;
  }

  /**
   * リトライ回数を増加
   */
  incrementRetryCount(error) {
    const currentCount = this.getRetryCount(error);
    const newCount = currentCount + 1;
    this.retryAttempts.set(error.errorId, newCount);
    return newCount;
  }

  /**
   * バックオフ遅延を計算
   */
  calculateBackoffDelay(error, retryCount = null) {
    const count = retryCount !== null ? retryCount : this.getRetryCount(error);
    const jitter = Math.random() * 1000; // ランダムジッター
    return Math.min(this.baseRetryDelay * Math.pow(2, count) + jitter, 30000); // 最大30秒
  }

  /**
   * 待機
   */
  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * リトライエラーをラップ
   */
  wrapRetryError(originalError, retryError, retryCount) {
    return new JobError(
      originalError.jobName,
      originalError.errorType,
      `Retry ${retryCount} failed: ${retryError.message}`,
      {
        originalError: originalError.toJSON(),
        retryError: retryError.message,
        retryCount: retryCount
      },
      originalError.retryable,
      originalError.severity
    );
  }

  /**
   * 認証トラブルシューティング手順を取得
   */
  getAuthTroubleshootingSteps(jobName) {
    const commonSteps = [
      'GitHub Secretsで認証情報が正しく設定されているか確認',
      'APIキーの有効期限が切れていないか確認',
      'APIキーに必要な権限が付与されているか確認'
    ];

    const jobSpecificSteps = {
      'Research Job': [
        'ANTHROPIC_API_KEYが正しく設定されているか確認',
        'Anthropic APIの利用制限に達していないか確認'
      ],
      'Writing Job': [
        'ANTHROPIC_API_KEYが正しく設定されているか確認',
        'Claude Sonnet 4.5へのアクセス権限があるか確認'
      ],
      'Fact Check Job': [
        'TAVILY_API_KEYが正しく設定されているか確認',
        'Tavily APIの利用制限に達していないか確認'
      ],
      'Publishing Job': [
        'NOTE_STORAGE_STATE_JSONが正しく設定されているか確認',
        'note.comのログイン状態が有効か確認',
        'ストレージ状態が期限切れでないか確認'
      ]
    };

    return [...commonSteps, ...(jobSpecificSteps[jobName] || [])];
  }

  /**
   * バリデーション提案を取得
   */
  getValidationSuggestions(validationDetails) {
    const suggestions = [];

    if (validationDetails.missingFields) {
      suggestions.push(`必須フィールドが不足: ${validationDetails.missingFields.join(', ')}`);
    }

    if (validationDetails.invalidFormat) {
      suggestions.push('入力データの形式を確認してください');
    }

    if (validationDetails.lengthError) {
      suggestions.push('入力データの長さが制限を超えています');
    }

    return suggestions;
  }

  /**
   * エラーレポートを保存
   */
  async saveErrorReport(error, context) {
    try {
      await FileManager.ensureDirectory('outputs/errors');
      
      const errorReport = {
        error: error.toJSON(),
        context: {
          ...context,
          // 機密情報を除外
          retryFunction: context.retryFunction ? '[Function]' : undefined,
          restartBrowser: context.restartBrowser ? '[Function]' : undefined
        },
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          timestamp: new Date().toISOString()
        },
        errorHistory: this.errorHistory.slice(-10) // 最新10件のエラー履歴
      };

      const filename = `error-${error.errorId}.json`;
      await FileManager.writeJSON(`outputs/errors/${filename}`, errorReport);
      
      Logger.info(`Error report saved: ${filename}`);
      
    } catch (saveError) {
      Logger.error('Failed to save error report', saveError);
    }
  }

  /**
   * エラー統計を取得
   */
  getErrorStatistics() {
    const stats = {
      totalErrors: this.errorHistory.length,
      errorsByType: {},
      errorsByJob: {},
      errorsBySeverity: {},
      retryableErrors: 0,
      recentErrors: this.errorHistory.slice(-5)
    };

    this.errorHistory.forEach(error => {
      // エラータイプ別
      stats.errorsByType[error.errorType] = (stats.errorsByType[error.errorType] || 0) + 1;
      
      // ジョブ別
      stats.errorsByJob[error.jobName] = (stats.errorsByJob[error.jobName] || 0) + 1;
      
      // 重要度別
      stats.errorsBySeverity[error.severity] = (stats.errorsBySeverity[error.severity] || 0) + 1;
      
      // リトライ可能エラー
      if (error.retryable) {
        stats.retryableErrors++;
      }
    });

    return stats;
  }

  /**
   * エラー履歴をクリア
   */
  clearErrorHistory() {
    this.errorHistory = [];
    this.retryAttempts.clear();
    Logger.info('Error history cleared');
  }
}

/**
 * サービス固有のエラーハンドラー
 */

/**
 * Anthropic APIエラーハンドラー
 */
export class AnthropicErrorHandler {
  static handleError(error, jobName) {
    const details = {
      statusCode: error.status,
      message: error.message,
      type: error.type,
      headers: error.headers
    };

    // レート制限
    if (error.status === 429) {
      const retryAfter = error.headers?.['retry-after'] ? 
        parseInt(error.headers['retry-after']) * 1000 : 
        60000; // デフォルト1分

      return new JobError(
        jobName,
        ErrorTypes.RATE_LIMIT_ERROR,
        'Anthropic API rate limit exceeded',
        { ...details, retryAfter },
        true,
        ErrorSeverity.MEDIUM
      );
    }

    // クォータ超過
    if (error.status === 402 || error.message?.includes('billing')) {
      return new JobError(
        jobName,
        ErrorTypes.QUOTA_EXCEEDED_ERROR,
        'Anthropic API quota exceeded',
        details,
        false,
        ErrorSeverity.CRITICAL
      );
    }

    // 認証エラー
    if (error.status === 401) {
      return new JobError(
        jobName,
        ErrorTypes.AUTHENTICATION_ERROR,
        'Anthropic API authentication failed',
        details,
        false,
        ErrorSeverity.CRITICAL
      );
    }

    // サーバーエラー
    if (error.status >= 500) {
      return new JobError(
        jobName,
        ErrorTypes.API_ERROR,
        'Anthropic API server error',
        details,
        true,
        ErrorSeverity.HIGH
      );
    }

    // その他のAPIエラー
    return new JobError(
      jobName,
      ErrorTypes.API_ERROR,
      `Anthropic API error: ${error.message}`,
      details,
      false,
      ErrorSeverity.HIGH
    );
  }
}

/**
 * Tavily APIエラーハンドラー
 */
export class TavilyErrorHandler {
  static handleError(error, jobName) {
    const details = {
      statusCode: error.status,
      message: error.message,
      url: error.url
    };

    // レート制限
    if (error.status === 429) {
      return new JobError(
        jobName,
        ErrorTypes.RATE_LIMIT_ERROR,
        'Tavily API rate limit exceeded',
        details,
        true,
        ErrorSeverity.MEDIUM
      );
    }

    // 認証エラー
    if (error.status === 401 || error.status === 403) {
      return new JobError(
        jobName,
        ErrorTypes.AUTHENTICATION_ERROR,
        'Tavily API authentication failed',
        details,
        false,
        ErrorSeverity.CRITICAL
      );
    }

    // 無効なクエリ
    if (error.status === 400) {
      return new JobError(
        jobName,
        ErrorTypes.VALIDATION_ERROR,
        'Tavily API invalid query',
        details,
        false,
        ErrorSeverity.MEDIUM
      );
    }

    // サーバーエラー
    if (error.status >= 500) {
      return new JobError(
        jobName,
        ErrorTypes.API_ERROR,
        'Tavily API server error',
        details,
        true,
        ErrorSeverity.HIGH
      );
    }

    return new JobError(
      jobName,
      ErrorTypes.API_ERROR,
      `Tavily API error: ${error.message}`,
      details,
      false,
      ErrorSeverity.HIGH
    );
  }
}

/**
 * Playwrightエラーハンドラー
 */
export class PlaywrightErrorHandler {
  static handleError(error, jobName) {
    const details = {
      message: error.message,
      name: error.name,
      stack: error.stack
    };

    // タイムアウトエラー
    if (error.message.includes('Timeout') || error.name === 'TimeoutError') {
      return new JobError(
        jobName,
        ErrorTypes.TIMEOUT_ERROR,
        'Playwright operation timeout',
        { ...details, timeout: 30000 },
        true,
        ErrorSeverity.MEDIUM
      );
    }

    // ナビゲーションエラー
    if (error.message.includes('Navigation') || error.message.includes('net::')) {
      return new JobError(
        jobName,
        ErrorTypes.NETWORK_ERROR,
        'Playwright navigation error',
        details,
        true,
        ErrorSeverity.MEDIUM
      );
    }

    // 要素が見つからない
    if (error.message.includes('Element') && error.message.includes('not found')) {
      return new JobError(
        jobName,
        ErrorTypes.BROWSER_ERROR,
        'Playwright element not found',
        details,
        true,
        ErrorSeverity.MEDIUM
      );
    }

    // 認証失敗
    if (error.message.includes('authentication') || error.message.includes('login')) {
      return new JobError(
        jobName,
        ErrorTypes.AUTHENTICATION_ERROR,
        'Playwright authentication failed',
        { ...details, needsBrowserRestart: true },
        false,
        ErrorSeverity.CRITICAL
      );
    }

    // その他のブラウザエラー
    return new JobError(
      jobName,
      ErrorTypes.BROWSER_ERROR,
      `Playwright error: ${error.message}`,
      details,
      true,
      ErrorSeverity.MEDIUM
    );
  }
}

// デフォルトエクスポート
export default WorkflowErrorHandler;