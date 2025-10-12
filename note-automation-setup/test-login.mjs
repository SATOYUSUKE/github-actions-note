import { chromium } from 'playwright';
import fs from 'fs';

const STATE_PATH = './note-state.json';

(async () => {
  // 保存されたログイン状態をテスト
  const browser = await chromium.launch({ 
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security'
    ]
  });
  
  // 保存されたストレージ状態を読み込み
  const context = await browser.newContext({
    storageState: STATE_PATH,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();

  console.log('保存されたログイン状態でnote.comにアクセス中...');
  await page.goto('https://note.com/', { waitUntil: 'networkidle' });
  
  // ログイン状態を確認
  try {
    // 複数のセレクターでログイン状態を確認
    const loginSelectors = [
      '[data-testid="header-user-menu"]',
      '.o-headerUserMenu',
      '.p-headerUserMenu',
      'button[aria-label*="ユーザー"]',
      'a[href*="/settings"]',
      '.header-user-menu',
      '[class*="user-menu"]',
      '[class*="UserMenu"]'
    ];
    
    let loginDetected = false;
    for (const selector of loginSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        console.log(`✅ ログイン状態が正常に復元されました！ (セレクター: ${selector})`);
        loginDetected = true;
        break;
      } catch (e) {
        // 次のセレクターを試す
      }
    }
    
    if (!loginDetected) {
      // URLでログイン状態を確認
      const currentUrl = page.url();
      console.log('現在のURL:', currentUrl);
      
      // ページのスクリーンショットを撮って状態を確認
      await page.screenshot({ path: 'login-test.png' });
      console.log('スクリーンショットを保存しました: login-test.png');
      
      throw new Error('ログイン状態を確認できませんでした');
    }
    
    // 記事作成ページにアクセスしてテスト
    console.log('記事作成ページにアクセス中...');
    await page.goto('https://note.com/new', { waitUntil: 'networkidle' });
    
    // タイトル入力フィールドが表示されるか確認
    await page.waitForSelector('input[placeholder*="タイトル"]', { timeout: 10000 });
    console.log('✅ 記事作成ページにアクセス成功！');
    
    console.log('テスト完了。ブラウザを5秒後に閉じます...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
  } catch (error) {
    console.log('❌ ログイン状態の復元に失敗しました:', error.message);
    console.log('ログイン状態を再取得する必要があります。');
  }

  await browser.close();
})().catch(console.error);