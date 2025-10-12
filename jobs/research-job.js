/**
 * Research Job - Claude Code SDKを使用したWeb検索とリサーチ
 */

import Anthropic from "@anthropic-ai/sdk";
import { Logger } from "../utils/logger.js";
import { FileManager } from "../utils/file-manager.js";
import { EnvValidator } from "../utils/env-validator.js";
import { WebAnalyzer } from "../utils/web-analyzer.js";
import { ReportFormatter } from "../utils/report-formatter.js";
import { WorkflowErrorHandler, AnthropicErrorHandler, JobError, ErrorTypes, ErrorSeverity } from "../utils/error-handler.js";
import { globalMonitor } from "../utils/workflow-monitor.js";
import { globalConfig } from "../utils/config-manager.js";
import { globalPromptManager, PromptTypes } from "../utils/prompt-manager.js";

class ResearchJob {
  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.errorHandler = new WorkflowErrorHandler();
    this.jobName = "Research Job";
    this.config = null;
  }

  /**
   * メインの実行関数
   */
  async execute() {
    const jobId = globalMonitor.startJob(this.jobName);

    try {
      Logger.jobStart(this.jobName);
      globalMonitor.updateJobProgress(jobId, 5, "initializing", "Starting research job...");

      // 環境変数の検証
      globalMonitor.updateJobProgress(jobId, 10, "validating", "Validating environment...");
      await this.validateEnvironment();

      // 入力パラメータの取得
      globalMonitor.updateJobProgress(jobId, 15, "loading_inputs", "Loading input parameters...");
      const inputs = this.getInputs();
      Logger.info("Research inputs:", inputs);

      // リサーチの実行
      globalMonitor.updateJobProgress(jobId, 20, "researching", "Conducting research...");
      const researchReport = await this.conductResearchWithErrorHandling(inputs, jobId);

      // 結果の保存
      globalMonitor.updateJobProgress(jobId, 90, "saving", "Saving research results...");
      await this.saveResults(researchReport);

      globalMonitor.updateJobProgress(jobId, 100, "completed", "Research completed successfully");
      globalMonitor.completeJob(jobId, {
        keyPointsCount: researchReport.keyPoints.length,
        sourcesCount: researchReport.sources.length,
      });

      Logger.jobComplete(this.jobName, {
        keyPointsCount: researchReport.keyPoints.length,
        sourcesCount: researchReport.sources.length,
      });
    } catch (error) {
      const jobError = this.createJobError(error);
      globalMonitor.completeJob(jobId, null, jobError);

      try {
        await this.errorHandler.handleJobError(jobError, {
          retryFunction: async (retryCount) => {
            Logger.info(`Retrying research job (attempt ${retryCount + 1})`);
            globalMonitor.recordJobRetry(jobId, error.message);
            return await this.execute();
          },
        });
      } catch (handledError) {
        Logger.jobError(this.jobName, handledError);
        process.exit(1);
      }
    }
  }

  /**
   * 環境を検証
   */
  async validateEnvironment() {
    try {
      EnvValidator.validateAnthropicKey();

      // 設定システムを初期化
      await this.initializeConfig();
    } catch (error) {
      throw new JobError(
        this.jobName,
        ErrorTypes.AUTHENTICATION_ERROR,
        "Environment validation failed",
        { originalError: error.message },
        false,
        ErrorSeverity.CRITICAL,
      );
    }
  }

  /**
   * 設定システムを初期化
   */
  async initializeConfig() {
    try {
      // 設定マネージャーとプロンプトマネージャーを初期化
      await globalConfig.initialize();
      await globalPromptManager.initialize();

      // API設定を取得
      this.config = {
        api: globalConfig.getConfig("api"),
        workflow: globalConfig.getConfig("workflow"),
        monitoring: globalConfig.getConfig("monitoring"),
      };

      Logger.info("Configuration system initialized for research job");
    } catch (error) {
      Logger.warn("Failed to initialize configuration system, using defaults", error);
      // デフォルト設定を使用
      this.config = {
        api: {
          anthropic: {
            model: "claude-3-5-sonnet-20241022",
            maxTokens: 4000,
            temperature: 0.3,
            timeout: 60000,
          },
        },
        workflow: {
          advanced: {
            researchDepth: "standard",
          },
        },
      };
    }
  }

  /**
   * ジョブエラーを作成
   */
  createJobError(error) {
    if (error instanceof JobError) {
      return error;
    }

    // エラータイプを判定
    let errorType = ErrorTypes.UNKNOWN_ERROR;
    let retryable = false;
    let severity = ErrorSeverity.HIGH;

    if (error.message?.includes("API key") || error.message?.includes("authentication")) {
      errorType = ErrorTypes.AUTHENTICATION_ERROR;
      severity = ErrorSeverity.CRITICAL;
    } else if (error.message?.includes("network") || error.message?.includes("ENOTFOUND")) {
      errorType = ErrorTypes.NETWORK_ERROR;
      retryable = true;
      severity = ErrorSeverity.MEDIUM;
    } else if (error.message?.includes("timeout")) {
      errorType = ErrorTypes.TIMEOUT_ERROR;
      retryable = true;
      severity = ErrorSeverity.MEDIUM;
    } else if (error.status) {
      errorType = ErrorTypes.API_ERROR;
      retryable = error.status >= 500;
      severity = error.status >= 500 ? ErrorSeverity.MEDIUM : ErrorSeverity.HIGH;
    }

    return new JobError(
      this.jobName,
      errorType,
      error.message || "Unknown error occurred",
      {
        originalError: error,
        stack: error.stack,
      },
      retryable,
      severity,
    );
  }

  /**
   * 入力パラメータを取得
   */
  getInputs() {
    return {
      theme: FileManager.getGitHubInput("THEME", "AI技術の最新動向"),
      target: FileManager.getGitHubInput("TARGET", "エンジニア初心者"),
      message: FileManager.getGitHubInput("MESSAGE", "技術の進歩で生産性向上"),
    };
  }

  /**
   * エラーハンドリング付きリサーチ実行
   */
  async conductResearchWithErrorHandling(inputs, jobId) {
    return await this.errorHandler.handleJobError(await this.attemptResearch(inputs, jobId), {
      retryFunction: async (retryCount) => {
        globalMonitor.updateJobProgress(jobId, 20 + retryCount * 10, "retrying", `Retrying research (attempt ${retryCount + 1})...`);
        return await this.attemptResearch(inputs, jobId);
      },
    });
  }

  /**
   * リサーチを試行
   */
  async attemptResearch(inputs, jobId) {
    try {
      Logger.info("Starting research with Anthropic SDK...");
      globalMonitor.updateJobProgress(jobId, 25, "preparing", "Preparing research prompt...");

      const researchPrompt = this.buildResearchPrompt(inputs);

      globalMonitor.updateJobProgress(jobId, 30, "api_call", "Calling Anthropic API...");
      const startTime = Date.now();

      // 設定から API パラメータを取得
      const apiConfig = this.config?.api?.anthropic || {};

      // タイムアウト付きでAPI呼び出し
      const timeoutMs = apiConfig.timeout || 300000; // 5分のタイムアウト
      const response = await Promise.race([
        this.anthropic.messages.create({
          model: apiConfig.model || "claude-3-5-sonnet-20241022",
          max_tokens: apiConfig.maxTokens || 4000,
          temperature: apiConfig.temperature || 0.3,
          system: this.getSystemPrompt(),
          messages: [
            {
              role: "user",
              content: researchPrompt,
            },
          ],
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error(`API call timed out after ${timeoutMs}ms`)), timeoutMs)),
      ]);

      const responseTime = Date.now() - startTime;
      globalMonitor.trackAPICall("anthropic", "messages.create", responseTime, true);

      globalMonitor.updateJobProgress(jobId, 70, "parsing", "Parsing research response...");

      // レスポンスからリサーチレポートを抽出
      const result = this.parseResearchResponse(response, inputs);
      Logger.info("Research completed successfully");

      globalMonitor.updateJobProgress(jobId, 85, "analyzing", "Analyzing research quality...");

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      globalMonitor.trackAPICall("anthropic", "messages.create", responseTime, false, { error: error.message });

      // Anthropic固有のエラーハンドリング
      const jobError = AnthropicErrorHandler.handleError(error, this.jobName);
      throw jobError;
    }
  }

  /**
   * システムプロンプトを取得
   */
  getSystemPrompt() {
    try {
      // プロンプトマネージャーからカスタマイズされたプロンプトを取得
      return globalPromptManager.generatePrompt(PromptTypes.RESEARCH_SYSTEM);
    } catch (error) {
      Logger.warn("Failed to get custom system prompt, using default", error);
      // フォールバック: デフォルトプロンプト
      return `あなたは優秀なリサーチャーです。与えられたテーマについて、web_searchとweb_fetchツールを使用して包括的なリサーチを行い、構造化されたレポートを作成してください。

リサーチの手順:
1. まず、テーマに関連する複数の検索クエリを実行
2. 信頼できる情報源から詳細な情報を収集
3. 最新のトレンドや統計データを調査
4. 専門家の意見や事例を収集
5. 収集した情報を整理して構造化されたレポートを作成

出力形式:
必ず以下のJSON形式で回答してください:

{
  "topic": "リサーチテーマ",
  "summary": "テーマの概要説明（200文字程度）",
  "keyPoints": [
    {
      "title": "重要ポイントのタイトル",
      "description": "詳細説明",
      "source": "情報源URL"
    }
  ],
  "trends": [
    {
      "trend": "トレンド名",
      "description": "トレンドの説明",
      "impact": "影響度（高/中/低）"
    }
  ],
  "statistics": [
    {
      "metric": "統計項目",
      "value": "数値",
      "source": "データ源",
      "date": "データ取得日"
    }
  ],
  "expertOpinions": [
    {
      "expert": "専門家名",
      "opinion": "意見内容",
      "source": "引用元"
    }
  ],
  "sources": [
    {
      "url": "URL",
      "title": "タイトル",
      "relevanceScore": 0.9,
      "credibilityScore": 0.8,
      "publishDate": "2024-01-01"
    }
  ]
}`;
    }
  }

  /**
   * リサーチプロンプトを構築
   */
  buildResearchPrompt(inputs) {
    try {
      // プロンプトマネージャーからカスタマイズされたプロンプトを取得
      return globalPromptManager.generatePrompt(PromptTypes.RESEARCH_USER, {
        theme: inputs.theme,
        target: inputs.target,
        message: inputs.message,
        research_depth: this.config?.workflow?.advanced?.researchDepth || "standard",
      });
    } catch (error) {
      Logger.warn("Failed to get custom user prompt, using default", error);
      // フォールバック: デフォルトプロンプト
      return `以下のテーマについて包括的なリサーチを行ってください:

テーマ: ${inputs.theme}
想定読者: ${inputs.target}
伝えたいメッセージ: ${inputs.message}

リサーチ要件:
1. テーマに関する最新情報と動向を調査
2. 想定読者に適した情報レベルで収集
3. 伝えたいメッセージを裏付ける事実やデータを重点的に調査
4. 信頼できる情報源から最低5つ以上の参考資料を収集
5. 統計データや専門家の意見を含める

web_searchとweb_fetchツールを積極的に使用して、最新で正確な情報を収集してください。
最終的に、構造化されたJSONレポートとして出力してください。`;
    }
  }

  /**
   * Claude APIのレスポンスを解析してリサーチレポートを作成
   */
  parseResearchResponse(response, inputs) {
    Logger.info("Parsing research response...");

    try {
      // レスポンスからテキスト内容を抽出
      let content = "";
      for (const block of response.content) {
        if (block.type === "text") {
          content += block.text;
        }
      }

      // JSONレスポンスを解析
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const researchData = JSON.parse(jsonMatch[0]);

        // Web Analyzerを使用してソースの品質を評価
        if (researchData.sources) {
          researchData.sources = researchData.sources.map((source) => {
            const relevanceScore = WebAnalyzer.calculateRelevanceScore(source.title + " " + (source.description || ""), inputs.theme);
            const credibilityScore = WebAnalyzer.calculateCredibilityScore(source.url, source.title);

            return {
              ...source,
              relevanceScore,
              credibilityScore,
              publishDate: WebAnalyzer.parsePublishDate(source.publishDate || source.date),
            };
          });

          // 品質スコア順にソート
          researchData.sources.sort((a, b) => {
            const scoreA = (a.relevanceScore + a.credibilityScore) / 2;
            const scoreB = (b.relevanceScore + b.credibilityScore) / 2;
            return scoreB - scoreA;
          });
        }

        // キーワードを抽出
        const allContent = [
          researchData.summary,
          ...(researchData.keyPoints || []).map((kp) => kp.description),
          ...(researchData.trends || []).map((t) => t.description),
        ].join(" ");

        const keywords = WebAnalyzer.extractKeywords(allContent, 10);

        // 基本情報を追加
        researchData.metadata = {
          generatedAt: new Date().toISOString(),
          model: "claude-3-5-sonnet-20241022",
          inputs,
          totalSources: researchData.sources?.length || 0,
          totalKeyPoints: researchData.keyPoints?.length || 0,
          keywords,
          qualityScore: this.calculateOverallQuality(researchData),
        };

        return researchData;
      } else {
        // JSONが見つからない場合は、テキストから基本的な構造を作成
        return this.createFallbackReport(content, inputs);
      }
    } catch (error) {
      Logger.warn("Failed to parse JSON response, creating fallback report", error);
      return this.createFallbackReport(response.content[0]?.text || "", inputs);
    }
  }

  /**
   * リサーチレポート全体の品質スコアを計算
   */
  calculateOverallQuality(researchData) {
    let score = 0;
    let factors = 0;

    // ソースの品質
    if (researchData.sources && researchData.sources.length > 0) {
      const avgSourceQuality =
        researchData.sources.reduce((sum, source) => {
          return sum + (source.relevanceScore + source.credibilityScore) / 2;
        }, 0) / researchData.sources.length;
      score += avgSourceQuality * 0.4;
      factors += 0.4;
    }

    // コンテンツの量
    const contentAmount = (researchData.keyPoints?.length || 0) + (researchData.trends?.length || 0) + (researchData.statistics?.length || 0);
    score += Math.min(1, contentAmount / 10) * 0.3;
    factors += 0.3;

    // 多様性（異なるタイプの情報）
    const diversity =
      [
        researchData.keyPoints?.length > 0,
        researchData.trends?.length > 0,
        researchData.statistics?.length > 0,
        researchData.expertOpinions?.length > 0,
      ].filter(Boolean).length / 4;
    score += diversity * 0.3;
    factors += 0.3;

    return factors > 0 ? score / factors : 0.5;
  }

  /**
   * フォールバック用のリサーチレポートを作成
   */
  createFallbackReport(content, inputs) {
    return {
      topic: inputs.theme,
      summary: `${inputs.theme}に関するリサーチを実施しました。`,
      keyPoints: [
        {
          title: "基本情報",
          description: content.substring(0, 500),
          source: "Claude Analysis",
        },
      ],
      trends: [],
      statistics: [],
      expertOpinions: [],
      sources: [],
      metadata: {
        generatedAt: new Date().toISOString(),
        model: "claude-3-5-sonnet-20241022",
        inputs,
        fallback: true,
      },
    };
  }

  /**
   * リサーチ結果を保存
   */
  async saveResults(researchReport) {
    Logger.info("Saving research results...");

    try {
      // 複数フォーマットで保存
      const savedFiles = await ReportFormatter.saveMultipleFormats(researchReport);

      // GitHub Actions用のコンパクトな出力を作成
      const compactReport = ReportFormatter.formatForGitHubActions(researchReport);

      // GitHub Actions出力を設定
      FileManager.setGitHubOutput("report", JSON.stringify(compactReport));

      // サマリー情報をログ出力
      const summary = ReportFormatter.generateSummary(researchReport);
      Logger.info("Research completed:", {
        topic: summary.topic,
        qualityScore: `${(summary.qualityScore * 100).toFixed(1)}%`,
        stats: summary.stats,
        savedFiles: Object.keys(savedFiles),
      });
    } catch (error) {
      Logger.error("Failed to save research results", error);

      // フォールバック: 最低限JSONファイルは保存
      await FileManager.ensureDirectory("outputs");
      const fallbackPath = "outputs/research-report.json";
      await FileManager.writeJSON(fallbackPath, researchReport);

      throw error;
    }
  }
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  const job = new ResearchJob();
  await job.execute();
}
