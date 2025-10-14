/**
 * Writing Job - Claude Sonnet 4.5を使用した記事執筆
 */

import Anthropic from "@anthropic-ai/sdk";
import { Logger } from "../utils/logger.js";
import { FileManager } from "../utils/file-manager.js";
import { EnvValidator } from "../utils/env-validator.js";
import { NoteFormatter } from "../utils/note-formatter.js";
import { ArticleValidator } from "../utils/article-validator.js";
import { WorkflowErrorHandler, AnthropicErrorHandler, JobError, ErrorTypes, ErrorSeverity } from "../utils/error-handler.js";
import { globalMonitor } from "../utils/workflow-monitor.js";

class WritingJob {
  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    this.errorHandler = new WorkflowErrorHandler();
    this.jobName = "Writing Job";
  }

  /**
   * メインの実行関数
   */
  async execute() {
    const jobId = globalMonitor.startJob(this.jobName);

    try {
      Logger.jobStart(this.jobName);
      globalMonitor.updateJobProgress(jobId, 5, "initializing", "Starting writing job...");

      // 環境変数の検証
      globalMonitor.updateJobProgress(jobId, 10, "validating", "Validating environment...");
      await this.validateEnvironment();

      // 入力データの読み込み
      globalMonitor.updateJobProgress(jobId, 15, "loading_inputs", "Loading input data...");
      const inputs = await this.loadInputsWithErrorHandling();
      Logger.info("Writing inputs loaded:", {
        hasResearchReport: !!inputs.researchReport,
        theme: inputs.theme,
        target: inputs.target,
      });

      // 記事の生成
      globalMonitor.updateJobProgress(jobId, 25, "generating", "Generating article...");
      const article = await this.generateArticleWithErrorHandling(inputs, jobId);

      // 記事の検証と品質チェック
      globalMonitor.updateJobProgress(jobId, 70, "validating", "Validating article quality...");
      const validatedArticle = await this.validateArticle(article, inputs);

      // note.com互換形式にフォーマット
      globalMonitor.updateJobProgress(jobId, 85, "formatting", "Formatting for note.com...");
      const noteFormattedArticle = NoteFormatter.formatForNote(validatedArticle);

      // 結果の保存
      globalMonitor.updateJobProgress(jobId, 95, "saving", "Saving article results...");
      await this.saveResults(noteFormattedArticle, inputs);

      globalMonitor.updateJobProgress(jobId, 100, "completed", "Writing completed successfully");
      globalMonitor.completeJob(jobId, {
        title: noteFormattedArticle.title,
        wordCount: noteFormattedArticle.originalArticle.metadata.wordCount,
        estimatedReadingTime: noteFormattedArticle.originalArticle.metadata.estimatedReadingTime,
        qualityScore: noteFormattedArticle.originalArticle.qualityScore,
        noteFormatted: true,
      });

      Logger.jobComplete(this.jobName, {
        title: noteFormattedArticle.title,
        wordCount: noteFormattedArticle.originalArticle.metadata.wordCount,
        estimatedReadingTime: noteFormattedArticle.originalArticle.metadata.estimatedReadingTime,
        qualityScore: `${(noteFormattedArticle.originalArticle.qualityScore * 100).toFixed(1)}%`,
        noteFormatted: true,
      });
    } catch (error) {
      const jobError = this.createJobError(error);
      globalMonitor.completeJob(jobId, null, jobError);

      try {
        await this.errorHandler.handleJobError(jobError, {
          retryFunction: async (retryCount) => {
            Logger.info(`Retrying writing job (attempt ${retryCount + 1})`);
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
    } catch (error) {
      throw new JobError(
        this.jobName,
        ErrorTypes.AUTHENTICATION_ERROR,
        "Anthropic API key validation failed",
        { originalError: error.message },
        false,
        ErrorSeverity.CRITICAL,
      );
    }
  }

  /**
   * エラーハンドリング付き入力データ読み込み
   */
  async loadInputsWithErrorHandling() {
    try {
      return await this.loadInputs();
    } catch (error) {
      throw new JobError(this.jobName, ErrorTypes.FILE_ERROR, "Failed to load input data", { originalError: error.message }, false, ErrorSeverity.HIGH);
    }
  }

  /**
   * 入力データを読み込み
   */
  async loadInputs() {
    try {
      // リサーチレポートを読み込み
      const researchReport = await FileManager.readJSON("inputs/research-report.json");

      // GitHub Actions入力パラメータを取得
      const inputs = {
        researchReport,
        theme: FileManager.getGitHubInput("THEME", "AI技術の最新動向"),
        target: FileManager.getGitHubInput("TARGET", "エンジニア初心者"),
        message: FileManager.getGitHubInput("MESSAGE", "技術の進歩で生産性向上"),
        cta: FileManager.getGitHubInput("CTA", "実際に試してみる"),
        tags: FileManager.getGitHubInput("TAGS", "AI,技術,自動化")
          .split(",")
          .map((tag) => tag.trim()),
      };

      return inputs;
    } catch (error) {
      Logger.error("Failed to load inputs", error);
      throw new Error(`Input loading failed: ${error.message}`);
    }
  }

  /**
   * エラーハンドリング付き記事生成
   */
  async generateArticleWithErrorHandling(inputs, jobId) {
    try {
      return await this.attemptArticleGeneration(inputs, jobId);
    } catch (error) {
      const jobError = error instanceof JobError ? error : this.createJobError(error);
      return await this.errorHandler.handleJobError(jobError, {
        retryFunction: async (retryCount) => {
          globalMonitor.updateJobProgress(jobId, 25 + retryCount * 10, "retrying", `Retrying article generation (attempt ${retryCount + 1})...`);
          return await this.attemptArticleGeneration(inputs, jobId);
        },
      });
    }
  }

  /**
   * 記事生成を試行
   */
  async attemptArticleGeneration(inputs, jobId) {
    let apiCallStart = null;
    try {
      Logger.info("Starting article generation with Claude Sonnet 4.5...");
      globalMonitor.updateJobProgress(jobId, 30, "preparing", "Preparing article prompt...");

      const articlePrompt = this.buildArticlePrompt(inputs);

      globalMonitor.updateJobProgress(jobId, 35, "api_call", "Calling Anthropic API...");
      apiCallStart = Date.now();

      // タイムアウト付きでAPI呼び出し
      const timeoutMs = 300000; // 5分のタイムアウト
      const response = await Promise.race([
        this.anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 4000,
          temperature: 0.7, // 創造性を高めるため少し高めに設定
          system: this.getSystemPrompt(),
          messages: [
            {
              role: "user",
              content: articlePrompt,
            },
          ],
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error(`API call timed out after ${timeoutMs}ms`)), timeoutMs)),
      ]);

      const responseTime = Date.now() - apiCallStart;
      globalMonitor.trackAPICall("anthropic", "messages.create", responseTime, true);

      globalMonitor.updateJobProgress(jobId, 60, "parsing", "Parsing article response...");

      // レスポンスから記事を抽出
      const article = this.parseArticleResponse(response, inputs);
      Logger.info("Article generated successfully");
      return article;
    } catch (error) {
      const responseTime = apiCallStart ? Date.now() - apiCallStart : 0;
      globalMonitor.trackAPICall("anthropic", "messages.create", responseTime, false, { error: error.message });

      // Anthropic固有のエラーハンドリング
      const jobError = AnthropicErrorHandler.handleError(error, this.jobName);
      throw jobError;
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
    } else if (error.message?.includes("Input loading failed")) {
      errorType = ErrorTypes.FILE_ERROR;
      severity = ErrorSeverity.HIGH;
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
   * システムプロンプトを取得
   */
  getSystemPrompt() {
    return `あなたは優秀なライターです。リサーチレポートを基に、読者にとって価値のある記事を執筆してください。

記事執筆の要件:
1. note.comに適したMarkdown形式で執筆
2. 読者の知識レベルに合わせた内容
3. 具体例や事例を豊富に含める
4. 実践的で行動につながる内容
5. SEOを意識したタイトルと構成
6. 適切な見出し構造（H2, H3を使用）
7. 読みやすい段落分け

出力形式:
必ず以下のJSON形式で回答してください:

{
  "title": "魅力的で具体的なタイトル（50文字以内）",
  "content": "Markdown形式の記事本文",
  "tags": ["タグ1", "タグ2", "タグ3"],
  "summary": "記事の要約（200文字程度）",
  "keyPoints": [
    "重要ポイント1",
    "重要ポイント2",
    "重要ポイント3"
  ],
  "targetAudience": "想定読者の詳細",
  "callToAction": "読者に促したい具体的なアクション"
}

記事の構成例:
## はじめに
（読者の関心を引く導入）

## [メインテーマ]の現状
（リサーチ結果を基にした現状分析）

## 具体的な活用方法
（実践的な内容）

## 成功事例・失敗事例
（具体例）

## まとめ
（要点の整理と次のアクション）`;
  }

  /**
   * 記事生成プロンプトを構築
   */
  buildArticlePrompt(inputs) {
    const { researchReport, theme, target, message, cta, tags } = inputs;

    // リサーチレポートから重要な情報を抽出
    const keyPoints = researchReport.keyPoints?.slice(0, 5) || [];
    const trends = researchReport.trends?.slice(0, 3) || [];
    const statistics = researchReport.statistics?.slice(0, 3) || [];
    const sources = researchReport.sources?.slice(0, 5) || [];

    return `以下の情報を基に、魅力的で実用的な記事を執筆してください:

## 基本情報
- テーマ: ${theme}
- 想定読者: ${target}
- 伝えたいメッセージ: ${message}
- 読後のアクション: ${cta}
- 推奨タグ: ${tags.join(", ")}

## リサーチ結果

### 概要
${researchReport.summary || "リサーチ概要なし"}

### 重要ポイント
${keyPoints.map((point, index) => `${index + 1}. ${point.title}: ${point.description}`).join("\n")}

### トレンド情報
${trends.map((trend, index) => `${index + 1}. ${trend.trend}: ${trend.description} (影響度: ${trend.impact})`).join("\n")}

### 統計データ
${statistics.map((stat, index) => `${index + 1}. ${stat.metric}: ${stat.value} (出典: ${stat.source})`).join("\n")}

### 参考資料
${sources.map((source, index) => `${index + 1}. ${source.title} (${source.url})`).join("\n")}

## 執筆要件
1. 想定読者（${target}）に適した内容レベル
2. 「${message}」というメッセージを効果的に伝える
3. 読者が「${cta}」したくなる構成
4. リサーチ結果を根拠として活用
5. 2000-3000文字程度の記事
6. note.comで人気が出そうな魅力的なタイトル
7. 実践的で具体的な内容

リサーチ結果を効果的に活用し、読者にとって価値のある記事を作成してください。`;
  }

  /**
   * Claude APIのレスポンスを解析して記事を作成
   */
  parseArticleResponse(response, inputs) {
    Logger.info("Parsing article response...");

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
        const articleData = JSON.parse(jsonMatch[0]);

        // 基本的な検証
        if (!articleData.title || !articleData.content) {
          throw new Error("Invalid article structure: missing title or content");
        }

        // メタデータを追加
        articleData.metadata = {
          generatedAt: new Date().toISOString(),
          model: "claude-3-5-sonnet-20241022",
          inputs: {
            theme: inputs.theme,
            target: inputs.target,
            message: inputs.message,
            cta: inputs.cta,
          },
          wordCount: this.countWords(articleData.content),
          estimatedReadingTime: this.estimateReadingTime(articleData.content),
          characterCount: articleData.content.length,
        };

        return articleData;
      } else {
        // JSONが見つからない場合は、テキストから基本的な記事を作成
        return this.createFallbackArticle(inputs, content);
      }
    } catch (error) {
      Logger.warn("Failed to parse JSON response, creating fallback article", error);
      return this.createFallbackArticle(inputs, response.content[0]?.text || "");
    }
  }

  /**
   * フォールバック用の記事を作成
   */
  createFallbackArticle(inputs, content = "") {
    const fallbackContent =
      content ||
      `# ${inputs.theme}について

${inputs.researchReport.summary || "リサーチ結果を基に記事を作成中です。"}

## まとめ

${inputs.message}

詳細については、さらなる調査が必要です。`;

    return {
      title: `${inputs.theme}について知っておくべきこと`,
      content: fallbackContent,
      tags: inputs.tags.slice(0, 5),
      summary: `${inputs.theme}に関する基本的な情報をまとめました。`,
      keyPoints: [`${inputs.theme}の基本概念`, "現在の動向", "今後の展望"],
      targetAudience: inputs.target,
      callToAction: inputs.cta,
      metadata: {
        generatedAt: new Date().toISOString(),
        model: "claude-3-5-sonnet-20241022",
        inputs,
        fallback: true,
        wordCount: this.countWords(fallbackContent),
        estimatedReadingTime: this.estimateReadingTime(fallbackContent),
        characterCount: fallbackContent.length,
      },
    };
  }

  /**
   * 記事の検証と品質チェック
   */
  async validateArticle(article, inputs) {
    Logger.info("Validating article quality...");

    try {
      // 包括的な品質検証を実行
      const comprehensiveValidation = ArticleValidator.validateArticleQuality(article, inputs);

      // 既存の簡易検証も実行（後方互換性のため）
      const basicValidation = {
        titleLength: article.title.length,
        contentLength: article.content.length,
        hasProperStructure: this.checkArticleStructure(article.content),
        tagCount: article.tags?.length || 0,
        readabilityScore: this.calculateReadabilityScore(article.content),
        keywordDensity: this.calculateKeywordDensity(article.content, inputs.theme),
      };

      // 基本品質スコアを計算（既存ロジック）
      let basicQualityScore = 0;

      if (basicValidation.titleLength >= 20 && basicValidation.titleLength <= 50) {
        basicQualityScore += 0.2;
      } else if (basicValidation.titleLength >= 10 && basicValidation.titleLength <= 70) {
        basicQualityScore += 0.1;
      }

      if (basicValidation.contentLength >= 1500 && basicValidation.contentLength <= 4000) {
        basicQualityScore += 0.3;
      } else if (basicValidation.contentLength >= 800 && basicValidation.contentLength <= 6000) {
        basicQualityScore += 0.2;
      }

      if (basicValidation.hasProperStructure) {
        basicQualityScore += 0.2;
      }

      if (basicValidation.tagCount >= 3 && basicValidation.tagCount <= 5) {
        basicQualityScore += 0.1;
      }

      basicQualityScore += basicValidation.readabilityScore * 0.1;
      basicQualityScore += basicValidation.keywordDensity * 0.1;

      // 検証結果を記事に追加
      article.validation = {
        basic: basicValidation,
        comprehensive: comprehensiveValidation,
      };

      // より高い品質スコアを採用
      article.qualityScore = Math.max(Math.min(1, basicQualityScore), comprehensiveValidation.overallScore);

      // 改善提案を追加
      article.improvementSuggestions = comprehensiveValidation.suggestions;

      Logger.info("Article validation completed:", {
        basicQualityScore: `${(basicQualityScore * 100).toFixed(1)}%`,
        comprehensiveQualityScore: `${(comprehensiveValidation.overallScore * 100).toFixed(1)}%`,
        finalQualityScore: `${(article.qualityScore * 100).toFixed(1)}%`,
        suggestionsCount: comprehensiveValidation.suggestions.length,
        titleLength: basicValidation.titleLength,
        contentLength: basicValidation.contentLength,
      });

      return article;
    } catch (error) {
      Logger.warn("Comprehensive validation failed, using basic validation", error);

      // フォールバック: 基本検証のみ実行
      const basicValidation = {
        titleLength: article.title.length,
        contentLength: article.content.length,
        hasProperStructure: this.checkArticleStructure(article.content),
        tagCount: article.tags?.length || 0,
        readabilityScore: 0.6, // デフォルト値
        keywordDensity: 0.5, // デフォルト値
      };

      article.validation = { basic: basicValidation };
      article.qualityScore = 0.6; // デフォルトスコア
      article.improvementSuggestions = [];

      return article;
    }
  }

  /**
   * 記事構造をチェック
   */
  checkArticleStructure(content) {
    const hasH2 = content.includes("## ");
    const hasParagraphs = content.split("\n\n").length >= 3;
    const hasIntroduction = content.length > 100;

    return hasH2 && hasParagraphs && hasIntroduction;
  }

  /**
   * 読みやすさスコアを計算
   */
  calculateReadabilityScore(content) {
    try {
      const sentences = content.split(/[.!?。！？]/).filter((s) => s.trim().length > 0);
      const words = content.split(/\s+/).filter((w) => w.length > 0);

      if (sentences.length === 0 || words.length === 0) return 0;

      const avgWordsPerSentence = words.length / sentences.length;
      const avgCharsPerWord = content.replace(/\s/g, "").length / words.length;

      // 理想的な値に近いほど高スコア
      const sentenceScore = Math.max(0, 1 - Math.abs(avgWordsPerSentence - 15) / 15);
      const wordScore = Math.max(0, 1 - Math.abs(avgCharsPerWord - 4) / 4);

      return (sentenceScore + wordScore) / 2;
    } catch (error) {
      Logger.warn("Failed to calculate readability score", error);
      return 0.5;
    }
  }

  /**
   * キーワード密度を計算
   */
  calculateKeywordDensity(content, theme) {
    try {
      const contentLower = content.toLowerCase();
      const themeLower = theme.toLowerCase();
      const words = contentLower.split(/\s+/).filter((w) => w.length > 0);

      if (words.length === 0) return 0;

      const themeWords = themeLower.split(/\s+/);
      let keywordCount = 0;

      for (const themeWord of themeWords) {
        if (themeWord.length > 2) {
          keywordCount += (contentLower.match(new RegExp(themeWord, "g")) || []).length;
        }
      }

      const density = keywordCount / words.length;

      // 理想的な密度は1-3%
      if (density >= 0.01 && density <= 0.03) {
        return 1;
      } else if (density >= 0.005 && density <= 0.05) {
        return 0.7;
      } else {
        return Math.max(0, 1 - Math.abs(density - 0.02) / 0.02);
      }
    } catch (error) {
      Logger.warn("Failed to calculate keyword density", error);
      return 0.5;
    }
  }

  /**
   * 単語数をカウント
   */
  countWords(content) {
    return content.split(/\s+/).filter((word) => word.length > 0).length;
  }

  /**
   * 読了時間を推定（日本語：400文字/分、英語：200単語/分）
   */
  estimateReadingTime(content) {
    const japaneseChars = (content.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []).length;
    const englishWords = content.split(/\s+/).filter((word) => /^[a-zA-Z]+$/.test(word)).length;

    const japaneseTime = japaneseChars / 400; // 400文字/分
    const englishTime = englishWords / 200; // 200単語/分

    return Math.ceil(japaneseTime + englishTime);
  }

  /**
   * 結果を保存
   */
  async saveResults(noteArticle, inputs) {
    Logger.info("Saving article results...");

    try {
      // 出力ディレクトリの確保
      await FileManager.ensureDirectory("outputs");

      // note.com形式の記事データを保存
      const outputPath = "outputs/article-draft.json";
      await FileManager.writeJSON(outputPath, noteArticle);

      // Markdown形式でも保存
      const markdownPath = "outputs/article-draft.md";
      const markdownContent = this.formatAsMarkdown(noteArticle);
      await FileManager.writeFile(markdownPath, markdownContent);

      // note.com投稿用データを保存
      const notePostData = NoteFormatter.createNotePostData(noteArticle);
      const notePostPath = "outputs/note-post-data.json";
      await FileManager.writeJSON(notePostPath, notePostData);

      // プレビューHTML生成
      const previewHTML = NoteFormatter.generatePreviewHTML(noteArticle);
      const previewPath = "outputs/article-preview.html";
      await FileManager.writeFile(previewPath, previewHTML);

      // GitHub Actions出力を設定
      const compactArticle = {
        title: noteArticle.title,
        content: noteArticle.content,
        tags: noteArticle.tags,
        summary: noteArticle.summary,
        qualityScore: noteArticle.originalArticle.qualityScore,
        wordCount: noteArticle.originalArticle.metadata.wordCount,
        estimatedReadingTime: noteArticle.originalArticle.metadata.estimatedReadingTime,
        noteFormatted: true,
      };

      FileManager.setGitHubOutput("article", JSON.stringify(compactArticle));

      Logger.info("Article saved in multiple formats:", {
        json: outputPath,
        markdown: markdownPath,
        notePostData: notePostPath,
        preview: previewPath,
      });
    } catch (error) {
      Logger.error("Failed to save article results", error);
      throw error;
    }
  }

  /**
   * 記事をMarkdown形式でフォーマット
   */
  formatAsMarkdown(article) {
    let markdown = `# ${article.title}\n\n`;

    if (article.summary) {
      markdown += `> ${article.summary}\n\n`;
    }

    markdown += article.content;

    if (article.tags && article.tags.length > 0) {
      markdown += `\n\n---\n\n`;
      markdown += `**タグ**: ${article.tags.map((tag) => `#${tag}`).join(" ")}\n`;
    }

    if (article.metadata) {
      markdown += `\n**生成情報**:\n`;
      markdown += `- 文字数: ${article.metadata.characterCount}文字\n`;
      markdown += `- 単語数: ${article.metadata.wordCount}語\n`;
      markdown += `- 推定読了時間: ${article.metadata.estimatedReadingTime}分\n`;
      markdown += `- 品質スコア: ${(article.qualityScore * 100).toFixed(1)}%\n`;
      markdown += `- 生成日時: ${new Date(article.metadata.generatedAt).toLocaleString("ja-JP")}\n`;
    }

    return markdown;
  }
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  const job = new WritingJob();
  await job.execute();
}
