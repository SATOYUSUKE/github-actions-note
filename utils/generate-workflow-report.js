/**
 * 包括的なワークフローレポート生成スクリプト
 * 全ジョブのモニタリングデータを統合し、詳細な分析レポートを生成
 */

import { Logger } from './logger.js';
import { FileManager } from './file-manager.js';
import { WorkflowMonitor } from './workflow-monitor.js';
import fs from 'fs';
import path from 'path';

class WorkflowReportGenerator {
  constructor() {
    this.workflowId = process.env.GITHUB_RUN_ID || 'local-run';
    this.startTime = parseInt(process.env.WORKFLOW_START_TIME) || Date.now();
    this.jobStatuses = {
      research: process.env.RESEARCH_STATUS || 'unknown',
      writing: process.env.WRITING_STATUS || 'unknown',
      factCheck: process.env.FACT_CHECK_STATUS || 'unknown',
      publish: process.env.PUBLISH_STATUS || 'unknown'
    };
  }

  /**
   * メイン実行関数
   */
  async execute() {
    try {
      Logger.info('Starting comprehensive workflow report generation...');

      // モニタリングデータを収集
      const monitoringData = await this.collectMonitoringData();
      
      // エラーデータを収集
      const errorData = await this.collectErrorData();
      
      // パフォーマンス分析を実行
      const performanceAnalysis = this.analyzePerformance(monitoringData);
      
      // API使用量分析を実行
      const apiAnalysis = this.analyzeAPIUsage(monitoringData);
      
      // 品質メトリクスを分析
      const qualityMetrics = this.analyzeQualityMetrics(monitoringData);
      
      // 推奨事項を生成
      const recommendations = this.generateRecommendations(
        performanceAnalysis, 
        apiAnalysis, 
        qualityMetrics, 
        errorData
      );
      
      // 包括的レポートを作成
      const comprehensiveReport = {
        metadata: {
          workflowId: this.workflowId,
          generatedAt: new Date().toISOString(),
          startTime: new Date(this.startTime).toISOString(),
          endTime: new Date().toISOString(),
          totalDuration: Date.now() - this.startTime,
          generator: 'WorkflowReportGenerator v1.0'
        },
        workflow: {
          status: this.calculateOverallStatus(),
          jobStatuses: this.jobStatuses,
          successRate: this.calculateSuccessRate(),
          timeline: this.generateTimeline(monitoringData)
        },
        performance: performanceAnalysis,
        apiUsage: apiAnalysis,
        quality: qualityMetrics,
        errors: errorData,
        recommendations: recommendations,
        summary: this.generateExecutiveSummary(
          performanceAnalysis, 
          apiAnalysis, 
          qualityMetrics, 
          errorData
        )
      };
      
      // レポートを保存
      await this.saveReport(comprehensiveReport);
      
      // パフォーマンス分析を別途保存
      await this.savePerformanceAnalysis(performanceAnalysis);
      
      Logger.info('Comprehensive workflow report generated successfully');
      
    } catch (error) {
      Logger.error('Failed to generate workflow report', error);
      process.exit(1);
    }
  }

  /**
   * モニタリングデータを収集
   */
  async collectMonitoringData() {
    const monitoringData = {
      jobs: {},
      metrics: {},
      apiCalls: {}
    };

    try {
      // 各ジョブのモニタリングデータを読み込み
      const jobNames = ['research', 'writing', 'fact-check', 'publishing'];
      
      for (const jobName of jobNames) {
        try {
          const monitoringPath = `monitoring-data/${jobName}-monitoring/latest-report.json`;
          if (fs.existsSync(monitoringPath)) {
            const jobData = await FileManager.readJSON(monitoringPath);
            monitoringData.jobs[jobName] = jobData;
            
            // メトリクスを統合
            if (jobData.performance && jobData.performance.metrics) {
              Object.assign(monitoringData.metrics, jobData.performance.metrics);
            }
            
            // API呼び出しを統合
            if (jobData.apiUsage && jobData.apiUsage.services) {
              Object.assign(monitoringData.apiCalls, jobData.apiUsage.services);
            }
          }
        } catch (error) {
          Logger.warn(`Failed to load monitoring data for ${jobName}:`, error.message);
        }
      }
      
    } catch (error) {
      Logger.warn('Failed to collect monitoring data:', error.message);
    }

    return monitoringData;
  }

