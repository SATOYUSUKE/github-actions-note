# トラブルシューティングガイド

## 一般的な問題と解決方法

### 🔧 セットアップ関連の問題

#### 問題: Playwrightのインストールエラー

**症状:**
```
Error: browserType.launch: Executable doesn't exist
```

**解決方法:**
```bash
# Chromiumブラウザを再インストール
npx playwright install chromium

# システム依存関係のインストール (Linux)
npx playwright install-deps chromium

# macOSの場合、Xcodeコマンドラインツールを確認
xcode-select --install
```

#### 問題: Node.jsバージョンエラー

**症状:**
```
Error: Unsupported Node.js version
```

**解決方法:**
```bash
# Node.jsバージョンを確認
node --version

# Node.js 20以上が必要
# nvmを使用してアップデート
nvm install 20
nvm use 20

# または公式サイトからダウンロード
# https://nodejs.org/
```

### 🔐 認証関連の問題

#### 問題: note.comログインが失敗する

**症状:**
- ブラウザが起動しない
- ログイン画面が表示されない
- 認証状態が保存されない

**解決方法1: ブラウザパスの設定**
```bash
# macOS
export CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# Linux
export CHROME_PATH="/usr/bin/google-chrome"

# Windows (Git Bash)
export CHROME_PATH="/c/Program Files/Google/Chrome/Application/chrome.exe"
```

**解決方法2: 手動でのブラウザ起動**
```bash
# Chromeを手動起動してテスト
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug
```

**解決方法3: 認証スクリプトの再実行**
```bash
# 既存の認証ファイルを削除
rm -f note-state.json

# 認証スクリプトを再実行
node note-automation-setup/login-note-chrome.mjs
```

#### 問題: "安全でないブラウザ" エラー

**症状:**
```
note.comで「安全でないブラウザからのアクセス」エラー
```

**解決方法:**
```javascript
// note-automation-setup/login-note-chrome.mjs を編集
const browser = await chromium.launch({
  headless: false,
  args: [
    '--disable-blink-features=AutomationControlled',
    '--disable-web-security',
    '--disable-features=VizDisplayCompositor',
    '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  ]
});
```

#### 問題: GitHub Secretsが認識されない

**症状:**
```
Error: ANTHROPIC_API_KEY is not defined
```

**解決方法:**
1. **Secret名の確認**
   - 大文字小文字を正確に入力
   - スペースや特殊文字がないか確認

2. **Secretの再設定**
   - GitHub → Settings → Secrets and variables → Actions
   - 既存のSecretを削除して再作成

3. **権限の確認**
   - リポジトリの管理者権限があるか確認
   - Organization設定でSecretsが制限されていないか確認

### 🤖 API関連の問題

#### 問題: Anthropic API エラー

**症状:**
```
Error: 401 Unauthorized - Invalid API key
```

**解決方法:**
1. **APIキーの確認**
```bash
# APIキーの形式確認 (sk-ant-で始まる)
echo $ANTHROPIC_API_KEY | head -c 10
```

