/**
 * ログ出力ユーティリティ
 */

export class Logger {
  /**
   * 情報ログを出力
   */
  static info(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] INFO: ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  /**
   * 警告ログを出力
   */
  static warn(message, data = null) {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] WARN: ${message}`);
    if (data) {
      console.warn(JSON.stringify(data, null, 2));
    }
  }

  /**
   * エラーログを出力
   */
  static error(message, data = null) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ERROR: ${message}`);
    if (data) {
      console.error(JSON.stringify(data, null, 2));
    }
  }

  /**
   * ジョブ開始ログを出力
   */
  static jobStart(jobName) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] JOB_START: ${jobName}`);
  }

  /**
   * ジョブ完了ログを出力
   */
  static jobComplete(jobName, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] JOB_COMPLETE: ${jobName}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  /**
   * ジョブエラーログを出力
   */
  static jobError(jobName, error) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] JOB_ERROR: ${jobName}`);
    console.error(error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }

  /**
   * デバッグログを出力（開発環境のみ）
   */
  static debug(message, data = null) {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] DEBUG: ${message}`);
      if (data) {
        console.log(JSON.stringify(data, null, 2));
      }
    }
  }
}