  /**
   * エラーデータを収集
   */
  async collectErrorData() {
    const errorData = {
      totalErrors: 0,
      errorsByJob: {},
      errorsByType: {},
      criticalErrors: [],
      errorTimeline: []
    };

    try {
      const jobNames = ['research', 'writing', 'fact-check', 'publishing'];
      
      for (const jobName of jobNames) {
        try {
          const errorDir = `error-data/${jobName}-errors`;
          if (fs.existsSync(errorDir)) {
            const errorFiles = fs.readdirSync(errorDir).filter(f => f.endsWith('.json'));
            
            errorData.errorsByJob[jobName] = errorFiles.length;
            errorData.totalErrors += errorFiles.length;
            
            for (const errorFile of errorFiles) {
              const errorReport = await FileManager.readJSON(path.join(errorDir, errorFile));
              
              if (errorReport.error) {
                const error = errorReport.error;
                
                // エラータイプ別集計
                errorData.errorsByType[error.errorType] = 
                  (errorData.errorsByType[error.errorType] || 0) + 1;
                
                // 重大エラーを記録
                if (error.severity === 'critical' || error.severity === 'high') {
                  errorData.criticalErrors.push({
                    jobName: error.jobName,
                    errorType: error.errorType,
                    message: error.message,
                    timestamp: error.timestamp,
                    severity: error.severity
                  });
                }
                
                // エラータイムラインに追加
                errorData.errorTimeline.push({
                  timestamp: error.timestamp,
                  jobName: error.jobName,
                  errorType: error.errorType,
                  severity: error.severity
                });
              }
            }
          }
        } catch (error) {
          Logger.warn(`Failed to collect error data for ${jobName}:`, error.message);
        }
      }
      
      // エラータイムラインをソート
      errorData.errorTimeline.sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      );
      
    } catch (error) {
      Logger.warn('Failed to collect error data:', error.message);
    }

