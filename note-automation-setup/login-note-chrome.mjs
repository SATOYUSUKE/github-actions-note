import { chromium } from 'playwright';
import fs from 'fs';

const STATE_PATH = './note-state.json';

(async () => {
  // システムにインストールされているChromeを使用
  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome', // システムのChromeを使用
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--disable-default-apps'
    ]
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();

  console.log('note.comのログインページを開いています...');
  await page.goto('https://note.com/login');

  console.log('手動でログインしてください。');
  console.log('ログイン完了後、このターミナルでEnterキーを押してください。');
  
  // ユーザーの入力を待つ
  await new Promise(resolve => {
    process.stdin.once('data', () => {
      resolve();
    });
  });

  console.log('ログイン状態を保存中...');
  await context.storageState({ path: STATE_PATH });
  console.log('保存完了:', STATE_PATH);

  await browser.close();
  console.log('ブラウザを閉じました。');
})().catch(console.error);