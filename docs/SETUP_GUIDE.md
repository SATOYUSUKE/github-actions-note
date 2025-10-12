# Note Automation System セットアップガイド

## 概要

このガイドでは、Note Automation Systemの完全なセットアップ手順を説明します。システムは以下の4つのステップで構成されています：

1. **リサーチ** - Claude Code SDKによるWeb検索とコンテンツ収集
2. **記事執筆** - Claude Sonnet 4.5による高品質な記事生成
3. **ファクトチェック** - Tavily APIによる事実確認と修正
4. **自動投稿** - Playwrightによるnote.com自動投稿

## 前提条件

### 必要なアカウント

- **GitHubアカウント** - GitHub Actionsの実行に必要
- **note.comアカウント** - 記事投稿先
- **Anthropic APIアカウント** - Claude AI利用のため
- **Tavily APIアカウント** - ファクトチェック機能のため

### システム要件

- **Node.js 20以上** - ローカルセットアップ用
- **Google Chrome** - Playwright認証用
- **インターネット接続** - API通信とWeb検索用

## セットアップ手順

### Step 1: リポジトリのセットアップ

1. **リポジトリをフォークまたはクローン**
```bash
git clone https://github.com/your-username/note-automation-system.git
cd note-automation-system
```

2. **依存関係のインストール**
```bash
npm install
```

3. **Playwrightのセットアップ**
```bash
npx playwright install chromium
```

### Step 2: APIキーの取得

#### 2.1 Anthropic API キー

1. [Anthropic Console](https://console.anthropic.com/)にアクセス
2. アカウント作成またはログイン
3. 「API Keys」セクションで新しいキーを作成
4. キーをコピーして保存（`sk-ant-`で始まる文字列）

**料金について:**
- Claude Sonnet 4.5: 入力$3/1M tokens, 出力$15/1M tokens
- 1記事あたり約$0.10-0.30程度

#### 2.2 Tavily API キー

1. [Tavily API](https://tavily.com/)にアクセス
2. アカウント作成
3. ダッシュボードでAPIキーを取得
4. キーをコピーして保存（`tvly-`で始まる文字列）

**料金について:**
- 無料プラン: 月1,000リクエスト
- Pro プラン: $50/月で50,000リクエスト

### Step 3: note.com認証の設定

#### 3.1 ローカルでのログイン設定

1. **認証スクリプトの実行**
```bash
node note-automation-setup/login-note-chrome.mjs
```

2. **ブラウザでのログイン**
   - 自動的にChromeが起動します
   - note.comのログインページが表示されます
   - 通常通りログインしてください
   - ログイン完了後、ブラウザを閉じてください

3. **認証状態の確認**
```bash
node note-automation-setup/test-login.mjs
```

成功すると `note-state.json` ファイルが生成されます。

#### 3.2 認証トラブルシューティング

**問題: "安全でないブラウザ"エラー**
```bash
# 解決方法: システムのChromeを使用
export CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"  # macOS
export CHROME_PATH="/usr/bin/google-chrome"  # Linux
```

**問題: ログイン状態が保存されない**
- Cookieの設定を確認
- プライベートブラウジングモードでないことを確認
- note.comの2段階認証設定を確認

### Step 4: GitHub Secretsの設定

1. **GitHubリポジトリの設定画面へ**
   - リポジトリページ → Settings → Secrets and variables → Actions

2. **必要なSecretsを追加**

| Secret名 | 値 | 説明 |
|---------|-----|------|
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Claude API キー |
| `TAVILY_API_KEY` | `tvly-...` | Tavily API キー |
| `NOTE_STORAGE_STATE` | `note-state.json`の内容 | note.com認証情報 |

3. **NOTE_STORAGE_STATEの設定方法**
```bash
# note-state.jsonの内容をコピー
cat note-state.json
```
内容をそのままGitHub Secretsに貼り付けてください。

### Step 5: ワークフローのテスト

#### 5.1 ドライラン実行

1. **GitHub Actionsページへ**
   - リポジトリページ → Actions → "Note Automation Workflow"

2. **手動実行**
   - "Run workflow" をクリック
   - 以下のパラメータを入力：

```
テーマ: AIと自動化の未来
想定読者: エンジニア
核メッセージ: 生産性向上のためのAI活用
読後のアクション: 自動化ツールの導入検討
タグ: AI,自動化,生産性
公開設定: false (下書き)
テスト実行: true (実際には投稿しない)
```

3. **実行結果の確認**
   - 各Jobの実行ログを確認
   - 生成された記事内容をArtifactsからダウンロード

#### 5.2 本番実行

テストが成功したら、以下の設定で本番実行：
- **公開設定**: true (公開) または false (下書き)
- **テスト実行**: false (実際に投稿)

## 設定のカスタマイズ

### ワークフローパラメータの調整

`.github/workflows/note-automation.yml` を編集して以下をカスタマイズできます：

#### プロンプトテンプレートの変更

```javascript
// jobs/writing-job.js の systemPrompt を編集
const systemPrompt = `
あなたは経験豊富なライターです。
以下の条件で記事を作成してください：

1. 読みやすい構成
2. 具体例を含む
3. 実用的な内容
4. 適切な長さ（2000-3000文字）
`;
```

#### 記事の品質設定

```javascript
// utils/article-validator.js の基準を調整
const qualityThresholds = {
  minWordCount: 1500,
  maxWordCount: 4000,
  minSections: 3,
  maxSections: 8
};
```

### モバイル対応の最適化

GitHub Actionsはモバイルブラウザからもアクセスできます：

1. **ブックマーク作成**
   - ワークフロー実行ページをブックマーク
   - ホーム画面に追加（PWA風）

2. **入力の簡素化**
   - よく使うテンプレートを事前定義
   - デフォルト値の設定

## 運用とメンテナンス

### 定期実行の設定

```yaml
# .github/workflows/note-automation.yml
on:
  schedule:
    - cron: '0 9 * * 1'  # 毎週月曜日 9:00 AM (JST)
  workflow_dispatch:
    # 手動実行も可能
```

### APIクォータの監視

#### Anthropic API
- 使用量: [Anthropic Console](https://console.anthropic.com/usage)
- 制限: プランに応じて設定

#### Tavily API
- 使用量: [Tavily Dashboard](https://tavily.com/dashboard)
- 制限: 月間リクエスト数

### ログの確認

```bash
# GitHub Actions実行ログの確認
# リポジトリ → Actions → 実行履歴 → 各Job詳細
```

### バックアップとセキュリティ

1. **認証情報の定期更新**
   - note.com認証: 3ヶ月ごと
   - APIキー: 必要に応じて

2. **設定のバックアップ**
```bash
# 重要な設定ファイルをバックアップ
cp .github/workflows/note-automation.yml backup/
cp note-state.json backup/
```

## 次のステップ

セットアップが完了したら：

1. **記事テンプレートの作成** - よく使う形式を定義
2. **品質チェックリストの作成** - 投稿前の確認項目
3. **運用ルールの策定** - 投稿頻度や内容ガイドライン
4. **パフォーマンス監視** - API使用量とコスト管理

## サポート

問題が発生した場合は、[トラブルシューティングガイド](TROUBLESHOOTING.md)を参照してください。