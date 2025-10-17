# セットアップチェックリスト

## 📋 事前準備

### 必要なアカウント
- [ ] GitHubアカウント
- [ ] note.comアカウント
- [ ] Anthropic アカウント（Claude API用）
- [ ] Tavily アカウント（ファクトチェック用）

### 必要なツール
- [ ] Node.js 20+ （ローカル環境）
- [ ] Git
- [ ] ターミナル/コマンドプロンプト

## 🔑 APIキー取得

### 1. Anthropic API Key
- [ ] [Anthropic Console](https://console.anthropic.com/) にアクセス
- [ ] アカウント作成/ログイン
- [ ] API Keyを生成（APIキーの文字列）
- [ ] キーをメモ帳に保存

### 2. Tavily API Key
- [ ] [Tavily](https://tavily.com/) にアクセス
- [ ] 無料アカウント作成
- [ ] API Keyを生成（APIキーの文字列）
- [ ] キーをメモ帳に保存

## 🎭 note.com認証情報取得

### ローカル環境でのセットアップ
```bash
# 1. ディレクトリ作成
mkdir note-setup
cd note-setup

# 2. Playwrightインストール
npm init -y
npm install playwright
npx playwright install chromium

# 3. ログインスクリプト作成
# login-note.mjs を作成（下記コード参照）

# 4. スクリプト実行
node login-note.mjs
```

### login-note.mjs の内容
```javascript
import { chromium } from 'playwright';
import fs from 'fs';

const STATE_PATH = './note-state.json';

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    channel: 'chrome'
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();
  await page.goto('https://note.com/login');

  console.log('手動でログインしてください。');
  console.log('ログイン完了後、このターミナルでEnterキーを押してください。');
  
  await new Promise(resolve => {
    process.stdin.once('data', () => resolve());
  });

  await context.storageState({ path: STATE_PATH });
  console.log('保存完了:', STATE_PATH);
  await browser.close();
})();
```

### 認証情報取得手順
- [ ] ブラウザが自動で開く
- [ ] note.comにログイン（メール/パスワード）
- [ ] ログイン完了後、ターミナルでEnterキー
- [ ] `note-state.json` ファイルが生成される
- [ ] ファイル内容をコピー（後でGitHub Secretsに設定）

## 🔐 GitHub Secrets設定

### リポジトリ設定
- [ ] GitHubでリポジトリをフォーク
- [ ] `Settings > Secrets and variables > Actions` に移動
- [ ] `New repository secret` をクリック

### 設定する環境変数

#### 1. ANTHROPIC_API_KEY
- [ ] Name: `ANTHROPIC_API_KEY`
- [ ] Secret: 取得したAnthropicのAPIキー（`your_anthropic_api_key_here`）

#### 2. TAVILY_API_KEY
- [ ] Name: `TAVILY_API_KEY`
- [ ] Secret: 取得したTavilyのAPIキー（`your_tavily_api_key_here`）

#### 3. NOTE_STORAGE_STATE_JSON
- [ ] Name: `NOTE_STORAGE_STATE_JSON`
- [ ] Secret: `note-state.json`の内容全体をコピー&ペースト

## 🚀 動作確認

### テスト実行
- [ ] GitHubリポジトリの `Actions` タブに移動
- [ ] `Note Automation Workflow` を選択
- [ ] `Run workflow` をクリック
- [ ] テストパラメータを入力:
  - theme: "テスト記事"
  - target: "テストユーザー"
  - message: "テストメッセージ"
  - cta: "テストアクション"
  - tags: "テスト,自動化"
  - is_public: `false` (下書き保存)
  - dry_run: `true` (テスト実行)

### 確認項目
- [ ] ワークフローが正常に開始される
- [ ] 各Jobが順次実行される
- [ ] エラーが発生しない
- [ ] Artifactが正常に生成される

## 🔧 トラブルシューティング

### よくある問題と解決策

#### 1. 「安全でないブラウザ」エラー
- **症状**: note.comログイン時にブラウザが拒否される
- **解決策**: 
  - [ ] `login-note.mjs`で`channel: 'chrome'`を使用
  - [ ] User-Agentを実際のブラウザに設定
  - [ ] 「詳細設定」→「安全でないサイトに移動」をクリック

#### 2. API認証エラー
- **症状**: `Invalid API key` エラー
- **解決策**:
  - [ ] APIキーの形式を確認（適切なAPIキー形式で始まる）
  - [ ] GitHub Secretsの設定を再確認
  - [ ] APIキーの有効期限を確認

#### 3. note.com認証エラー
- **症状**: 記事作成ページにアクセスできない
- **解決策**:
  - [ ] `note-state.json`を再取得
  - [ ] ログイン状態の有効期限を確認
  - [ ] GitHub Secretsの`NOTE_STORAGE_STATE_JSON`を更新

#### 4. ワークフロー実行エラー
- **症状**: GitHub Actionsでジョブが失敗
- **解決策**:
  - [ ] Actions ログで詳細エラーを確認
  - [ ] 環境変数の設定を再確認
  - [ ] 依存関係のインストール状況を確認

## 📞 サポート

### 問題が解決しない場合
- [ ] GitHub Issuesで問題を報告
- [ ] エラーログを添付
- [ ] 実行環境の情報を記載
- [ ] 再現手順を詳細に記述

### 有用なリンク
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Playwright Documentation](https://playwright.dev/)
- [Anthropic API Documentation](https://docs.anthropic.com/)
- [Tavily API Documentation](https://tavily.com/docs)

## ✅ セットアップ完了確認

すべてのチェックボックスが完了したら、セットアップ完了です！

- [ ] 全てのAPIキーが取得済み
- [ ] note.com認証情報が取得済み
- [ ] GitHub Secretsが設定済み
- [ ] テスト実行が成功
- [ ] エラーが解決済み

**🎉 おめでとうございます！Note Automation Systemの準備が完了しました。**