# 技術ノート

## 🔍 note.com UI構造調査結果

### ヘッダー構造
```html
<div class="m-navbarContainer svelte-1vzg1vo">
  <div class="m-navbarLogoContainer svelte-1s7rfpy">
    <h1>
      <a href="/" target="_self" aria-label="note" class="m-navbarLogo svelte-wdp6vs m-navbarLogo--note">
        <!-- SVGロゴ -->
      </a>
    </h1>
  </div>
</div>
```

### 重要な発見
1. **フレームワーク**: Svelteを使用
2. **クラス名**: 動的ハッシュ付き（`svelte-1vzg1vo`など）
3. **記事作成URL**: `https://editor.note.com/notes/{id}/edit/`
4. **ログイン検証**: 記事作成ページへの直接アクセスで確認可能

## 🎭 Playwright自動化の課題と解決策

### 課題1: 「安全でないブラウザ」検出
**症状**: note.comが自動化ブラウザを検出して拒否

**解決策**:
```javascript
const browser = await chromium.launch({
  headless: false,
  channel: 'chrome', // システムのChromeを使用
  args: [
    '--disable-blink-features=AutomationControlled',
    '--disable-web-security'
  ]
});

const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  viewport: { width: 1280, height: 720 }
});

// 自動化検出を回避
await context.addInitScript(() => {
  Object.defineProperty(navigator, 'webdriver', {
    get: () => undefined,
  });
});
```

### 課題2: UI要素の動的変更
**症状**: セレクターが見つからない

**解決策**: 複数のセレクターでフォールバック
```javascript
const loginSelectors = [
  '[data-testid="header-user-menu"]',
  '.o-headerUserMenu',
  '.p-headerUserMenu',
  'button[aria-label*="ユーザー"]',
  'a[href*="/settings"]'
];

for (const selector of loginSelectors) {
  try {
    await page.waitForSelector(selector, { timeout: 2000 });
    loginDetected = true;
    break;
  } catch (e) {
    // 次のセレクターを試す
  }
}
```

## 🔐 認証情報管理

### Storage State構造
```json
{
  "cookies": [
    {
      "name": "_note_session_v5",
      "value": "session_token_here",
      "domain": ".note.com",
      "path": "/",
      "expires": 1767948235.94812,
      "httpOnly": true,
      "secure": true,
      "sameSite": "Lax"
    }
  ],
  "origins": [
    {
      "origin": "https://note.com",
      "localStorage": [...]
    }
  ]
}
```

### 重要なクッキー
- `_note_session_v5`: メインセッション
- `XSRF-TOKEN`: CSRF保護
- Google関連クッキー: OAuth認証用

## ⚙️ GitHub Actions設計パターン

### Job間データ転送
```yaml
# 出力側Job
- name: Upload Research Report
  uses: actions/upload-artifact@v4
  with:
    name: research-report
    path: outputs/research-report.json
    retention-days: 1

# 入力側Job
- name: Download Research Report
  uses: actions/download-artifact@v4
  with:
    name: research-report
    path: inputs/
```

### 環境変数の安全な管理
```yaml
env:
  ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  TAVILY_API_KEY: ${{ secrets.TAVILY_API_KEY }}
  NOTE_STORAGE_STATE_JSON: ${{ secrets.NOTE_STORAGE_STATE_JSON }}
```

### 条件付き実行
```yaml
- name: Upload Screenshots
  if: always()  # 失敗時も実行
  uses: actions/upload-artifact@v4
```

## 🛠 ユーティリティ設計

### Logger クラス
```javascript
export class Logger {
  static info(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] INFO: ${message}`);
    if (data) console.log(JSON.stringify(data, null, 2));
  }
  
  static jobStart(jobName, inputs = null) {
    this.info(`Starting ${jobName}`);
    if (inputs) this.info(`Inputs:`, inputs);
  }
}
```

### 環境変数検証
```javascript
export class EnvValidator {
  static validateAnthropicKey() {
    this.validateAPIKey('ANTHROPIC_API_KEY', 'sk-ant-');
  }
  
  static validateNoteStorageState() {
    const value = process.env.NOTE_STORAGE_STATE_JSON;
    const parsed = JSON.parse(value);
    
    if (!parsed.cookies || !Array.isArray(parsed.cookies)) {
      throw new Error('Invalid storage state format');
    }
  }
}
```

## 🔄 ワークフロー最適化

### 並列実行の可能性
現在は順次実行だが、以下は並列化可能：
- 複数テーマでの記事生成
- 異なる言語での記事作成
- A/Bテスト用の複数バリエーション

### キャッシュ戦略
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'  # npm依存関係をキャッシュ
```

### リソース使用量
- **実行時間**: 約5-10分（全Job合計）
- **メモリ使用量**: 標準的なNode.jsアプリケーション
- **ストレージ**: Artifact用に数MB

## 🐛 デバッグ手法

### ローカルテスト
```bash
# 個別Jobのテスト
npm run research
npm run writing
npm run fact-check
npm run publish
```

### GitHub Actions デバッグ
```yaml
- name: Debug Environment
  run: |
    echo "Node version: $(node --version)"
    echo "NPM version: $(npm --version)"
    echo "Working directory: $(pwd)"
    ls -la
```

### エラーログ収集
```javascript
try {
  // 処理
} catch (error) {
  Logger.error('Job failed', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  throw error;
}
```

## 📊 パフォーマンス考慮事項

### API制限
- **Anthropic**: レート制限あり
- **Tavily**: 無料プランの制限
- **note.com**: 投稿頻度制限

### 最適化ポイント
1. **API呼び出し回数の最小化**
2. **並列処理の活用**
3. **キャッシュの効果的利用**
4. **エラー時の適切なリトライ**

## 🔮 将来の拡張可能性

### 追加機能案
1. **画像生成**: DALL-E, Midjourney連携
2. **多言語対応**: 翻訳API連携
3. **SNS連携**: Twitter, Facebook自動投稿
4. **分析機能**: 記事パフォーマンス追跡
5. **テンプレート**: カスタム記事テンプレート

### アーキテクチャ拡張
1. **マイクロサービス化**: 各Jobの独立デプロイ
2. **データベース連携**: 記事履歴管理
3. **Webhook連携**: 外部システムとの連携
4. **API化**: REST API提供

## 📚 参考資料

### 公式ドキュメント
- [GitHub Actions](https://docs.github.com/en/actions)
- [Playwright](https://playwright.dev/)
- [Anthropic Claude](https://docs.anthropic.com/)
- [Tavily API](https://tavily.com/docs)

### 有用なリソース
- [GitHub Actions Marketplace](https://github.com/marketplace?type=actions)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

### コミュニティ
- [GitHub Actions Community](https://github.com/actions/community)
- [Playwright Discord](https://discord.gg/playwright)
- [Node.js Community](https://nodejs.org/en/community/)