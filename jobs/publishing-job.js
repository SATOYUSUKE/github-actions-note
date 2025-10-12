/**
 * Publishing Job - Playwrightを使用したnote.com自動投稿
 */

import { chromium } from 'playwright';
import { Logger } from '../utils/logger.js';
import { FileManager } from '../utils/file-manager.js';
import { EnvValidator } from '../utils/env-validator.js';
import { NotePublisher } from '../utils/note-publisher.js';

class PublishingJob {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.screenshots = [];
  }

  /**
   * メインの実行関数
   */
  async execute() {
    try {
      Logger.jobStart('Publishing Job');
      
      // 環境変数の検証
      EnvValidator.validateNoteStorageState();
      
      // 入力データの読み込み
      const inputs = await this.loadInputs();
      Logger.info('Publishing inputs loaded:', {
        hasArticle: !!inputs.article,
        title: inputs.article?.title,
        isPublic: inputs.isPublic,
        dryRun: inputs.dryRun
      });
      
      // Dry runの場合は投稿をスキップ
      if (inputs.dryRun) {
        Logger.info('Dry run mode: skipping actual publication');
        const dryRunResult = await this.performDryRun(inputs);
        await this.saveResults(dryRunResult);
        Logger.jobComplete('Publishing Job (Dry Run)', dryRunResult);
        return;
      }
      
      // Playwrightのセットアップ
      await this.setupPlaywright();
      
      // note.comへの投稿
      const publishResult = await this.publishToNote(inputs);
      
      // 投稿後のクリーンアップ
      const cleanup = await NotePublisher.performPostPublishCleanup(this.page);
      publishResult.cleanup = cleanup;
      
      // 記事プレビューの生成
      if (publishResult.success && publishResult.noteUrl) {
        const preview = await NotePublisher.generateArticlePreview(this.page);
        publishResult.preview = preview;
      }
      
      // 結果の保存
      await this.saveResults(publishResult);
      
      Logger.jobComplete('Publishing Job', {
        success: publishResult.success,
        status: publishResult.status,
        noteUrl: publishResult.noteUrl,
        screenshotsCount: publishResult.screenshots?.length || 0
      });
      
    } catch (error) {
      Logger.jobError('Publishing Job', error);
      
      // エラー時もスクリーンショットを保存
      if (this.page) {
        await this.takeScreenshot('error');
      }
      
      process.exit(1);
    } finally {
      // ブラウザのクリーンアップ
      await this.cleanup();
    }
  }

  /**
   * 入力データを読み込み
   */
  async loadInputs() {
    try {
      // 検証済み記事を読み込み
      const article = await FileManager.readJSON('inputs/verified-article.json');
      
      // GitHub Actions入力パラメータを取得
      const inputs = {
        article,
        isPublic: FileManager.getGitHubInput('IS_PUBLIC', 'false') === 'true',
        dryRun: FileManager.getGitHubInput('DRY_RUN', 'true') === 'true'
      };
      
      return inputs;
      
    } catch (error) {
      Logger.error('Failed to load inputs', error);
      throw new Error(`Input loading failed: ${error.message}`);
    }
  }

  /**
   * Dry runを実行
   */
  async performDryRun(inputs) {
    Logger.info('Performing comprehensive dry run validation...');
    
    const dryRunResult = {
      success: true,
      status: 'dry_run_completed',
      message: 'Dry run completed successfully',
      article: {
        title: inputs.article.title,
        contentLength: inputs.article.content?.length || 0,
        tags: inputs.article.tags || [],
        hasFactCheck: !!inputs.article.factCheck,
        factCheckScore: inputs.article.factCheck?.overallScore || 0,
        qualityScore: inputs.article.originalArticle?.qualityScore || inputs.article.qualityScore || 0
      },
      validation: {
        titleValid: this.validateTitle(inputs.article.title),
        contentValid: this.validateContent(inputs.article.content),
        tagsValid: this.validateTags(inputs.article.tags),
        factCheckValid: this.validateFactCheck(inputs.article.factCheck),
        qualityValid: this.validateQuality(inputs.article),
        readyForPublication: false
      },
      recommendations: [],
      estimatedPublishTime: this.estimatePublishTime(inputs.article),
      timestamp: new Date().toISOString()
    };
    
    // 詳細な検証結果の分析
    const validationDetails = this.analyzeValidationResults(dryRunResult.validation, inputs.article);
    dryRunResult.validationDetails = validationDetails;
    
    // 推奨事項の生成
    dryRunResult.recommendations = this.generateDryRunRecommendations(dryRunResult.validation, inputs.article);
    
    // 公開準備チェック
    const criticalChecks = [
      dryRunResult.validation.titleValid,
      dryRunResult.validation.contentValid,
      dryRunResult.validation.factCheckValid
    ];
    
    const optionalChecks = [
      dryRunResult.validation.tagsValid,
      dryRunResult.validation.qualityValid
    ];
    
    const criticalPassed = criticalChecks.every(check => check);
    const optionalPassed = optionalChecks.filter(check => check).length;
    
    dryRunResult.validation.readyForPublication = criticalPassed && optionalPassed >= 1;
    
    // 結果メッセージの設定
    if (!dryRunResult.validation.readyForPublication) {
      if (!criticalPassed) {
        dryRunResult.success = false;
        dryRunResult.message = 'Critical validation failed - article not ready for publication';
        dryRunResult.status = 'validation_failed';
      } else {
        dryRunResult.message = 'Article ready for publication with minor issues';
        dryRunResult.status = 'ready_with_warnings';
      }
    } else {
      dryRunResult.message = 'Article fully validated and ready for publication';
      dryRunResult.status = 'ready_for_publication';
    }
    
    // Dry run統計の生成
    dryRunResult.statistics = this.generateDryRunStatistics(dryRunResult);
    
    Logger.info('Dry run completed', {
      status: dryRunResult.status,
      readyForPublication: dryRunResult.validation.readyForPublication,
      recommendationsCount: dryRunResult.recommendations.length
    });
    
    return dryRunResult;
  }

  /**
   * ファクトチェック検証
   */
  validateFactCheck(factCheck) {
    if (!factCheck || !factCheck.checked) {
      return false;
    }
    
    // 信頼性スコアが60%以上
    return factCheck.overallScore >= 0.6;
  }

  /**
   * 品質検証
   */
  validateQuality(article) {
    const qualityScore = article.originalArticle?.qualityScore || article.qualityScore || 0;
    
    // 品質スコアが70%以上
    return qualityScore >= 0.7;
  }

  /**
   * 検証結果の詳細分析
   */
  analyzeValidationResults(validation, article) {
    const details = {
      title: {
        length: article.title?.length || 0,
        recommended: '15-50文字',
        status: validation.titleValid ? 'pass' : 'fail'
      },
      content: {
        length: article.content?.length || 0,
        recommended: '500-10000文字',
        status: validation.contentValid ? 'pass' : 'fail'
      },
      tags: {
        count: article.tags?.length || 0,
        recommended: '1-5個',
        status: validation.tagsValid ? 'pass' : 'fail'
      },
      factCheck: {
        score: article.factCheck?.overallScore || 0,
        recommended: '60%以上',
        status: validation.factCheckValid ? 'pass' : 'fail'
      },
      quality: {
        score: article.originalArticle?.qualityScore || article.qualityScore || 0,
        recommended: '70%以上',
        status: validation.qualityValid ? 'pass' : 'fail'
      }
    };
    
    return details;
  }

  /**
   * Dry run推奨事項の生成
   */
  generateDryRunRecommendations(validation, article) {
    const recommendations = [];
    
    if (!validation.titleValid) {
      const titleLength = article.title?.length || 0;
      if (titleLength < 15) {
        recommendations.push({
          type: 'title',
          priority: 'high',
          message: 'タイトルが短すぎます。15文字以上にすることを推奨します。',
          currentValue: titleLength,
          recommendedValue: '15-50文字'
        });
      } else if (titleLength > 50) {
        recommendations.push({
          type: 'title',
          priority: 'medium',
          message: 'タイトルが長すぎます。50文字以内にすることを推奨します。',
          currentValue: titleLength,
          recommendedValue: '15-50文字'
        });
      }
    }
    
    if (!validation.contentValid) {
      const contentLength = article.content?.length || 0;
      if (contentLength < 500) {
        recommendations.push({
          type: 'content',
          priority: 'high',
          message: 'コンテンツが短すぎます。より詳細な内容を追加してください。',
          currentValue: contentLength,
          recommendedValue: '500文字以上'
        });
      }
    }
    
    if (!validation.factCheckValid) {
      const score = article.factCheck?.overallScore || 0;
      recommendations.push({
        type: 'factcheck',
        priority: 'high',
        message: 'ファクトチェックスコアが低いです。内容の見直しを推奨します。',
        currentValue: `${(score * 100).toFixed(1)}%`,
        recommendedValue: '60%以上'
      });
    }
    
    if (!validation.qualityValid) {
      const score = article.originalArticle?.qualityScore || article.qualityScore || 0;
      recommendations.push({
        type: 'quality',
        priority: 'medium',
        message: '記事品質スコアが低いです。構造や内容の改善を検討してください。',
        currentValue: `${(score * 100).toFixed(1)}%`,
        recommendedValue: '70%以上'
      });
    }
    
    if (!validation.tagsValid) {
      const tagCount = article.tags?.length || 0;
      if (tagCount === 0) {
        recommendations.push({
          type: 'tags',
          priority: 'low',
          message: 'タグが設定されていません。SEO効果を高めるためタグの追加を推奨します。',
          currentValue: tagCount,
          recommendedValue: '1-5個'
        });
      }
    }
    
    return recommendations;
  }

  /**
   * 公開時間の推定
   */
  estimatePublishTime(article) {
    const baseTime = 30; // 基本30秒
    const contentFactor = Math.min((article.content?.length || 0) / 1000, 5); // コンテンツ長による追加時間
    const tagFactor = (article.tags?.length || 0) * 2; // タグ数による追加時間
    
    return Math.ceil(baseTime + contentFactor + tagFactor);
  }

  /**
   * Dry run統計の生成
   */
  generateDryRunStatistics(dryRunResult) {
    const validation = dryRunResult.validation;
    
    const totalChecks = Object.keys(validation).length - 1; // readyForPublicationを除く
    const passedChecks = Object.values(validation).filter(v => v === true).length;
    
    return {
      totalChecks,
      passedChecks,
      failedChecks: totalChecks - passedChecks,
      passRate: (passedChecks / totalChecks * 100).toFixed(1),
      criticalIssues: dryRunResult.recommendations.filter(r => r.priority === 'high').length,
      warnings: dryRunResult.recommendations.filter(r => r.priority === 'medium').length,
      suggestions: dryRunResult.recommendations.filter(r => r.priority === 'low').length
    };
  }

  /**
   * Playwrightのセットアップ
   */
  async setupPlaywright() {
    Logger.info('Setting up Playwright...');
    
    try {
      // ストレージ状態を読み込み
      const storageStateJson = process.env.NOTE_STORAGE_STATE_JSON;
      const storageState = JSON.parse(storageStateJson);
      
      // ブラウザを起動
      this.browser = await chromium.launch({
        headless: true, // GitHub Actionsではheadlessで実行
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--no-sandbox',
          '--disable-setuid-sandbox'
        ]
      });
      
      // コンテキストを作成（ストレージ状態を復元）
      this.context = await this.browser.newContext({
        storageState: storageState,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 },
        extraHTTPHeaders: {
          'Accept-Language': 'ja-JP,ja;q=0.9,en;q=0.8'
        }
      });
      
      // 自動化検出を回避
      await this.context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });
      });
      
      // ページを作成
      this.page = await this.context.newPage();
      
      // ネットワークエラーのハンドリング
      this.page.on('response', response => {
        if (!response.ok()) {
          Logger.warn(`Network response error: ${response.status()} ${response.url()}`);
        }
      });
      
      Logger.info('Playwright setup completed');
      
    } catch (error) {
      Logger.error('Playwright setup failed', error);
      throw new Error(`Playwright setup failed: ${error.message}`);
    }
  }

  /**
   * note.comへの投稿
   */
  async publishToNote(inputs) {
    Logger.info('Starting publication to note.com...');
    
    const publishResult = {
      success: false,
      status: 'failed',
      message: '',
      noteUrl: null,
      screenshots: [],
      timestamp: new Date().toISOString()
    };

    try {
      // 1. note.comにアクセス
      await this.navigateToNote();
      await this.takeScreenshot('01-note-homepage');
      
      // 2. ログイン状態を確認
      const isLoggedIn = await this.verifyLoginStatus();
      if (!isLoggedIn) {
        throw new Error('Not logged in to note.com');
      }
      await this.takeScreenshot('02-login-verified');
      
      // 3. 記事作成ページに移動
      await this.navigateToNewArticle();
      await this.takeScreenshot('03-new-article-page');
      
      // 4. 記事内容を入力
      await this.fillArticleContent(inputs.article);
      await this.takeScreenshot('04-content-filled');
      
      // 5. タグを設定
      if (inputs.article.tags && inputs.article.tags.length > 0) {
        await this.setTags(inputs.article.tags);
        await this.takeScreenshot('05-tags-set');
      }
      
      // 6. 公開設定
      if (inputs.isPublic) {
        await this.publishArticle();
        publishResult.status = 'published';
        publishResult.message = 'Article published successfully';
      } else {
        await this.saveDraft();
        publishResult.status = 'draft';
        publishResult.message = 'Article saved as draft';
      }
      
      await this.takeScreenshot('06-publication-complete');
      
      // 7. 記事URLを取得
      publishResult.noteUrl = await this.getArticleUrl();
      
      publishResult.success = true;
      publishResult.screenshots = this.screenshots;
      
      Logger.info('Publication completed successfully', {
        status: publishResult.status,
        url: publishResult.noteUrl
      });
      
      return publishResult;
      
    } catch (error) {
      Logger.error('Publication failed', error);
      
      publishResult.message = `Publication failed: ${error.message}`;
      publishResult.screenshots = this.screenshots;
      
      // エラー時のスクリーンショット
      await this.takeScreenshot('error-state');
      
      return publishResult;
    }
  }

  /**
   * note.comにアクセス
   */
  async navigateToNote() {
    Logger.info('Navigating to note.com...');
    
    try {
      await this.page.goto('https://note.com/', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      // ページが正常に読み込まれるまで待機
      await this.page.waitForSelector('body', { timeout: 10000 });
      
    } catch (error) {
      throw new Error(`Failed to navigate to note.com: ${error.message}`);
    }
  }

  /**
   * ログイン状態を確認
   */
  async verifyLoginStatus() {
    Logger.info('Verifying login status...');
    
    try {
      // 複数のセレクターでログイン状態を確認
      const loginSelectors = [
        'a[href*="/settings"]',
        'button[aria-label*="ユーザー"]',
        '[class*="user-menu"]',
        '[class*="UserMenu"]',
        'a[href*="/dashboard"]',
        'button[data-testid*="user"]'
      ];
      
      for (const selector of loginSelectors) {
        try {
          const element = await this.page.waitForSelector(selector, { timeout: 3000 });
          if (element) {
            Logger.info(`Login verified with selector: ${selector}`);
            return true;
          }
        } catch (e) {
          // 次のセレクターを試す
        }
      }
      
      // 記事作成ページに直接アクセスしてログイン状態を確認
      const currentUrl = this.page.url();
      await this.page.goto('https://note.com/new', { waitUntil: 'networkidle', timeout: 15000 });
      
      const newUrl = this.page.url();
      if (newUrl.includes('/new') || newUrl.includes('editor')) {
        Logger.info('Login verified by accessing new article page');
        return true;
      }
      
      if (newUrl.includes('login') || newUrl.includes('signin')) {
        Logger.warn('Redirected to login page - not logged in');
        return false;
      }
      
      return true;
      
    } catch (error) {
      Logger.warn('Login verification failed', error);
      return false;
    }
  }

  /**
   * 記事作成ページに移動
   */
  async navigateToNewArticle() {
    Logger.info('Navigating to new article page...');
    
    try {
      // 既に記事作成ページにいる場合はスキップ
      const currentUrl = this.page.url();
      if (currentUrl.includes('/new') || currentUrl.includes('editor')) {
        Logger.info('Already on article creation page');
        return;
      }
      
      // 記事作成ページに移動
      await this.page.goto('https://note.com/new', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      // エディターが読み込まれるまで待機
      await this.page.waitForSelector('input[placeholder*="タイトル"], input[placeholder*="title"]', { 
        timeout: 15000 
      });
      
    } catch (error) {
      throw new Error(`Failed to navigate to new article page: ${error.message}`);
    }
  }

  /**
   * 記事内容を入力
   */
  async fillArticleContent(article) {
    await NotePublisher.logPublishingProgress(this.page, 'filling_content', {
      titleLength: article.title.length,
      contentLength: article.content.length
    });
    
    try {
      const selectors = NotePublisher.getNoteSelectors();
      
      // タイトルを入力
      const titleSuccess = await NotePublisher.smartTextInput(
        this.page, 
        selectors.title, 
        article.title,
        { clearFirst: true, delay: 50 }
      );
      
      if (!titleSuccess) {
        throw new Error('Failed to input title');
      }
      
      Logger.info(`Title filled: ${article.title}`);
      await this.page.waitForTimeout(1000);
      
      // 本文を入力
      const contentSuccess = await NotePublisher.smartTextInput(
        this.page, 
        selectors.content, 
        article.content,
        { clearFirst: true, useKeyboard: true, delay: 10 }
      );
      
      if (!contentSuccess) {
        // フォールバック: キーボード操作で入力
        Logger.warn('Standard content input failed, trying keyboard fallback');
        await this.page.keyboard.press('Tab');
        await this.page.keyboard.press('Tab');
        await this.page.keyboard.type(article.content, { delay: 10 });
        Logger.info('Content filled using keyboard fallback');
      } else {
        Logger.info('Content filled successfully');
      }
      
      // 入力完了まで待機
      await this.page.waitForTimeout(2000);
      
      // 入力内容の検証
      const verification = await this.verifyContentInput(article);
      if (!verification.success) {
        Logger.warn('Content input verification failed', verification);
      }
      
    } catch (error) {
      throw new Error(`Failed to fill article content: ${error.message}`);
    }
  }

  /**
   * 入力内容の検証
   */
  async verifyContentInput(article) {
    try {
      const verification = {
        success: false,
        titleMatch: false,
        contentMatch: false,
        details: {}
      };

      // タイトルの検証
      const titleValue = await this.page.evaluate(() => {
        const titleInputs = document.querySelectorAll('input[placeholder*="タイトル"], input[placeholder*="title"], h1[contenteditable="true"]');
        for (const input of titleInputs) {
          if (input.value || input.textContent) {
            return input.value || input.textContent;
          }
        }
        return '';
      });

      verification.titleMatch = titleValue.trim() === article.title.trim();
      verification.details.expectedTitle = article.title;
      verification.details.actualTitle = titleValue;

      // 本文の検証（最初の100文字をチェック）
      const contentValue = await this.page.evaluate(() => {
        const contentElements = document.querySelectorAll('textarea[placeholder*="本文"], [contenteditable="true"]:not(h1)');
        for (const element of contentElements) {
          const value = element.value || element.textContent;
          if (value && value.length > 50) {
            return value;
          }
        }
        return '';
      });

      const expectedStart = article.content.substring(0, 100);
      const actualStart = contentValue.substring(0, 100);
      verification.contentMatch = actualStart.includes(expectedStart.substring(0, 50));
      verification.details.expectedContentStart = expectedStart;
      verification.details.actualContentStart = actualStart;

      verification.success = verification.titleMatch && verification.contentMatch;
      return verification;

    } catch (error) {
      Logger.warn('Content verification failed', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * タグを設定
   */
  async setTags(tags) {
    await NotePublisher.logPublishingProgress(this.page, 'setting_tags', {
      tagCount: tags.length,
      tags: tags
    });
    
    try {
      const selectors = NotePublisher.getNoteSelectors();
      const validTags = tags.slice(0, 5).filter(tag => tag && tag.length <= 20);
      
      if (validTags.length === 0) {
        Logger.info('No valid tags to set');
        return;
      }
      
      // タグ入力エリアを探す
      const { element: tagInput, selector } = await NotePublisher.findElementWithFallback(
        this.page, 
        selectors.tags, 
        5000
      );
      
      Logger.info(`Tag input found with selector: ${selector}`);
      
      // 各タグを入力
      for (let i = 0; i < validTags.length; i++) {
        const tag = validTags[i];
        
        try {
          await tagInput.focus();
          await this.page.waitForTimeout(300);
          
          // タグを入力
          await tagInput.fill(tag);
          await this.page.waitForTimeout(200);
          
          // Enterキーでタグを確定
          await this.page.keyboard.press('Enter');
          await this.page.waitForTimeout(500);
          
          Logger.info(`Tag ${i + 1}/${validTags.length} set: ${tag}`);
          
        } catch (error) {
          Logger.warn(`Failed to set tag: ${tag}`, error);
          // 個別のタグ設定失敗は続行
        }
      }
      
      // タグ設定の検証
      const tagVerification = await this.verifyTagsSet(validTags);
      if (tagVerification.success) {
        Logger.info('Tags set successfully', tagVerification);
      } else {
        Logger.warn('Tag verification failed', tagVerification);
      }
      
    } catch (error) {
      Logger.warn('Failed to set tags', error);
      // タグ設定の失敗は致命的ではないので続行
    }
  }

  /**
   * タグ設定の検証
   */
  async verifyTagsSet(expectedTags) {
    try {
      const verification = {
        success: false,
        expectedCount: expectedTags.length,
        actualCount: 0,
        matchedTags: [],
        details: {}
      };

      // 設定されたタグを取得
      const actualTags = await this.page.evaluate(() => {
        const tagElements = document.querySelectorAll('.tag, .hashtag, [class*="tag-item"]');
        return Array.from(tagElements).map(el => el.textContent.trim().replace('#', ''));
      });

      verification.actualCount = actualTags.length;
      verification.details.actualTags = actualTags;
      verification.details.expectedTags = expectedTags;

      // マッチするタグをカウント
      for (const expectedTag of expectedTags) {
        if (actualTags.some(actualTag => actualTag.includes(expectedTag) || expectedTag.includes(actualTag))) {
          verification.matchedTags.push(expectedTag);
        }
      }

      // 成功判定（50%以上のタグがマッチすれば成功）
      verification.success = verification.matchedTags.length >= Math.ceil(expectedTags.length * 0.5);

      return verification;

    } catch (error) {
      Logger.warn('Tag verification failed', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 記事を公開
   */
  async publishArticle() {
    await NotePublisher.logPublishingProgress(this.page, 'publishing_article');
    
    try {
      const selectors = NotePublisher.getNoteSelectors();
      
      // 公開ボタンをクリック
      const publishSuccess = await NotePublisher.smartButtonClick(
        this.page, 
        selectors.publishButton,
        { waitAfter: 3000, retries: 3 }
      );
      
      if (!publishSuccess) {
        throw new Error('Failed to click publish button');
      }
      
      // 公開処理の完了を待機
      await this.waitForPublicationComplete('published');
      
      // 公開成功の検証
      const verification = await NotePublisher.verifyPublicationSuccess(this.page, 'published');
      
      if (!verification.success) {
        Logger.warn('Publication verification failed', verification);
        throw new Error('Publication verification failed');
      }
      
      Logger.info('Article published successfully', verification);
      
    } catch (error) {
      throw new Error(`Failed to publish article: ${error.message}`);
    }
  }

  /**
   * 下書きとして保存
   */
  async saveDraft() {
    await NotePublisher.logPublishingProgress(this.page, 'saving_draft');
    
    try {
      const selectors = NotePublisher.getNoteSelectors();
      
      // 下書き保存ボタンをクリック
      const draftSuccess = await NotePublisher.smartButtonClick(
        this.page, 
        selectors.draftButton,
        { waitAfter: 2000, retries: 2 }
      );
      
      if (!draftSuccess) {
        // フォールバック: キーボードショートカット
        Logger.info('Draft button not found, trying keyboard shortcut');
        await this.page.keyboard.press('Control+S');
        await this.page.waitForTimeout(2000);
      }
      
      // 保存処理の完了を待機
      await this.waitForPublicationComplete('draft');
      
      // 下書き保存の検証
      const verification = await NotePublisher.verifyPublicationSuccess(this.page, 'draft');
      
      if (!verification.success) {
        Logger.warn('Draft save verification failed', verification);
        // 下書き保存の検証失敗は警告レベル（致命的ではない）
      }
      
      Logger.info('Draft saved successfully', verification);
      
    } catch (error) {
      throw new Error(`Failed to save draft: ${error.message}`);
    }
  }

  /**
   * 投稿完了を待機
   */
  async waitForPublicationComplete(expectedStatus) {
    Logger.info(`Waiting for ${expectedStatus} completion...`);
    
    try {
      // URL変化の待機
      const initialUrl = this.page.url();
      
      // 最大30秒待機
      for (let i = 0; i < 30; i++) {
        await this.page.waitForTimeout(1000);
        
        const currentUrl = this.page.url();
        
        // URL が変化した場合
        if (currentUrl !== initialUrl) {
          Logger.info(`URL changed from ${initialUrl} to ${currentUrl}`);
          
          // note記事URLパターンをチェック
          if (currentUrl.match(/note\.com\/[^/]+\/n\/[a-zA-Z0-9]+/)) {
            Logger.info('Publication URL detected');
            return true;
          }
        }
        
        // 成功メッセージの確認
        const hasSuccessMessage = await this.page.evaluate(() => {
          const messages = document.querySelectorAll('*');
          for (const msg of messages) {
            const text = msg.textContent || '';
            if (text.includes('公開しました') || text.includes('保存しました') || text.includes('投稿しました')) {
              return true;
            }
          }
          return false;
        });
        
        if (hasSuccessMessage) {
          Logger.info('Success message detected');
          return true;
        }
      }
      
      Logger.warn('Publication completion timeout');
      return false;
      
    } catch (error) {
      Logger.warn('Error waiting for publication complete', error);
      return false;
    }
  }

  /**
   * 記事URLを取得
   */
  async getArticleUrl() {
    try {
      // URLの変化を待機
      await this.page.waitForTimeout(2000);
      
      const currentUrl = this.page.url();
      
      // note.comの記事URLパターンをチェック
      if (currentUrl.includes('note.com') && 
          (currentUrl.includes('/n/') || currentUrl.includes('/notes/'))) {
        Logger.info(`Article URL obtained: ${currentUrl}`);
        return currentUrl;
      }
      
      // URLが変わっていない場合は、リダイレクトを待つ
      try {
        await this.page.waitForURL(/note\.com.*\/n\//, { timeout: 10000 });
        const finalUrl = this.page.url();
        Logger.info(`Article URL obtained after redirect: ${finalUrl}`);
        return finalUrl;
      } catch (e) {
        Logger.warn('Could not obtain article URL, returning current URL');
        return currentUrl;
      }
      
    } catch (error) {
      Logger.warn('Failed to get article URL', error);
      return this.page.url();
    }
  }

  /**
   * スクリーンショットを撮影
   */
  async takeScreenshot(step) {
    try {
      if (!this.page) return;
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `screenshot-${step}-${timestamp}.png`;
      const path = `outputs/screenshots/${filename}`;
      
      await FileManager.ensureDirectory('outputs/screenshots');
      await this.page.screenshot({ 
        path: path,
        fullPage: true 
      });
      
      this.screenshots.push({
        step: step,
        filename: filename,
        path: path,
        timestamp: new Date().toISOString()
      });
      
      Logger.info(`Screenshot taken: ${filename}`);
      
    } catch (error) {
      Logger.warn(`Failed to take screenshot for step ${step}`, error);
    }
  }

  /**
   * バリデーション関数
   */
  validateTitle(title) {
    return !!(title && title.length >= 5 && title.length <= 100);
  }

  validateContent(content) {
    return !!(content && content.length >= 100 && content.length <= 50000);
  }

  validateTags(tags) {
    return Array.isArray(tags) && tags.length <= 5 && 
           tags.every(tag => typeof tag === 'string' && tag.length <= 20);
  }

  /**
   * 結果を保存
   */
  async saveResults(publishResult) {
    Logger.info('Saving publishing results...');
    
    try {
      // 出力ディレクトリの確保
      await FileManager.ensureDirectory('outputs');
      await FileManager.ensureDirectory('outputs/publishing');
      
      // 公開結果を保存
      const resultPath = 'outputs/publishing-results.json';
      await FileManager.writeJSON(resultPath, publishResult);
      
      // 詳細レポートの生成と保存
      if (publishResult.status === 'dry_run_completed') {
        await this.saveDryRunReport(publishResult);
      } else {
        await this.savePublishReport(publishResult);
      }
      
      // スクリーンショットのメタデータを保存
      if (publishResult.screenshots && publishResult.screenshots.length > 0) {
        const screenshotMetaPath = 'outputs/publishing/screenshots-metadata.json';
        await FileManager.writeJSON(screenshotMetaPath, {
          count: publishResult.screenshots.length,
          screenshots: publishResult.screenshots,
          generatedAt: new Date().toISOString()
        });
      }
      
      // GitHub Actions出力を設定
      const compactResult = {
        success: publishResult.success,
        status: publishResult.status,
        noteUrl: publishResult.noteUrl,
        screenshotsCount: publishResult.screenshots?.length || 0,
        isDryRun: publishResult.status === 'dry_run_completed'
      };
      
      FileManager.setGitHubOutput('publish-result', JSON.stringify(compactResult));
      
      Logger.info('Publishing results saved:', {
        result: resultPath,
        success: publishResult.success,
        status: publishResult.status,
        hasScreenshots: (publishResult.screenshots?.length || 0) > 0
      });
      
    } catch (error) {
      Logger.error('Failed to save publishing results', error);
      throw error;
    }
  }

  /**
   * Dry runレポートを保存
   */
  async saveDryRunReport(dryRunResult) {
    try {
      // Dry run詳細レポート
      const dryRunReportPath = 'outputs/publishing/dry-run-report.json';
      await FileManager.writeJSON(dryRunReportPath, {
        summary: {
          status: dryRunResult.status,
          readyForPublication: dryRunResult.validation.readyForPublication,
          recommendationsCount: dryRunResult.recommendations.length,
          estimatedPublishTime: dryRunResult.estimatedPublishTime
        },
        validation: dryRunResult.validation,
        validationDetails: dryRunResult.validationDetails,
        recommendations: dryRunResult.recommendations,
        statistics: dryRunResult.statistics,
        article: dryRunResult.article,
        generatedAt: dryRunResult.timestamp
      });

      // HTML形式のレポート
      const htmlReport = this.generateDryRunHTMLReport(dryRunResult);
      const htmlReportPath = 'outputs/publishing/dry-run-report.html';
      await FileManager.writeFile(htmlReportPath, htmlReport);

      Logger.info('Dry run report saved:', {
        json: dryRunReportPath,
        html: htmlReportPath
      });

    } catch (error) {
      Logger.warn('Failed to save dry run report', error);
    }
  }

  /**
   * 公開レポートを保存
   */
  async savePublishReport(publishResult) {
    try {
      // 公開詳細レポート
      const publishReportPath = 'outputs/publishing/publish-report.json';
      await FileManager.writeJSON(publishReportPath, {
        summary: {
          success: publishResult.success,
          status: publishResult.status,
          noteUrl: publishResult.noteUrl,
          publishedAt: publishResult.timestamp
        },
        screenshots: publishResult.screenshots,
        preview: publishResult.preview,
        cleanup: publishResult.cleanup,
        generatedAt: new Date().toISOString()
      });

      // HTML形式のレポート
      const htmlReport = this.generatePublishHTMLReport(publishResult);
      const htmlReportPath = 'outputs/publishing/publish-report.html';
      await FileManager.writeFile(htmlReportPath, htmlReport);

      Logger.info('Publish report saved:', {
        json: publishReportPath,
        html: htmlReportPath
      });

    } catch (error) {
      Logger.warn('Failed to save publish report', error);
    }
  }

  /**
   * Dry run HTMLレポートを生成
   */
  generateDryRunHTMLReport(dryRunResult) {
    const statusColor = dryRunResult.validation.readyForPublication ? '#4CAF50' : '#F44336';
    const statusText = dryRunResult.validation.readyForPublication ? '公開準備完了' : '要修正';

    return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dry Run レポート - ${dryRunResult.article.title}</title>
    <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; margin: 40px; }
        .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .status { font-size: 1.5em; font-weight: bold; color: ${statusColor}; }
        .section { margin-bottom: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
        .pass { color: #4CAF50; }
        .fail { color: #F44336; }
        .warning { color: #FF9800; }
        .recommendation { margin: 10px 0; padding: 15px; border-left: 4px solid #2196F3; background: #f9f9f9; }
        .high-priority { border-left-color: #F44336; background: #ffebee; }
        .medium-priority { border-left-color: #FF9800; background: #fff3e0; }
        .low-priority { border-left-color: #4CAF50; background: #e8f5e8; }
        .stats { display: flex; gap: 20px; margin: 20px 0; }
        .stat { text-align: center; padding: 15px; background: #f5f5f5; border-radius: 8px; flex: 1; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Dry Run レポート</h1>
        <h2>${dryRunResult.article.title}</h2>
        <div class="status">${statusText}</div>
        <p>実行日時: ${new Date(dryRunResult.timestamp).toLocaleString('ja-JP')}</p>
    </div>

    <div class="stats">
        <div class="stat">
            <h3>合格チェック</h3>
            <div style="font-size: 2em; color: #4CAF50;">${dryRunResult.statistics.passedChecks}</div>
        </div>
        <div class="stat">
            <h3>失敗チェック</h3>
            <div style="font-size: 2em; color: #F44336;">${dryRunResult.statistics.failedChecks}</div>
        </div>
        <div class="stat">
            <h3>合格率</h3>
            <div style="font-size: 2em; color: #2196F3;">${dryRunResult.statistics.passRate}%</div>
        </div>
        <div class="stat">
            <h3>推定公開時間</h3>
            <div style="font-size: 2em; color: #9C27B0;">${dryRunResult.estimatedPublishTime}秒</div>
        </div>
    </div>

    <div class="section">
        <h3>検証結果</h3>
        <table>
            <tr><th>項目</th><th>現在値</th><th>推奨値</th><th>結果</th></tr>
            ${Object.entries(dryRunResult.validationDetails).map(([key, detail]) => `
                <tr>
                    <td>${key}</td>
                    <td>${detail.length || detail.count || detail.score}</td>
                    <td>${detail.recommended}</td>
                    <td class="${detail.status}">${detail.status === 'pass' ? '✓ 合格' : '✗ 要改善'}</td>
                </tr>
            `).join('')}
        </table>
    </div>

    ${dryRunResult.recommendations.length > 0 ? `
    <div class="section">
        <h3>推奨事項</h3>
        ${dryRunResult.recommendations.map(rec => `
            <div class="recommendation ${rec.priority}-priority">
                <strong>${rec.priority === 'high' ? '🔴 重要' : rec.priority === 'medium' ? '🟡 警告' : '🟢 提案'} ${rec.type}</strong>
                <p>${rec.message}</p>
                <small>現在値: ${rec.currentValue} | 推奨値: ${rec.recommendedValue}</small>
            </div>
        `).join('')}
    </div>
    ` : ''}
</body>
</html>`;
  }

  /**
   * 公開 HTMLレポートを生成
   */
  generatePublishHTMLReport(publishResult) {
    const statusColor = publishResult.success ? '#4CAF50' : '#F44336';
    const statusText = publishResult.success ? '公開成功' : '公開失敗';

    return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>公開レポート</title>
    <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; margin: 40px; }
        .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .status { font-size: 1.5em; font-weight: bold; color: ${statusColor}; }
        .section { margin-bottom: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
        .screenshot { margin: 10px 0; }
        .screenshot img { max-width: 300px; border: 1px solid #ddd; }
        .url-link { word-break: break-all; }
    </style>
</head>
<body>
    <div class="header">
        <h1>公開レポート</h1>
        <div class="status">${statusText}</div>
        <p>実行日時: ${new Date(publishResult.timestamp).toLocaleString('ja-JP')}</p>
    </div>

    <div class="section">
        <h3>公開結果</h3>
        <p><strong>ステータス:</strong> ${publishResult.status}</p>
        <p><strong>メッセージ:</strong> ${publishResult.message}</p>
        ${publishResult.noteUrl ? `<p><strong>記事URL:</strong> <a href="${publishResult.noteUrl}" target="_blank" class="url-link">${publishResult.noteUrl}</a></p>` : ''}
    </div>

    ${publishResult.preview ? `
    <div class="section">
        <h3>記事プレビュー</h3>
        <p><strong>タイトル:</strong> ${publishResult.preview.content.title || 'N/A'}</p>
        <p><strong>文字数:</strong> ${publishResult.preview.content.wordCount || 'N/A'}</p>
        <p><strong>抜粋:</strong> ${publishResult.preview.content.excerpt || 'N/A'}</p>
    </div>
    ` : ''}

    ${publishResult.screenshots && publishResult.screenshots.length > 0 ? `
    <div class="section">
        <h3>スクリーンショット (${publishResult.screenshots.length}枚)</h3>
        ${publishResult.screenshots.map(screenshot => `
            <div class="screenshot">
                <h4>${screenshot.step}</h4>
                <p><small>${new Date(screenshot.timestamp).toLocaleString('ja-JP')}</small></p>
            </div>
        `).join('')}
    </div>
    ` : ''}
</body>
</html>`;
  }

  /**
   * クリーンアップ
   */
  async cleanup() {
    Logger.info('Cleaning up browser resources...');
    
    try {
      if (this.page) {
        await this.page.close();
      }
      if (this.context) {
        await this.context.close();
      }
      if (this.browser) {
        await this.browser.close();
      }
    } catch (error) {
      Logger.warn('Cleanup failed', error);
    }
  }
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  const job = new PublishingJob();
  await job.execute();
}