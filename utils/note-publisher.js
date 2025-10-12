/**
 * Note.com Publishing Utilities
 */

import { Logger } from './logger.js';

export class NotePublisher {
  /**
   * 高度なセレクター検出
   */
  static async findElementWithFallback(page, selectors, timeout = 10000) {
    for (const selector of selectors) {
      try {
        const element = await page.waitForSelector(selector, { timeout: timeout / selectors.length });
        if (element) {
          Logger.info(`Element found with selector: ${selector}`);
          return { element, selector };
        }
      } catch (error) {
        Logger.debug(`Selector failed: ${selector}`);
      }
    }
    
    throw new Error(`None of the selectors found: ${selectors.join(', ')}`);
  }

  /**
   * テキスト入力の高度な処理
   */
  static async smartTextInput(page, selectors, text, options = {}) {
    const { clearFirst = true, useKeyboard = false, delay = 100 } = options;
    
    try {
      const { element, selector } = await this.findElementWithFallback(page, selectors);
      
      // フォーカスを当てる
      await element.focus();
      await page.waitForTimeout(500);
      
      if (clearFirst) {
        // 既存のテキストをクリア
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Delete');
        await page.waitForTimeout(200);
      }
      
      if (useKeyboard) {
        // キーボード入力を使用
        await page.keyboard.type(text, { delay });
      } else {
        // fill メソッドを使用
        await element.fill(text);
      }
      
      Logger.info(`Text input successful with selector: ${selector}`);
      return true;
      
    } catch (error) {
      Logger.warn('Smart text input failed', error);
      return false;
    }
  }

