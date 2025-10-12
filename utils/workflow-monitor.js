/**
 * ワークフローモニタリングとパフォーマンストラッキングシステム
 * ジョブ進捗ログ、ステータスレポート、API使用量追跡、パフォーマンスメトリクス収集を提供
 */

import { Logger } from './logger.js';
import { FileManager } from './file-manager.js';

/**
 * ジョブステータス定義
 */
export const JobStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  RETRYING: 'retrying'
};

/**
 * メトリクスタイプ定義
 */
export const MetricTypes = {
  EXECUTION_TIME: 'execution_time',
  API_CALLS: 'api_calls',
  API_RESPONSE_TIME: 'api_response_time',
  MEMORY_USAGE: 'memory_usage',
  ERROR_RATE: 'error_rate',
  SUCCESS_RATE: 'success_rate',
  THROUGHPUT: 'throughput'
};

/**
 * ワークフローモニタークラス
 */
export class WorkflowMonitor {
  constructor() {
    this.jobs = new Map();
    this.metrics = new Map();
    this.apiUsage = new Map();
    this.performanceData = [];
    this.startTime = Date.now();
    this.workflowId = this.generateWorkflowId();
  }

  /**
   * ワークフローIDを生成
   */
  generateWorkflowId() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substring(2, 8);
    return `workflow-${timestamp}-${random}`;
  }

  /**
   * ジョブを開始
   */
  startJob(jobName, inputs = {}) {
    const jobId = `${jobName}-${Date.now()}`;
    const job = {
      id: jobId,
      name: jobName,
      status: JobStatus.RUNNING,
      startTime: Date.now(),
      endTime: null,
      duration: null,
      inputs: this.sanitizeInputs(inputs),
      outputs: null,
      error: null,
      retryCount: 0,
      metrics: {
        apiCalls: 0,
        memoryUsage: this.getCurrentMemoryUsage(),
        startMemory: this.getCurrentMemoryUsage()
      },
      progress: {
        current: 0,
        total: 100,
        stage: 'initializing',
        message: `Starting ${jobName}...`
      }
    };

    this.jobs.set(jobId, job);
    
    Logger.info(`Job started: ${jobName}`, {
      jobId,
      workflowId: this.workflowId,
      startTime: new Date(job.startTime).toISOString()
    });

    return jobId;
  }

  /**
   * ジョブ進捗を更新
   */
  updateJobProgress(jobId, progress, stage = null, message = null) {
    const job = this.jobs.get(jobId);
    if (!job) {
      Logger.warn(`Job not found for progress update: ${jobId}`);
      return;
    }

    job.progress.current = Math.min(100, Math.max(0, progress));
    if (stage) job.progress.stage = stage;
    if (message) job.progress.message = message;

    Logger.info(`Job progress updated: ${job.name}`, {
      jobId,
      progress: job.progress.current,
      stage: job.progress.stage,
      message: job.progress.message
    });

    // GitHub Actions出力を更新
    this.updateGitHubActionsProgress(job);
  }

  /**
   * ジョブを完了
   */
  completeJob(jobId, outputs = {}, error = null) {
    const job = this.jobs.get(jobId);
    if (!job) {
      Logger.warn(`Job not found for completion: ${jobId}`);
      return;
    }

    job.endTime = Date.now();
    job.duration = job.endTime - job.startTime;
    job.status = error ? JobStatus.FAILED : JobStatus.COMPLETED;
    job.outputs = this.sanitizeOutputs(outputs);
    job.error = error ? this.sanitizeError(error) : null;
    job.metrics.endMemory = this.getCurrentMemoryUsage();
    job.metrics.memoryDelta = job.metrics.endMemory - job.metrics.startMemory;
    job.progress.current = error ? job.progress.current : 100;
    job.progress.stage = error ? 'failed' : 'completed';
    job.progress.message = error ? `Failed: ${error.message}` : 'Completed successfully';

    // パフォーマンスメトリクスを記録
    this.recordPerformanceMetric(job.name, MetricTypes.EXECUTION_TIME, job.duration);
    this.recordPerformanceMetric(job.name, MetricTypes.MEMORY_USAGE, job.metrics.memoryDelta);

    Logger.info(`Job ${job.status}: ${job.name}`, {
      jobId,
      duration: job.duration,
      status: job.status,
      memoryDelta: job.metrics.memoryDelta
    });

    // 最終的なGitHub Actions出力を更新
    this.updateGitHubActionsProgress(job);
  }

  /**
   * ジョブリトライを記録
   */
  recordJobRetry(jobId, retryReason) {
    const job = this.jobs.get(jobId);
    if (!job) {
      Logger.warn(`Job not found for retry record: ${jobId}`);
      return;
    }

    job.retryCount++;
    job.status = JobStatus.RETRYING;
    job.progress.stage = 'retrying';
    job.progress.message = `Retrying (${job.retryCount}): ${retryReason}`;

    Logger.info(`Job retry recorded: ${job.name}`, {
      jobId,
      retryCount: job.retryCount,
      reason: retryReason
    });
  }

  /**
   * API呼び出しを追跡
   */
  trackAPICall(service, endpoint, responseTime, success = true, details = {}) {
    const apiKey = `${service}:${endpoint}`;
    
    if (!this.apiUsage.has(apiKey)) {
      this.apiUsage.set(apiKey, {
        service,
        endpoint,
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        totalResponseTime: 0,
        averageResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
        lastCallTime: null,
        quotaUsed: 0,
        quotaLimit: details.quotaLimit || null,
        rateLimitRemaining: details.rateLimitRemaining || null,
        rateLimitReset: details.rateLimitReset || null
      });
    }

    const usage = this.apiUsage.get(apiKey);
    usage.totalCalls++;
    usage.lastCallTime = Date.now();
    
    if (success) {
      usage.successfulCalls++;
    } else {
      usage.failedCalls++;
    }

    if (responseTime !== null && responseTime !== undefined) {
      usage.totalResponseTime += responseTime;
      usage.averageResponseTime = usage.totalResponseTime / usage.totalCalls;
      usage.minResponseTime = Math.min(usage.minResponseTime, responseTime);
      usage.maxResponseTime = Math.max(usage.maxResponseTime, responseTime);
    }

    // レート制限情報を更新
    if (details.rateLimitRemaining !== undefined) {
      usage.rateLimitRemaining = details.rateLimitRemaining;
    }
    if (details.rateLimitReset !== undefined) {
      usage.rateLimitReset = details.rateLimitReset;
    }
    if (details.quotaUsed !== undefined) {
      usage.quotaUsed = details.quotaUsed;
    }

    // パフォーマンスメトリクスを記録
    this.recordPerformanceMetric(service, MetricTypes.API_CALLS, 1);
    if (responseTime) {
      this.recordPerformanceMetric(service, MetricTypes.API_RESPONSE_TIME, responseTime);
    }

    Logger.debug(`API call tracked: ${service}/${endpoint}`, {
      responseTime,
      success,
      totalCalls: usage.totalCalls,
      successRate: (usage.successfulCalls / usage.totalCalls * 100).toFixed(1)
    });
  }

  /**
   * パフォーマンスメトリクスを記録
   */
  recordPerformanceMetric(component, metricType, value, metadata = {}) {
    const metric = {
      timestamp: Date.now(),
      component,
      type: metricType,
      value,
      metadata
    };

    this.performanceData.push(metric);

    // メトリクス集計を更新
    const key = `${component}:${metricType}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        component,
        type: metricType,
        count: 0,
        sum: 0,
        min: Infinity,
        max: -Infinity,
        average: 0,
        recent: []
      });
    }

    const aggregated = this.metrics.get(key);
    aggregated.count++;
    aggregated.sum += value;
    aggregated.min = Math.min(aggregated.min, value);
    aggregated.max = Math.max(aggregated.max, value);
    aggregated.average = aggregated.sum / aggregated.count;
    aggregated.recent.push({ timestamp: metric.timestamp, value });

    // 最新100件のみ保持
    if (aggregated.recent.length > 100) {
      aggregated.recent = aggregated.recent.slice(-100);
    }
  }

  /**
   * ワークフロー全体のステータスを取得
   */
  getWorkflowStatus() {
    const jobs = Array.from(this.jobs.values());
    const totalJobs = jobs.length;
    const completedJobs = jobs.filter(job => job.status === JobStatus.COMPLETED).length;
    const failedJobs = jobs.filter(job => job.status === JobStatus.FAILED).length;
    const runningJobs = jobs.filter(job => job.status === JobStatus.RUNNING).length;
    const retryingJobs = jobs.filter(job => job.status === JobStatus.RETRYING).length;

    const currentTime = Date.now();
    const totalDuration = currentTime - this.startTime;

    let overallProgress = 0;
    if (totalJobs > 0) {
      const totalProgress = jobs.reduce((sum, job) => sum + job.progress.current, 0);
      overallProgress = totalProgress / totalJobs;
    }

    let status = 'running';
    if (totalJobs === 0) {
      status = 'pending';
    } else if (failedJobs > 0) {
      status = 'failed';
    } else if (completedJobs === totalJobs) {
      status = 'completed';
    } else if (retryingJobs > 0) {
      status = 'retrying';
    }

    return {
      workflowId: this.workflowId,
      status,
      progress: Math.round(overallProgress),
      startTime: this.startTime,
      duration: totalDuration,
      jobs: {
        total: totalJobs,
        completed: completedJobs,
        failed: failedJobs,
        running: runningJobs,
        retrying: retryingJobs
      },
      currentStage: this.getCurrentStage(jobs),
      estimatedCompletion: this.estimateCompletion(jobs, totalDuration)
    };
  }

  /**
   * API使用量レポートを生成
   */
  generateAPIUsageReport() {
    const report = {
      timestamp: new Date().toISOString(),
      workflowId: this.workflowId,
      services: {},
      summary: {
        totalAPICalls: 0,
        totalSuccessfulCalls: 0,
        totalFailedCalls: 0,
        overallSuccessRate: 0,
        averageResponseTime: 0
      }
    };

    let totalCalls = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;
    let totalResponseTime = 0;
    let totalResponseCount = 0;

    for (const [key, usage] of this.apiUsage) {
      const [service] = key.split(':');
      
      if (!report.services[service]) {
        report.services[service] = {
          totalCalls: 0,
          successfulCalls: 0,
          failedCalls: 0,
          successRate: 0,
          averageResponseTime: 0,
          quotaStatus: null,
          rateLimitStatus: null,
          endpoints: {}
        };
      }

      const serviceReport = report.services[service];
      serviceReport.totalCalls += usage.totalCalls;
      serviceReport.successfulCalls += usage.successfulCalls;
      serviceReport.failedCalls += usage.failedCalls;
      serviceReport.endpoints[usage.endpoint] = {
        calls: usage.totalCalls,
        successRate: (usage.successfulCalls / usage.totalCalls * 100).toFixed(1),
        averageResponseTime: usage.averageResponseTime.toFixed(0),
        minResponseTime: usage.minResponseTime === Infinity ? 0 : usage.minResponseTime,
        maxResponseTime: usage.maxResponseTime
      };

      // クォータとレート制限の状況
      if (usage.quotaLimit) {
        serviceReport.quotaStatus = {
          used: usage.quotaUsed,
          limit: usage.quotaLimit,
          remaining: usage.quotaLimit - usage.quotaUsed,
          usagePercentage: (usage.quotaUsed / usage.quotaLimit * 100).toFixed(1)
        };
      }

      if (usage.rateLimitRemaining !== null) {
        serviceReport.rateLimitStatus = {
          remaining: usage.rateLimitRemaining,
          resetTime: usage.rateLimitReset ? new Date(usage.rateLimitReset).toISOString() : null
        };
      }

      totalCalls += usage.totalCalls;
      totalSuccessful += usage.successfulCalls;
      totalFailed += usage.failedCalls;
      
      if (usage.averageResponseTime > 0) {
        totalResponseTime += usage.totalResponseTime;
        totalResponseCount += usage.totalCalls;
      }
    }

    // サービス別の成功率を計算
    for (const service of Object.values(report.services)) {
      service.successRate = service.totalCalls > 0 ? 
        (service.successfulCalls / service.totalCalls * 100).toFixed(1) : 0;
      
      // サービス別の平均レスポンス時間を計算
      let serviceResponseTime = 0;
      let serviceResponseCount = 0;
      for (const endpoint of Object.values(service.endpoints)) {
        if (endpoint.averageResponseTime > 0) {
          serviceResponseTime += parseFloat(endpoint.averageResponseTime) * endpoint.calls;
          serviceResponseCount += endpoint.calls;
        }
      }
      service.averageResponseTime = serviceResponseCount > 0 ? 
        (serviceResponseTime / serviceResponseCount).toFixed(0) : 0;
    }

    // 全体サマリーを計算
    report.summary.totalAPICalls = totalCalls;
    report.summary.totalSuccessfulCalls = totalSuccessful;
    report.summary.totalFailedCalls = totalFailed;
    report.summary.overallSuccessRate = totalCalls > 0 ? 
      (totalSuccessful / totalCalls * 100).toFixed(1) : 0;
    report.summary.averageResponseTime = totalResponseCount > 0 ? 
      (totalResponseTime / totalResponseCount).toFixed(0) : 0;

    return report;
  }

  /**
   * パフォーマンスレポートを生成
   */
  generatePerformanceReport() {
    const report = {
      timestamp: new Date().toISOString(),
      workflowId: this.workflowId,
      duration: Date.now() - this.startTime,
      metrics: {},
      summary: {
        totalMetrics: this.performanceData.length,
        componentsMonitored: new Set(this.performanceData.map(m => m.component)).size,
        memoryUsage: this.getCurrentMemoryUsage(),
        systemLoad: this.getSystemLoad()
      }
    };

    // メトリクス別のレポート生成
    for (const [key, metric] of this.metrics) {
      const [component, type] = key.split(':');
      
      if (!report.metrics[component]) {
        report.metrics[component] = {};
      }

      report.metrics[component][type] = {
        count: metric.count,
        sum: metric.sum,
        average: parseFloat(metric.average.toFixed(2)),
        min: metric.min === Infinity ? 0 : metric.min,
        max: metric.max === -Infinity ? 0 : metric.max,
        trend: this.calculateTrend(metric.recent),
        recentValues: metric.recent.slice(-10).map(r => ({
          timestamp: new Date(r.timestamp).toISOString(),
          value: r.value
        }))
      };
    }

    // パフォーマンス分析
    report.analysis = this.analyzePerformance();

    return report;
  }

  /**
   * 包括的なモニタリングレポートを生成
   */
  async generateComprehensiveReport() {
    const workflowStatus = this.getWorkflowStatus();
    const apiUsageReport = this.generateAPIUsageReport();
    const performanceReport = this.generatePerformanceReport();

    const comprehensiveReport = {
      timestamp: new Date().toISOString(),
      workflowId: this.workflowId,
      workflow: workflowStatus,
      apiUsage: apiUsageReport,
      performance: performanceReport,
      jobs: Array.from(this.jobs.values()).map(job => ({
        id: job.id,
        name: job.name,
        status: job.status,
        duration: job.duration,
        progress: job.progress,
        retryCount: job.retryCount,
        error: job.error ? {
          message: job.error.message,
          type: job.error.type
        } : null
      })),
      recommendations: this.generateRecommendations(workflowStatus, apiUsageReport, performanceReport)
    };

    // レポートを保存
    await this.saveMonitoringReport(comprehensiveReport);

    return comprehensiveReport;
  }

  /**
   * 推奨事項を生成
   */
  generateRecommendations(workflowStatus, apiUsage, performance) {
    const recommendations = [];

    // ワークフロー関連の推奨事項
    if (workflowStatus.jobs.failed > 0) {
      recommendations.push({
        category: 'reliability',
        priority: 'high',
        message: 'ジョブの失敗が検出されました。エラーログを確認し、根本原因を調査してください。',
        action: 'check_error_logs'
      });
    }

    if (workflowStatus.jobs.retrying > 0) {
      recommendations.push({
        category: 'reliability',
        priority: 'medium',
        message: 'リトライが発生しています。ネットワークやAPI制限を確認してください。',
        action: 'check_retry_causes'
      });
    }

    // API使用量関連の推奨事項
    for (const [service, serviceData] of Object.entries(apiUsage.services)) {
      const successRate = parseFloat(serviceData.successRate);
      
      if (successRate < 95) {
        recommendations.push({
          category: 'api_reliability',
          priority: 'medium',
          message: `${service} APIの成功率が${successRate}%と低下しています。`,
          action: 'investigate_api_failures'
        });
      }

      if (serviceData.quotaStatus && parseFloat(serviceData.quotaStatus.usagePercentage) > 80) {
        recommendations.push({
          category: 'quota_management',
          priority: 'high',
          message: `${service} APIのクォータ使用率が${serviceData.quotaStatus.usagePercentage}%に達しています。`,
          action: 'monitor_quota_usage'
        });
      }

      if (parseFloat(serviceData.averageResponseTime) > 5000) {
        recommendations.push({
          category: 'performance',
          priority: 'medium',
          message: `${service} APIのレスポンス時間が${serviceData.averageResponseTime}msと遅延しています。`,
          action: 'optimize_api_calls'
        });
      }
    }

    // パフォーマンス関連の推奨事項
    if (performance.summary.memoryUsage > 500 * 1024 * 1024) { // 500MB
      recommendations.push({
        category: 'performance',
        priority: 'medium',
        message: 'メモリ使用量が高くなっています。メモリリークの可能性を確認してください。',
        action: 'check_memory_usage'
      });
    }

    if (workflowStatus.duration > 30 * 60 * 1000) { // 30分
      recommendations.push({
        category: 'performance',
        priority: 'low',
        message: 'ワークフローの実行時間が長くなっています。最適化を検討してください。',
        action: 'optimize_workflow'
      });
    }

    return recommendations;
  }

  /**
   * GitHub Actions進捗出力を更新
   */
  updateGitHubActionsProgress(job) {
    try {
      const progressData = {
        jobName: job.name,
        status: job.status,
        progress: job.progress.current,
        stage: job.progress.stage,
        message: job.progress.message,
        duration: job.duration,
        timestamp: new Date().toISOString()
      };

      // GitHub Actions出力を設定
      FileManager.setGitHubOutput(`${job.name.toLowerCase().replace(/\s+/g, '_')}_progress`, JSON.stringify(progressData));
      
    } catch (error) {
      Logger.warn('Failed to update GitHub Actions progress', error);
    }
  }

  /**
   * 現在のステージを取得
   */
  getCurrentStage(jobs) {
    const runningJobs = jobs.filter(job => job.status === JobStatus.RUNNING);
    if (runningJobs.length > 0) {
      return runningJobs[0].progress.stage;
    }

    const retryingJobs = jobs.filter(job => job.status === JobStatus.RETRYING);
    if (retryingJobs.length > 0) {
      return 'retrying';
    }

    const failedJobs = jobs.filter(job => job.status === JobStatus.FAILED);
    if (failedJobs.length > 0) {
      return 'failed';
    }

    const completedJobs = jobs.filter(job => job.status === JobStatus.COMPLETED);
    if (completedJobs.length === jobs.length && jobs.length > 0) {
      return 'completed';
    }

    return 'pending';
  }

  /**
   * 完了予定時刻を推定
   */
  estimateCompletion(jobs, currentDuration) {
    const completedJobs = jobs.filter(job => job.status === JobStatus.COMPLETED);
    const runningJobs = jobs.filter(job => job.status === JobStatus.RUNNING);
    
    if (completedJobs.length === 0 || runningJobs.length === 0) {
      return null;
    }

    // 完了したジョブの平均実行時間を計算
    const avgCompletedDuration = completedJobs.reduce((sum, job) => sum + job.duration, 0) / completedJobs.length;
    
    // 実行中ジョブの残り時間を推定
    const remainingTime = runningJobs.reduce((sum, job) => {
      const elapsed = Date.now() - job.startTime;
      const estimated = avgCompletedDuration * (100 / Math.max(job.progress.current, 1));
      return sum + Math.max(0, estimated - elapsed);
    }, 0);

    return Date.now() + remainingTime;
  }

  /**
   * トレンドを計算
   */
  calculateTrend(recentValues) {
    if (recentValues.length < 2) {
      return 'stable';
    }

    const recent = recentValues.slice(-5);
    const older = recentValues.slice(-10, -5);

    if (older.length === 0) {
      return 'stable';
    }

    const recentAvg = recent.reduce((sum, r) => sum + r.value, 0) / recent.length;
    const olderAvg = older.reduce((sum, r) => sum + r.value, 0) / older.length;

    const change = (recentAvg - olderAvg) / olderAvg;

    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  /**
   * パフォーマンス分析
   */
  analyzePerformance() {
    const analysis = {
      bottlenecks: [],
      trends: {},
      alerts: []
    };

    // ボトルネック分析
    for (const [key, metric] of this.metrics) {
      const [component, type] = key.split(':');
      
      if (type === MetricTypes.EXECUTION_TIME && metric.average > 30000) { // 30秒以上
        analysis.bottlenecks.push({
          component,
          type,
          averageTime: metric.average,
          severity: metric.average > 60000 ? 'high' : 'medium'
        });
      }

      if (type === MetricTypes.API_RESPONSE_TIME && metric.average > 5000) { // 5秒以上
        analysis.bottlenecks.push({
          component,
          type,
          averageTime: metric.average,
          severity: metric.average > 10000 ? 'high' : 'medium'
        });
      }
    }

    // トレンド分析
    for (const [key, metric] of this.metrics) {
      const [component, type] = key.split(':');
      const trend = this.calculateTrend(metric.recent);
      
      if (trend !== 'stable') {
        analysis.trends[`${component}:${type}`] = trend;
      }
    }

    return analysis;
  }

  /**
   * 現在のメモリ使用量を取得
   */
  getCurrentMemoryUsage() {
    try {
      return process.memoryUsage().heapUsed;
    } catch (error) {
      return 0;
    }
  }

  /**
   * システム負荷を取得
   */
  getSystemLoad() {
    try {
      const usage = process.cpuUsage();
      return {
        user: usage.user,
        system: usage.system,
        uptime: process.uptime()
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * 入力データをサニタイズ
   */
  sanitizeInputs(inputs) {
    const sanitized = { ...inputs };
    
    // 機密情報を除外
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'credential'];
    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * 出力データをサニタイズ
   */
  sanitizeOutputs(outputs) {
    return this.sanitizeInputs(outputs);
  }

  /**
   * エラーをサニタイズ
   */
  sanitizeError(error) {
    return {
      message: error.message,
      type: error.constructor.name,
      stack: error.stack?.split('\n').slice(0, 5).join('\n') // スタックトレースを制限
    };
  }

  /**
   * モニタリングレポートを保存
   */
  async saveMonitoringReport(report) {
    try {
      await FileManager.ensureDirectory('outputs/monitoring');
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `monitoring-report-${timestamp}.json`;
      const path = `outputs/monitoring/${filename}`;
      
      await FileManager.writeJSON(path, report);
      
      // 最新レポートとしても保存
      await FileManager.writeJSON('outputs/monitoring/latest-report.json', report);
      
      Logger.info(`Monitoring report saved: ${filename}`);
      
    } catch (error) {
      Logger.error('Failed to save monitoring report', error);
    }
  }

  /**
   * モニタリングデータをクリア
   */
  clearMonitoringData() {
    this.jobs.clear();
    this.metrics.clear();
    this.apiUsage.clear();
    this.performanceData = [];
    this.startTime = Date.now();
    this.workflowId = this.generateWorkflowId();
    
    Logger.info('Monitoring data cleared');
  }
}

/**
 * グローバルモニターインスタンス
 */
export const globalMonitor = new WorkflowMonitor();

/**
 * モニタリングデコレーター関数
 */
export function monitorJob(jobName) {
  return function(target, propertyName, descriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function(...args) {
      const jobId = globalMonitor.startJob(jobName, { args: args.length });
      
      try {
        globalMonitor.updateJobProgress(jobId, 10, 'starting', `Starting ${jobName}...`);
        
        const result = await method.apply(this, args);
        
        globalMonitor.completeJob(jobId, { success: true });
        return result;
        
      } catch (error) {
        globalMonitor.completeJob(jobId, null, error);
        throw error;
      }
    };
    
    return descriptor;
  };
}

/**
 * API呼び出し追跡デコレーター
 */
export function trackAPI(service, endpoint) {
  return function(target, propertyName, descriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function(...args) {
      const startTime = Date.now();
      
      try {
        const result = await method.apply(this, args);
        const responseTime = Date.now() - startTime;
        
        globalMonitor.trackAPICall(service, endpoint, responseTime, true);
        return result;
        
      } catch (error) {
        const responseTime = Date.now() - startTime;
        globalMonitor.trackAPICall(service, endpoint, responseTime, false, { error: error.message });
        throw error;
      }
    };
    
    return descriptor;
  };
}

export default WorkflowMonitor;