    return errorData;
  }

  /**
   * パフォーマンス分析
   */
  analyzePerformance(monitoringData) {
    const analysis = {
      executionTimes: {},
      memoryUsage: {},
      bottlenecks: [],
      trends: {},
      efficiency: {
        overall: 0,
        byJob: {}
      }
    };

    try {
      // 各ジョブの実行時間を分析
      for (const [jobName, jobData] of Object.entries(monitoringData.jobs)) {
        if (jobData.workflow && jobData.workflow.duration) {
          analysis.executionTimes[jobName] = {
            duration: jobData.workflow.duration,
            durationMinutes: Math.round(jobData.workflow.duration / 60000),
            efficiency: this.calculateJobEfficiency(jobName, jobData.workflow.duration)
          };
        }
      }

      // メトリクス分析
      for (const [component, metrics] of Object.entries(monitoringData.metrics)) {
        if (metrics.execution_time) {
          const execTime = metrics.execution_time;
          
          // ボトルネック検出
          if (execTime.average > 30000) { // 30秒以上
            analysis.bottlenecks.push({
              component,
              type: 'execution_time',
              averageTime: execTime.average,
              severity: execTime.average > 60000 ? 'high' : 'medium',
              recommendation: this.getBottleneckRecommendation(component, execTime.average)
            });
          }
        }

        if (metrics.memory_usage) {
          analysis.memoryUsage[component] = {
            average: metrics.memory_usage.average,
            peak: metrics.memory_usage.max,
            trend: metrics.memory_usage.trend || 'stable'
          };
        }
      }

      // 全体効率性を計算
      const jobEfficiencies = Object.values(analysis.executionTimes).map(j => j.efficiency);
      analysis.efficiency.overall = jobEfficiencies.length > 0 ? 
        jobEfficiencies.reduce((sum, eff) => sum + eff, 0) / jobEfficiencies.length : 0;

      for (const [jobName, timeData] of Object.entries(analysis.executionTimes)) {
        analysis.efficiency.byJob[jobName] = timeData.efficiency;
      }

    } catch (error) {
      Logger.warn('Performance analysis failed:', error.message);
    }

    return analysis;
  }

  /**
   * API使用量分析
   */
  analyzeAPIUsage(monitoringData) {
    const analysis = {
      summary: {
        totalCalls: 0,
        totalSuccessful: 0,
        totalFailed: 0,
        overallSuccessRate: 0,
        averageResponseTime: 0
      },
      services: {},
      quotaStatus: {},
      rateLimits: {},
      costEstimation: {}
    };

    try {
      let totalResponseTime = 0;
      let totalResponseCount = 0;

      for (const [serviceName, serviceData] of Object.entries(monitoringData.apiCalls)) {
        analysis.services[serviceName] = {
          totalCalls: serviceData.totalCalls || 0,
          successRate: parseFloat(serviceData.successRate) || 0,
          averageResponseTime: parseFloat(serviceData.averageResponseTime) || 0,
          endpoints: serviceData.endpoints || {}
        };

        // 全体統計に加算
        analysis.summary.totalCalls += serviceData.totalCalls || 0;
        analysis.summary.totalSuccessful += serviceData.successfulCalls || 0;
        analysis.summary.totalFailed += serviceData.failedCalls || 0;

        if (serviceData.averageResponseTime > 0) {
          totalResponseTime += (serviceData.averageResponseTime * serviceData.totalCalls);
          totalResponseCount += serviceData.totalCalls;
        }

        // クォータ状況
        if (serviceData.quotaStatus) {
          analysis.quotaStatus[serviceName] = {
            used: serviceData.quotaStatus.used,
            limit: serviceData.quotaStatus.limit,
            usagePercentage: parseFloat(serviceData.quotaStatus.usagePercentage),
            status: this.getQuotaStatus(parseFloat(serviceData.quotaStatus.usagePercentage))
          };
        }

        // レート制限状況
        if (serviceData.rateLimitStatus) {
          analysis.rateLimits[serviceName] = serviceData.rateLimitStatus;
        }

        // コスト推定
        analysis.costEstimation[serviceName] = this.estimateAPICost(serviceName, serviceData);
      }

      // 全体統計を計算
      analysis.summary.overallSuccessRate = analysis.summary.totalCalls > 0 ? 
        (analysis.summary.totalSuccessful / analysis.summary.totalCalls * 100).toFixed(1) : 0;
      
      analysis.summary.averageResponseTime = totalResponseCount > 0 ? 
        (totalResponseTime / totalResponseCount).toFixed(0) : 0;

    } catch (error) {
      Logger.warn('API usage analysis failed:', error.message);
    }

    return analysis;
  }

  /**
   * 品質メトリクス分析
   */
  analyzeQualityMetrics(monitoringData) {
    const analysis = {
      contentQuality: {},
      factCheckResults: {},
      overallQuality: 0,
      qualityTrends: {},
      improvements: []
    };

    try {
      // 各ジョブの品質メトリクスを分析
      for (const [jobName, jobData] of Object.entries(monitoringData.jobs)) {
        if (jobName === 'writing' && jobData.jobs) {
          // 記事品質分析
          const writingJobs = Object.values(jobData.jobs).filter(job => job.name === 'Writing Job');
          if (writingJobs.length > 0) {
            const writingJob = writingJobs[0];
            if (writingJob.outputs && writingJob.outputs.qualityScore) {
              analysis.contentQuality = {
                score: writingJob.outputs.qualityScore,
                wordCount: writingJob.outputs.wordCount,
                readingTime: writingJob.outputs.estimatedReadingTime,
                status: this.getQualityStatus(writingJob.outputs.qualityScore)
              };
            }
          }
        }

        if (jobName === 'fact-check' && jobData.jobs) {
          // ファクトチェック結果分析
          const factCheckJobs = Object.values(jobData.jobs).filter(job => job.name === 'Fact Check Job');
          if (factCheckJobs.length > 0) {
            const factCheckJob = factCheckJobs[0];
            if (factCheckJob.outputs) {
              analysis.factCheckResults = {
                overallScore: factCheckJob.outputs.overallScore,
                claimsVerified: factCheckJob.outputs.claimsVerified,
                correctionsApplied: factCheckJob.outputs.correctionsApplied,
                readinessLevel: factCheckJob.outputs.readinessLevel,
                status: this.getFactCheckStatus(factCheckJob.outputs.overallScore)
              };
            }
          }
        }
      }

      // 全体品質スコアを計算
      const qualityScores = [];
      if (analysis.contentQuality.score) qualityScores.push(analysis.contentQuality.score);
      if (analysis.factCheckResults.overallScore) qualityScores.push(analysis.factCheckResults.overallScore);
      
      analysis.overallQuality = qualityScores.length > 0 ? 
        qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length : 0;

      // 改善提案を生成
      analysis.improvements = this.generateQualityImprovements(analysis);

    } catch (error) {
      Logger.warn('Quality metrics analysis failed:', error.message);
    }

    return analysis;
  }

  /**
   * 推奨事項を生成
   */
  generateRecommendations(performanceAnalysis, apiAnalysis, qualityMetrics, errorData) {
    const recommendations = [];

    // パフォーマンス関連の推奨事項
    if (performanceAnalysis.bottlenecks.length > 0) {
      recommendations.push({
        category: 'performance',
        priority: 'high',
        title: 'パフォーマンスボトルネックの解決',
        description: `${performanceAnalysis.bottlenecks.length}個のボトルネックが検出されました`,
        actions: performanceAnalysis.bottlenecks.map(b => b.recommendation)
      });
    }

    // API使用量関連の推奨事項
    for (const [service, quota] of Object.entries(apiAnalysis.quotaStatus)) {
      if (quota.usagePercentage > 80) {
        recommendations.push({
          category: 'api_quota',
          priority: quota.usagePercentage > 90 ? 'critical' : 'high',
          title: `${service} APIクォータ使用量警告`,
          description: `クォータ使用率が${quota.usagePercentage}%に達しています`,
          actions: [
            'API使用量の最適化を検討',
            'クォータ制限の引き上げを検討',
            'バッチ処理の導入を検討'
          ]
        });
      }
    }

    // 品質関連の推奨事項
    if (qualityMetrics.overallQuality < 0.7) {
      recommendations.push({
        category: 'quality',
        priority: 'medium',
        title: 'コンテンツ品質の改善',
        description: `全体品質スコアが${(qualityMetrics.overallQuality * 100).toFixed(1)}%です`,
        actions: qualityMetrics.improvements
      });
    }

    // エラー関連の推奨事項
    if (errorData.criticalErrors.length > 0) {
      recommendations.push({
        category: 'reliability',
        priority: 'critical',
        title: '重大エラーの対応',
        description: `${errorData.criticalErrors.length}個の重大エラーが発生しました`,
        actions: [
          '重大エラーの根本原因分析',
          'エラーハンドリングの強化',
          'モニタリングアラートの設定'
        ]
      });
    }

    // 効率性関連の推奨事項
    if (performanceAnalysis.efficiency.overall < 0.7) {
      recommendations.push({
        category: 'efficiency',
        priority: 'medium',
        title: 'ワークフロー効率性の改善',
        description: `全体効率性が${(performanceAnalysis.efficiency.overall * 100).toFixed(1)}%です`,
        actions: [
          '並列処理の導入検討',
          'キャッシュ機能の活用',
          '不要な処理の削減'
        ]
      });
    }

    return recommendations;
  }

  /**
   * エグゼクティブサマリーを生成
   */
  generateExecutiveSummary(performanceAnalysis, apiAnalysis, qualityMetrics, errorData) {
    const summary = {
      status: this.calculateOverallStatus(),
      keyMetrics: {
        successRate: this.calculateSuccessRate(),
        totalDuration: Date.now() - this.startTime,
        apiCalls: apiAnalysis.summary.totalCalls,
        apiSuccessRate: parseFloat(apiAnalysis.summary.overallSuccessRate),
        qualityScore: qualityMetrics.overallQuality,
        errorCount: errorData.totalErrors
      },
      highlights: [],
      concerns: [],
      nextActions: []
    };

    // ハイライト
    if (summary.keyMetrics.successRate >= 75) {
      summary.highlights.push('ワークフローの成功率が良好');
    }
    if (summary.keyMetrics.apiSuccessRate >= 95) {
      summary.highlights.push('API呼び出しの信頼性が高い');
    }
    if (summary.keyMetrics.qualityScore >= 0.8) {
      summary.highlights.push('コンテンツ品質が高水準');
    }

    // 懸念事項
    if (summary.keyMetrics.errorCount > 0) {
      summary.concerns.push(`${summary.keyMetrics.errorCount}件のエラーが発生`);
    }
    if (summary.keyMetrics.apiSuccessRate < 90) {
      summary.concerns.push('API呼び出しの失敗率が高い');
    }
    if (performanceAnalysis.bottlenecks.length > 0) {
      summary.concerns.push(`${performanceAnalysis.bottlenecks.length}個のパフォーマンスボトルネック`);
    }

    // 次のアクション
    if (errorData.criticalErrors.length > 0) {
      summary.nextActions.push('重大エラーの緊急対応');
    }
    if (Object.values(apiAnalysis.quotaStatus).some(q => q.usagePercentage > 80)) {
      summary.nextActions.push('APIクォータ使用量の監視強化');
    }
    if (summary.keyMetrics.qualityScore < 0.7) {
      summary.nextActions.push('コンテンツ品質向上施策の実施');
    }

    return summary;
  }

  /**
   * 全体ステータスを計算
   */
  calculateOverallStatus() {
    const statuses = Object.values(this.jobStatuses);
    const successCount = statuses.filter(s => s === 'success').length;
    const failureCount = statuses.filter(s => s === 'failure').length;
    
    if (failureCount > 0) return 'failed';
    if (successCount === statuses.length) return 'success';
    return 'partial';
  }

  /**
   * 成功率を計算
   */
  calculateSuccessRate() {
    const statuses = Object.values(this.jobStatuses);
    const successCount = statuses.filter(s => s === 'success').length;
    return Math.round((successCount / statuses.length) * 100);
  }

  /**
   * タイムラインを生成
   */
  generateTimeline(monitoringData) {
    const timeline = [];
    
    for (const [jobName, jobData] of Object.entries(monitoringData.jobs)) {
      if (jobData.workflow) {
        timeline.push({
          job: jobName,
          startTime: jobData.workflow.startTime,
          duration: jobData.workflow.duration,
          status: this.jobStatuses[jobName] || 'unknown'
        });
      }
    }
    
    return timeline.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  }

  /**
   * ジョブ効率性を計算
   */
  calculateJobEfficiency(jobName, duration) {
    // 基準実行時間（ミリ秒）
    const baselines = {
      research: 120000,  // 2分
      writing: 180000,   // 3分
      'fact-check': 240000, // 4分
      publish: 60000     // 1分
    };
    
    const baseline = baselines[jobName] || 120000;
    return Math.max(0, Math.min(1, baseline / duration));
  }

  /**
   * ボトルネック推奨事項を取得
   */
  getBottleneckRecommendation(component, averageTime) {
    if (component.includes('api')) {
      return 'API呼び出しの最適化、バッチ処理の検討';
    }
    if (component.includes('research')) {
      return 'リサーチクエリの効率化、並列処理の導入';
    }
    if (component.includes('writing')) {
      return 'プロンプトの最適化、レスポンス時間の短縮';
    }
    return '処理の最適化、キャッシュの活用を検討';
  }

  /**
   * クォータステータスを取得
   */
  getQuotaStatus(usagePercentage) {
    if (usagePercentage >= 90) return 'critical';
    if (usagePercentage >= 80) return 'warning';
    if (usagePercentage >= 60) return 'caution';
    return 'normal';
  }

  /**
   * API コスト推定
   */
  estimateAPICost(serviceName, serviceData) {
    // 簡易的なコスト推定（実際の料金体系に基づいて調整が必要）
    const costPerCall = {
      anthropic: 0.01,  // $0.01 per call (概算)
      tavily: 0.005     // $0.005 per call (概算)
    };
    
    const rate = costPerCall[serviceName] || 0.01;
    return {
      estimatedCost: (serviceData.totalCalls || 0) * rate,
      currency: 'USD',
      note: 'This is a rough estimation'
    };
  }

  /**
   * 品質ステータスを取得
   */
  getQualityStatus(score) {
    if (score >= 0.9) return 'excellent';
    if (score >= 0.8) return 'good';
    if (score >= 0.7) return 'acceptable';
    if (score >= 0.6) return 'needs_improvement';
    return 'poor';
  }

  /**
   * ファクトチェックステータスを取得
   */
  getFactCheckStatus(score) {
    if (score >= 0.9) return 'highly_reliable';
    if (score >= 0.8) return 'reliable';
    if (score >= 0.7) return 'mostly_reliable';
    if (score >= 0.6) return 'questionable';
    return 'unreliable';
  }

  /**
   * 品質改善提案を生成
   */
  generateQualityImprovements(qualityMetrics) {
    const improvements = [];
    
    if (qualityMetrics.contentQuality.score < 0.8) {
      improvements.push('記事構造の改善');
      improvements.push('より具体的な事例の追加');
    }
    
    if (qualityMetrics.factCheckResults.overallScore < 0.8) {
      improvements.push('より信頼性の高い情報源の活用');
      improvements.push('事実確認プロセスの強化');
    }
    
    return improvements;
  }

  /**
   * レポートを保存
   */
  async saveReport(report) {
    try {
      await FileManager.ensureDirectory('outputs');
      await FileManager.writeJSON('outputs/workflow-report.json', report);
      Logger.info('Comprehensive workflow report saved');
    } catch (error) {
      Logger.error('Failed to save workflow report', error);
      throw error;
    }
  }

  /**
   * パフォーマンス分析を保存
   */
  async savePerformanceAnalysis(analysis) {
    try {
      await FileManager.writeJSON('outputs/performance-analysis.json', analysis);
      Logger.info('Performance analysis saved');
    } catch (error) {
      Logger.error('Failed to save performance analysis', error);
    }
  }
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = new WorkflowReportGenerator();
  await generator.execute();
}