2. **クォータの確認**
   - [Anthropic Console](https://console.anthropic.com/usage)で使用量確認
   - 支払い方法が設定されているか確認

3. **レート制限の対処**
```javascript
// jobs/writing-job.js でリトライ機能を追加
const maxRetries = 3;
let retryCount = 0;

while (retryCount < maxRetries) {
  try {
    const response = await anthropic.messages.create(params);
    break;
  } catch (error) {
    if (error.status === 429) {
      await new Promise(resolve => setTimeout(resolve, 60000)); // 1分待機
      retryCount++;
    } else {
      throw error;
    }
  }
}
```

#### 問題: Tavily API エラー

**症状:**
```
Error: 403 Forbidden - API quota exceeded
```

**解決方法:**
1. **クォータの確認**
   - [Tavily Dashboard](https://tavily.com/dashboard)で使用量確認
   - 無料プラン: 月1,000リクエスト

2. **検索クエリの最適化**
```javascript
// jobs/fact-check-job.js でクエリ数を削減
const maxQueries = 5; // デフォルトの10から削減
const searchQueries = claims.slice(0, maxQueries);
```

### 🌐 ワークフロー実行の問題

#### 問題: GitHub Actions実行エラー

**症状:**
```
Error: Job failed with exit code 1
```

**解決方法:**
1. **ログの詳細確認**
   - Actions → 失敗したワークフロー → 各Job詳細
   - エラーメッセージの特定

2. **依存関係の問題**
```yaml
# .github/workflows/note-automation.yml
- name: Install dependencies
  run: |
    npm ci
    npx playwright install chromium
```

3. **タイムアウトの調整**
```yaml
jobs:
  research:
    timeout-minutes: 30  # デフォルトの10分から延長
```

#### 問題: Artifactの受け渡しエラー

**症状:**
```
Error: Artifact not found
```

**解決方法:**
```javascript
// utils/file-manager.js でエラーハンドリング強化
async function saveArtifact(name, data) {
  try {
    const filePath = `artifacts/${name}.json`;
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    console.log(`Artifact saved: ${filePath}`);
  } catch (error) {
    console.error(`Failed to save artifact: ${error.message}`);
    throw error;
  }
}
```

### 📝 記事生成の問題

#### 問題: 記事の品質が低い

**症状:**
- 内容が薄い
- 構成が不適切
- 事実確認で多数のエラー

**解決方法:**
1. **プロンプトの改善**
```javascript
// jobs/writing-job.js のプロンプト調整
const systemPrompt = `
あなたは専門性の高いライターです。以下の要件を満たす記事を作成してください：

1. 構成: 導入 → 本論(3-4セクション) → 結論
2. 文字数: 2500-3500文字
3. 根拠: 具体的なデータや事例を含む
4. 読みやすさ: 見出し、箇条書きを適切に使用
5. 専門性: 技術的な正確性を重視
`;
```

2. **リサーチの質向上**
```javascript
// jobs/research-job.js で検索クエリを増やす
const searchQueries = [
  `${theme} 最新動向 2024`,
  `${theme} 専門家 意見`,
  `${theme} 統計 データ`,
  `${theme} 事例 成功例`,
  `${theme} 課題 解決策`
];
```

#### 問題: ファクトチェックで多数のエラー

**症状:**
```
Fact check failed: 15 claims disputed
```

**解決方法:**
1. **検証基準の調整**
```javascript
// utils/fact-check-analyzer.js
const verificationThreshold = 0.7; // 0.8から0.7に下げる
const maxClaimsToCheck = 10; // 全てではなく重要な主張のみ
```

2. **信頼できるソースの優先**
```javascript
const trustedDomains = [
  'wikipedia.org',
  'gov',
  'edu',
  'reuters.com',
  'bbc.com'
];
```

### 📱 モバイル使用時の問題

#### 問題: モバイルでワークフロー実行が困難

**症状:**
- 入力フィールドが小さい
- パラメータ入力が面倒

**解決方法:**
1. **デフォルト値の設定**
```yaml
# .github/workflows/note-automation.yml
inputs:
  theme:
    description: '記事のテーマ'
    required: true
    default: 'AI技術の最新動向'
  target:
    description: '想定読者'
    required: true
    default: 'エンジニア・技術者'
```

2. **ブックマーク作成**
```
# ワークフロー実行URLをブックマーク
https://github.com/your-username/note-automation-system/actions/workflows/note-automation.yml
```

### 🔍 デバッグとログ確認

#### ログレベルの調整

```javascript
// 全てのJobファイルでログレベルを設定
const DEBUG = process.env.DEBUG === 'true';

function debugLog(message, data = null) {
  if (DEBUG) {
    console.log(`[DEBUG] ${message}`);
    if (data) console.log(JSON.stringify(data, null, 2));
  }
}
```

#### 詳細ログの有効化

```yaml
# .github/workflows/note-automation.yml
env:
  DEBUG: true
  ANTHROPIC_LOG_LEVEL: debug
  PLAYWRIGHT_DEBUG: 1
```

## 緊急時の対処法

### 🚨 ワークフローが停止しない場合

1. **手動キャンセル**
   - Actions → 実行中のワークフロー → Cancel workflow

2. **リソース制限の確認**
   - GitHub Actions使用量の確認
   - 月間制限に達していないか確認

### 🚨 APIキーが漏洩した場合

1. **即座にキーを無効化**
   - Anthropic Console → API Keys → Revoke
   - Tavily Dashboard → API Keys → Delete

2. **新しいキーを生成**
   - 新しいAPIキーを作成
   - GitHub Secretsを更新

3. **セキュリティ監査**
   - リポジトリのアクセス履歴確認
   - 不審なAPI使用量がないか確認

## サポートとコミュニティ

### 問題が解決しない場合

1. **GitHub Issues**
   - リポジトリのIssuesで報告
   - エラーログとシステム情報を含める

2. **ログ情報の収集**
```bash
# システム情報の収集
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo "OS: $(uname -a)"
echo "Chrome: $(google-chrome --version)"
```

3. **最小再現例の作成**
   - 問題を再現する最小限の設定
   - 具体的な手順とエラーメッセージ

### 定期メンテナンス

1. **月次チェック**
   - API使用量とコスト確認
   - 認証状態の確認
   - ワークフロー実行履歴の確認

2. **四半期チェック**
   - 依存関係のアップデート
   - セキュリティパッチの適用
   - パフォーマンス最適化の検討

このガイドで解決しない問題がある場合は、具体的なエラーメッセージとシステム環境を含めてIssueを作成してください。