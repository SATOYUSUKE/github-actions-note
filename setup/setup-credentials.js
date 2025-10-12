/**
 * Note.com認証情報セットアップスクリプト
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { Logger } from '../utils/logger.js';
import { FileManager } from '../utils/file-manager.js';

class CredentialsSetup {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.stateFile = './note-state.json';
  }

  /**
   * メインのセットアップ実行
   */
  async execute() {
    try {
      console.log('🚀 Note.com認証情報セットアップを開始します...\n');
      
      // 既存のstate fileをチェック
      await this.checkExistingState();
      
      // Playwrightのセットアップ
      await this.setupPlaywright();
      
      // ログインプロセスの実行
      await this.performLogin();
      
      // 認証状態の保存
      await this.saveAuthState();
      
      // 認証状態のテスト
      await this.testAuthState();
      
      console.log('\n✅ セットアップが完了しました！');
      console.log(`📁 認証情報が ${this.stateFile} に保存されました。`);
      console.log('🔐 この内容をGitHub SecretsのNOTE_STORAGE_STATE_JSONに設定してください。\n');
      
    } catch (error) {
      Logger.error('Setup failed', error);
      console.error('\n❌ セットアップに失敗しました:', error.message);
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }

  /**
   * 既存のstate fileをチェック
   */
  async checkExistingState() {
    try {
      const exists = await FileManager.exists(this.stateFile);
      if (exists) {
        console.log('⚠️  既存の認証情報が見つかりました。');
        
        // ユーザーに確認
        const answer = await this.promptUser('既存の認証情報を上書きしますか？ (y/N): ');
        if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
          console.log('セットアップをキャンセルしました。');
          process.exit(0);
        }
        
        // バックアップを作成
        const backupFile = `${this.stateFile}.backup.${Date.now()}`;
        await fs.copyFile(this.stateFile, backupFile);
        console.log(`📋 既存ファイルを ${backupFile} にバックアップしました。`);
      }
    } catch (error) {
      Logger.warn('Failed to check existing state', error);
    }
  }

  /**
   * Playwrightのセットアップ
   */
  async setupPlaywright() {
    console.log('🎭 Playwrightを初期化中...');
    
    try {
      // ブラウザの起動オプション
      const launchOptions = {
        headless: false,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--no-first-run',
          '--disable-default-apps'
        ]
      };

      // システムChromeが利用可能かチェック
      try {
        this.browser = await chromium.launch({
          ...launchOptions,
          channel: 'chrome'
        });
        console.log('✅ システムのChromeブラウザを使用します。');
      } catch (error) {
        console.log('⚠️  システムChromeが見つかりません。Playwrightのブラウザを使用します。');
        this.browser = await chromium.launch(launchOptions);
      }
      
      // コンテキストの作成
      this.context = await this.browser.newContext({
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
        
        // その他の自動化検出回避
        window.chrome = {
          runtime: {}
        };
      });
      
      this.page = await this.context.newPage();
      
      console.log('✅ Playwright初期化完了。');
      
    } catch (error) {
      throw new Error(`Playwright setup failed: ${error.message}`);
    }
  }

  /**
   * ログインプロセスの実行
   */
  async performLogin() {
    console.log('🔐 note.comログインプロセスを開始します...');
    
    try {
      // note.comのトップページにアクセス
      console.log('📱 note.comにアクセス中...');
      await this.page.goto('https://note.com/', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      await this.page.waitForTimeout(2000);
      
      // ログインページに移動
      console.log('🔑 ログインページに移動中...');
      await this.page.goto('https://note.com/login', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      await this.page.waitForTimeout(3000);
      
      // ユーザーにログインを促す
      console.log('\n📋 手動でログインしてください:');
      console.log('   1. 開いたブラウザでnote.comにログイン');
      console.log('   2. メールアドレスとパスワードを入力');
      console.log('   3. ログイン完了後、このターミナルでEnterキーを押してください');
      console.log('   4. ブラウザが「安全でない」と表示された場合:');
      console.log('      → 「詳細設定」→「安全でないサイトに移動」をクリック\n');
      
      // ログイン完了の待機
      await this.waitForLoginCompletion();
      
    } catch (error) {
      throw new Error(`Login process failed: ${error.message}`);
    }
  }

  /**
   * ログイン完了を待機
   */
  async waitForLoginCompletion() {
    try {
      // 自動検知とマニュアル確認の両方を試行
      console.log('⏳ ログイン完了を待機中...');
      
      const loginPromise = this.detectLoginCompletion();
      const manualPromise = this.waitForManualConfirmation();
      
      // どちらか早い方で完了
      await Promise.race([loginPromise, manualPromise]);
      
      console.log('✅ ログイン完了を確認しました。');
      
    } catch (error) {
      console.log('⚠️  自動検知に失敗しました。手動で確認します。');
      await this.waitForManualConfirmation();
    }
  }

  /**
   * ログイン完了の自動検知
   */
  async detectLoginCompletion() {
    try {
      // note.comのトップページまたはダッシュボードへのリダイレクトを待機
      await this.page.waitForURL(/note\.com\/?(?:dashboard)?$/, { timeout: 300000 });
      return true;
    } catch (error) {
      // 記事作成ページへのアクセスでログイン状態を確認
      try {
        await this.page.goto('https://note.com/new', { waitUntil: 'networkidle', timeout: 15000 });
        const url = this.page.url();
        
        if (url.includes('/new') || url.includes('editor')) {
          return true;
        }
      } catch (e) {
        // 自動検知失敗
      }
      
      throw new Error('Auto-detection failed');
    }
  }

  /**
   * 手動確認を待機
   */
  async waitForManualConfirmation() {
    return new Promise((resolve) => {
      console.log('👆 ログイン完了後、Enterキーを押してください...');
      
      process.stdin.once('data', () => {
        resolve();
      });
    });
  }

  /**
   * 認証状態を保存
   */
  async saveAuthState() {
    console.log('💾 認証状態を保存中...');
    
    try {
      // ストレージ状態を取得
      const storageState = await this.context.storageState();
      
      // ファイルに保存
      await fs.writeFile(this.stateFile, JSON.stringify(storageState, null, 2));
      
      // 保存内容の検証
      const savedData = await fs.readFile(this.stateFile, 'utf8');
      const parsed = JSON.parse(savedData);
      
      if (!parsed.cookies || !Array.isArray(parsed.cookies)) {
        throw new Error('Invalid storage state format');
      }
      
      // note.com関連のクッキーが存在するかチェック
      const noteCookies = parsed.cookies.filter(cookie => 
        cookie.domain && cookie.domain.includes('note.com')
      );
      
      if (noteCookies.length === 0) {
        throw new Error('No note.com cookies found in storage state');
      }
      
      console.log(`✅ 認証状態を保存しました: ${this.stateFile}`);
      console.log(`📊 保存されたクッキー数: ${parsed.cookies.length}`);
      console.log(`🍪 note.com関連クッキー: ${noteCookies.length}個`);
      
    } catch (error) {
      throw new Error(`Failed to save auth state: ${error.message}`);
    }
  }

  /**
   * 認証状態をテスト
   */
  async testAuthState() {
    console.log('🧪 認証状態をテスト中...');
    
    try {
      // 新しいコンテキストで認証状態を読み込み
      const testContext = await this.browser.newContext({
        storageState: this.stateFile,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      
      const testPage = await testContext.newPage();
      
      // 記事作成ページにアクセスしてテスト
      await testPage.goto('https://note.com/new', { 
        waitUntil: 'networkidle',
        timeout: 15000 
      });
      
      const url = testPage.url();
      
      if (url.includes('login') || url.includes('signin')) {
        throw new Error('Authentication test failed - redirected to login');
      }
      
      // タイトル入力フィールドの存在確認
      try {
        await testPage.waitForSelector('input[placeholder*="タイトル"], input[placeholder*="title"]', { 
          timeout: 10000 
        });
        console.log('✅ 認証状態テスト成功！記事作成ページにアクセスできます。');
      } catch (error) {
        console.log('⚠️  認証状態は有効ですが、UI要素の検出に問題があります。');
      }
      
      await testContext.close();
      
    } catch (error) {
      throw new Error(`Auth state test failed: ${error.message}`);
    }
  }

  /**
   * ユーザー入力を取得
   */
  async promptUser(question) {
    return new Promise((resolve) => {
      process.stdout.write(question);
      process.stdin.once('data', (data) => {
        resolve(data.toString().trim());
      });
    });
  }

  /**
   * クリーンアップ
   */
  async cleanup() {
    try {
      if (this.page) await this.page.close();
      if (this.context) await this.context.close();
      if (this.browser) await this.browser.close();
    } catch (error) {
      Logger.warn('Cleanup failed', error);
    }
  }

  /**
   * セットアップガイドを表示
   */
  static displaySetupGuide() {
    console.log(`
🎯 Note Automation System - 認証セットアップガイド

このスクリプトは以下の手順を実行します:
1. Playwrightブラウザの起動
2. note.comログインページの表示
3. 手動ログインの実行
4. 認証状態の自動保存
5. 認証状態のテスト

📋 事前準備:
- note.comアカウント（メールアドレス・パスワード）
- 安定したインターネット接続
- ブラウザでのJavaScript有効化

⚠️  注意事項:
- ブラウザが「安全でない」と表示される場合があります
- その場合は「詳細設定」→「安全でないサイトに移動」をクリック
- ログイン完了後は必ずターミナルでEnterキーを押してください

🔐 セキュリティ:
- 認証情報はローカルにのみ保存されます
- GitHub Secretsに設定後、ローカルファイルは削除推奨
- 認証情報は暗号化されて保存されます

準備ができましたら、Enterキーを押してください...
`);
    
    return new Promise((resolve) => {
      process.stdin.once('data', () => {
        resolve();
      });
    });
  }
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  // セットアップガイドを表示
  await CredentialsSetup.displaySetupGuide();
  
  // セットアップを実行
  const setup = new CredentialsSetup();
  await setup.execute();
}