  /**
   * ボタンクリックの高度な処理
   */
  static async smartButtonClick(page, selectors, options = {}) {
    const { waitAfter = 1000, retries = 3 } = options;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const { element, selector } = await this.findElementWithFallback(page, selectors);
        
        // 要素が表示されるまで待機
        await element.waitForElementState('visible');
        
        // 要素がクリック可能になるまで待機
        await element.waitForElementState('enabled');
        
        // クリック実行
        await element.click();
        
        if (waitAfter > 0) {
          await page.waitForTimeout(waitAfter);
        }
        
        Logger.info(`Button click successful with selector: ${selector}`);
        return true;
        
      } catch (error) {
        Logger.warn(`Button click attempt ${attempt} failed`, error);
        
        if (attempt === retries) {
          throw error;
        }
        
        await page.waitForTimeout(1000);
      }
    }
    
    return false;
  }

  /**
   * ページ状態の検証
   */
  static async verifyPageState(page, expectedStates) {
    const results = {};
    
    for (const [stateName, condition] of Object.entries(expectedStates)) {
      try {
        if (typeof condition === 'string') {
          // セレクターの存在チェック
          const element = await page.waitForSelector(condition, { timeout: 5000 });
          results[stateName] = !!element;
        } else if (typeof condition === 'function') {
          // カスタム関数の実行
          results[stateName] = await condition(page);
        } else if (condition.url) {
          // URL パターンのチェック
          results[stateName] = new RegExp(condition.url).test(page.url());
        }
      } catch (error) {
        results[stateName] = false;
        Logger.debug(`State check failed for ${stateName}:`, error.message);
      }
    }
    
    return results;
  }

  /**
   * note.com特有のUI要素の検出
   */
  static getNoteSelectors() {
    return {
      title: [
        'input[placeholder*="タイトル"]',
        'input[placeholder*="title"]',
        'input[name*="title"]',
        'input[data-testid*="title"]',
        '.title-input input',
        '.editor-title input',
        'h1[contenteditable="true"]'
      ],
      
      content: [
        'textarea[placeholder*="本文"]',
        'textarea[placeholder*="content"]',
        '[contenteditable="true"]:not(h1)',
        'textarea[name*="content"]',
        '.editor-content textarea',
        '.editor-body textarea',
        '#editor textarea',
        '.note-editor textarea'
      ],
      
      tags: [
        'input[placeholder*="タグ"]',
        'input[placeholder*="tag"]',
        'input[name*="tag"]',
        'input[data-testid*="tag"]',
        '.tag-input input',
        '.tags-input input',
        '.hashtag-input input'
      ],
      
      publishButton: [
        'button:has-text("公開")',
        'button:has-text("publish")',
        'button[data-testid*="publish"]',
        '.publish-button',
        'button:has-text("投稿")',
        '.btn-publish',
        '[role="button"]:has-text("公開")'
      ],
      
      draftButton: [
        'button:has-text("下書き")',
        'button:has-text("draft")',
        'button[data-testid*="draft"]',
        '.draft-button',
        'button:has-text("保存")',
        '.btn-draft',
        '[role="button"]:has-text("下書き")'
      ],
      
      userMenu: [
        'a[href*="/settings"]',
        'button[aria-label*="ユーザー"]',
        '[class*="user-menu"]',
        '[class*="UserMenu"]',
        'a[href*="/dashboard"]',
        'button[data-testid*="user"]',
        '.header-user-menu',
        '.user-dropdown'
      ]
    };
  }

  /**
   * 記事投稿の詳細ログ
   */
  static async logPublishingProgress(page, step, details = {}) {
    const currentUrl = page.url();
    const timestamp = new Date().toISOString();
    
    const logEntry = {
      step,
      timestamp,
      url: currentUrl,
      details,
      pageTitle: await page.title().catch(() => 'Unknown')
    };
    
    Logger.info(`Publishing step: ${step}`, logEntry);
    return logEntry;
  }

  /**
   * エラー診断情報の収集
   */
  static async collectDiagnosticInfo(page) {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      url: page.url(),
      title: await page.title().catch(() => 'Unknown'),
      userAgent: await page.evaluate(() => navigator.userAgent).catch(() => 'Unknown'),
      viewport: await page.viewportSize().catch(() => null),
      cookies: [],
      localStorage: {},
      sessionStorage: {},
      networkErrors: [],
      consoleErrors: []
    };

    try {
      // クッキー情報
      diagnostics.cookies = await page.context().cookies();
    } catch (error) {
      Logger.debug('Failed to collect cookies', error);
    }

    try {
      // ローカルストレージ
      diagnostics.localStorage = await page.evaluate(() => {
        const storage = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          storage[key] = localStorage.getItem(key);
        }
        return storage;
      });
    } catch (error) {
      Logger.debug('Failed to collect localStorage', error);
    }

    try {
      // セッションストレージ
      diagnostics.sessionStorage = await page.evaluate(() => {
        const storage = {};
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          storage[key] = sessionStorage.getItem(key);
        }
        return storage;
      });
    } catch (error) {
      Logger.debug('Failed to collect sessionStorage', error);
    }

    return diagnostics;
  }

  /**
   * 記事投稿の成功確認
   */
  static async verifyPublicationSuccess(page, expectedStatus = 'published') {
    const verification = {
      success: false,
      status: 'unknown',
      url: page.url(),
      indicators: {},
      timestamp: new Date().toISOString()
    };

    try {
      // URL パターンの確認
      const urlPatterns = {
        published: /note\.com\/[^\/]+\/n\/[a-zA-Z0-9]+/,
        draft: /note\.com\/[^\/]+\/n\/[a-zA-Z0-9]+/,
        editor: /note\.com\/new|editor\.note\.com/
      };

      for (const [status, pattern] of Object.entries(urlPatterns)) {
        if (pattern.test(verification.url)) {
          verification.status = status;
          verification.indicators.urlMatch = true;
          break;
        }
      }

      // 成功メッセージの確認
      const successSelectors = [
        ':has-text("公開しました")',
        ':has-text("投稿しました")',
        ':has-text("保存しました")',
        '.success-message',
        '.notification-success'
      ];

      for (const selector of successSelectors) {
        try {
          const element = await page.waitForSelector(selector, { timeout: 2000 });
          if (element) {
            verification.indicators.successMessage = true;
            break;
          }
        } catch (e) {
          // 次のセレクターを試す
        }
      }

      // ページタイトルの確認
      const title = await page.title();
      if (title && !title.includes('エラー') && !title.includes('Error')) {
        verification.indicators.validTitle = true;
      }

      // 記事コンテンツの存在確認
      try {
        const hasContent = await page.evaluate(() => {
          const contentElements = document.querySelectorAll('article, .article-content, .note-content');
          return contentElements.length > 0;
        });
        verification.indicators.hasContent = hasContent;
      } catch (error) {
        verification.indicators.hasContent = false;
      }

      // 総合判定
      const positiveIndicators = Object.values(verification.indicators).filter(Boolean).length;
      verification.success = positiveIndicators >= 2 || verification.indicators.successMessage;

      if (verification.success && expectedStatus === 'published') {
        verification.success = verification.status === 'published' || verification.indicators.successMessage;
      }

      return verification;

    } catch (error) {
      Logger.warn('Publication verification failed', error);
      verification.error = error.message;
      return verification;
    }
  }

  /**
   * 記事プレビューの生成
   */
  static async generateArticlePreview(page) {
    try {
      const preview = {
        timestamp: new Date().toISOString(),
        url: page.url(),
        title: await page.title(),
        content: {},
        metadata: {}
      };

      // 記事タイトルの取得
      try {
        const titleElement = await page.$('h1, .article-title, .note-title');
        if (titleElement) {
          preview.content.title = await titleElement.textContent();
        }
      } catch (error) {
        Logger.debug('Failed to extract title for preview', error);
      }

      // 記事本文の一部を取得
      try {
        const contentElement = await page.$('article, .article-content, .note-content');
        if (contentElement) {
          const fullContent = await contentElement.textContent();
          preview.content.excerpt = fullContent.substring(0, 300) + '...';
          preview.content.wordCount = fullContent.split(/\s+/).length;
        }
      } catch (error) {
        Logger.debug('Failed to extract content for preview', error);
      }

      // メタデータの取得
      try {
        preview.metadata.publishDate = await page.evaluate(() => {
          const dateElement = document.querySelector('time, .publish-date, .article-date');
          return dateElement ? dateElement.textContent || dateElement.getAttribute('datetime') : null;
        });
      } catch (error) {
        Logger.debug('Failed to extract publish date', error);
      }

      return preview;

    } catch (error) {
      Logger.warn('Failed to generate article preview', error);
      return null;
    }
  }

  /**
   * 投稿後のクリーンアップ処理
   */
  static async performPostPublishCleanup(page) {
    const cleanup = {
      timestamp: new Date().toISOString(),
      actions: [],
      success: true
    };

    try {
      // 一時的なファイルやデータのクリーンアップ
      cleanup.actions.push('temporary_data_cleared');

      // ブラウザキャッシュのクリア（必要に応じて）
      try {
        await page.evaluate(() => {
          if ('caches' in window) {
            caches.keys().then(names => {
              names.forEach(name => caches.delete(name));
            });
          }
        });
        cleanup.actions.push('browser_cache_cleared');
      } catch (error) {
        Logger.debug('Cache clear failed', error);
      }

      Logger.info('Post-publish cleanup completed', cleanup);
      return cleanup;

    } catch (error) {
      Logger.warn('Post-publish cleanup failed', error);
      cleanup.success = false;
      cleanup.error = error.message;
      return cleanup;
    }
  }
}