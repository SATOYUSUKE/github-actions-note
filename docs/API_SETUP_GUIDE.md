# API設定ガイド

## 概要

Note Automation Systemで使用する各APIサービスの詳細な設定手順とベストプラクティスを説明します。

## 🤖 Anthropic API (Claude)

### アカウント作成と設定

1. **アカウント作成**
   - [Anthropic Console](https://console.anthropic.com/)にアクセス
   - 「Sign Up」でアカウント作成
   - メール認証を完了

2. **支払い方法の設定**
   - Console → Billing → Add payment method
   - クレジットカード情報を入力
   - 初回$5のクレジットが付与される場合があります

3. **APIキーの生成**
   - Console → API Keys → Create Key
   - キー名を入力（例：`note-automation-system`）
   - 生成されたキーをコピー（`sk-ant-`で始まる）

### 料金とクォータ管理

#### 料金体系 (2024年10月現在)

| モデル | 入力料金 | 出力料金 | 推奨用途 |
|--------|----------|----------|----------|
| Claude 3.5 Sonnet | $3/1M tokens | $15/1M tokens | 記事執筆 |
| Claude 3 Haiku | $0.25/1M tokens | $1.25/1M tokens | 軽量タスク |

#### 使用量の目安

```
1記事あたりの概算コスト：
- リサーチ情報: ~2,000 tokens (入力)
- 記事生成: ~3,000 tokens (出力)
- 合計コスト: 約$0.10-0.30
```

#### クォータ設定

```javascript
// jobs/writing-job.js でトークン制限を設定
const anthropicConfig = {
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 4000,  // 出力制限
  temperature: 0.7,
  timeout: 60000     // 60秒タイムアウト
};
```

### セキュリティ設定

1. **APIキーの管理**
```bash
# 環境変数での設定（ローカル開発用）
export ANTHROPIC_API_KEY="sk-ant-your-key-here"

# GitHub Secretsでの設定（本番用）
# Settings → Secrets → ANTHROPIC_API_KEY
```

2. **レート制限の実装**
```javascript
class AnthropicRateLimiter {
  constructor() {
    this.requests = [];
    this.maxRequests = 50; // 1分間の最大リクエスト数
    this.timeWindow = 60000; // 1分
  }
  
  async waitIfNeeded() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    
    if (this.requests.length >= this.maxRequests) {
      const waitTime = this.timeWindow - (now - this.requests[0]);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.requests.push(now);
  }
}
```

## 🔍 Tavily API (ファクトチェック)

### アカウント作成と設定

1. **アカウント作成**
   - [Tavily](https://tavily.com/)にアクセス
   - 「Get Started」でアカウント作成
   - メール認証を完了

2. **APIキーの取得**
   - Dashboard → API Keys
   - 「Generate New Key」をクリック
   - 生成されたキーをコピー（`tvly-`で始まる）

### プランと料金

#### 料金プラン (2024年10月現在)

| プラン | 月額料金 | リクエスト数 | 特徴 |
|--------|----------|--------------|------|
| Free | $0 | 1,000 | 基本的な検索 |
| Pro | $50 | 50,000 | 高速検索、詳細結果 |
| Enterprise | カスタム | カスタム | 専用サポート |

#### 使用量の最適化

```javascript
// jobs/fact-check-job.js で効率的な検索
const tavilyConfig = {
  search_depth: 'basic',     // 'advanced'より高速
  include_answer: true,      // 回答を含める
  include_raw_content: false, // 生コンテンツは除外
  max_results: 5            // 結果数を制限
};
```

### API使用量の監視

```javascript
class TavilyUsageTracker {
  constructor() {
    this.dailyRequests = 0;
    this.monthlyRequests = 0;
    this.lastReset = new Date();
  }
  
  trackRequest() {
    this.dailyRequests++;
    this.monthlyRequests++;
    
    // 日次リセット
    const now = new Date();
    if (now.getDate() !== this.lastReset.getDate()) {
      this.dailyRequests = 1;
      this.lastReset = now;
    }
  }
  
  checkQuota() {
    const freeLimit = 1000;
    if (this.monthlyRequests >= freeLimit * 0.9) {
      console.warn('Tavily API quota nearly exhausted');
    }
  }
}
```

## 🔐 GitHub Secrets管理

### Secretsの設定

1. **リポジトリ設定**
   - GitHub リポジトリ → Settings
   - Secrets and variables → Actions
   - 「New repository secret」

2. **必要なSecrets**

| Secret名 | 形式 | 例 |
|----------|------|-----|
| `ANTHROPIC_API_KEY` | sk-ant-... | sk-ant-api03-xxx |
| `TAVILY_API_KEY` | tvly-... | tvly-xxx |
| `NOTE_STORAGE_STATE` | JSON | {"cookies":[...]} |

### Secretsのベストプラクティス

1. **命名規則**
```
# 推奨: 大文字とアンダースコア
ANTHROPIC_API_KEY
TAVILY_API_KEY
NOTE_STORAGE_STATE

# 非推奨: 小文字やハイフン
anthropic-api-key
tavily_api_key
```

2. **値の検証**
```javascript
// utils/secret-validator.js
function validateSecrets() {
  const required = [
    'ANTHROPIC_API_KEY',
    'TAVILY_API_KEY', 
    'NOTE_STORAGE_STATE'
  ];
  
  for (const secret of required) {
    if (!process.env[secret]) {
      throw new Error(`Missing required secret: ${secret}`);
    }
  }
  
  // APIキー形式の検証
  if (!process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
    throw new Error('Invalid Anthropic API key format');
  }
  
  if (!process.env.TAVILY_API_KEY.startsWith('tvly-')) {
    throw new Error('Invalid Tavily API key format');
  }
}
```

3. **ローテーション戦略**
```javascript
// 定期的なキーローテーション
const keyRotationSchedule = {
  anthropic: '3 months',
  tavily: '6 months',
  noteAuth: '1 month'
};
```

## 🌐 note.com認証設定

### Storage State の生成

1. **認証スクリプトの実行**
```bash
node note-automation-setup/login-note-chrome.mjs
```

2. **生成されるファイル**
```json
{
  "cookies": [
    {
      "name": "session_id",
      "value": "xxx",
      "domain": ".note.com",
      "path": "/",
      "expires": 1234567890,
      "httpOnly": true,
      "secure": true,
      "sameSite": "Lax"
    }
  ],
  "origins": [
    {
      "origin": "https://note.com",
      "localStorage": []
    }
  ]
}
```

### 認証の検証

```javascript
// note-automation-setup/test-login.mjs
async function validateAuthentication() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    storageState: 'note-state.json'
  });
  
  const page = await context.newPage();
  await page.goto('https://note.com/n/n123456789012');
  
  // ログイン状態の確認
  const isLoggedIn = await page.locator('[data-testid="user-menu"]').isVisible();
  
  if (!isLoggedIn) {
    throw new Error('Authentication failed - please regenerate note-state.json');
  }
  
  console.log('✅ Authentication verified');
  await browser.close();
}
```

### 認証の更新

```bash
# 月次での認証更新スクリプト
#!/bin/bash
echo "Updating note.com authentication..."

# 既存の認証ファイルをバックアップ
cp note-state.json note-state.json.backup

# 新しい認証を生成
node note-automation-setup/login-note-chrome.mjs

# 認証をテスト
node note-automation-setup/test-login.mjs

# GitHub Secretsの更新指示
echo "Please update NOTE_STORAGE_STATE secret with new note-state.json content"
```

## 📊 使用量監視とアラート

### コスト監視ダッシュボード

```javascript
// utils/cost-monitor.js
class CostMonitor {
  constructor() {
    this.costs = {
      anthropic: 0,
      tavily: 0,
      github: 0
    };
  }
  
  trackAnthropicUsage(inputTokens, outputTokens) {
    const inputCost = (inputTokens / 1000000) * 3;   // $3/1M tokens
    const outputCost = (outputTokens / 1000000) * 15; // $15/1M tokens
    this.costs.anthropic += inputCost + outputCost;
  }
  
  trackTavilyUsage(requests) {
    // Free plan: 1000 requests/month
    // Pro plan: $50/month for 50,000 requests
    if (requests > 1000) {
      this.costs.tavily = 50; // Pro plan cost
    }
  }
  
  generateReport() {
    const total = Object.values(this.costs).reduce((a, b) => a + b, 0);
    return {
      breakdown: this.costs,
      total: total,
      currency: 'USD'
    };
  }
}
```

### アラート設定

```javascript
// utils/alert-system.js
class AlertSystem {
  checkThresholds(costs) {
    const thresholds = {
      daily: 5,    // $5/day
      monthly: 100  // $100/month
    };
    
    if (costs.daily > thresholds.daily) {
      this.sendAlert('Daily cost threshold exceeded', costs);
    }
    
    if (costs.monthly > thresholds.monthly) {
      this.sendAlert('Monthly cost threshold exceeded', costs);
    }
  }
  
  sendAlert(message, data) {
    // GitHub Actions環境でのアラート
    console.log(`::warning::${message}`);
    console.log(`Cost data: ${JSON.stringify(data)}`);
  }
}
```

## 🔧 トラブルシューティング

### よくあるAPI問題

1. **認証エラー**
```javascript
// エラー: 401 Unauthorized
// 解決: APIキーの確認と再生成
if (error.status === 401) {
  console.error('API authentication failed. Please check your API key.');
  console.error('Key format should be: sk-ant-... (Anthropic) or tvly-... (Tavily)');
}
```

2. **レート制限エラー**
```javascript
// エラー: 429 Too Many Requests
// 解決: 指数バックオフでリトライ
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429 && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}
```

3. **クォータ超過エラー**
```javascript
// エラー: 403 Quota Exceeded
// 解決: 使用量の確認と制限
if (error.status === 403) {
  console.error('API quota exceeded. Please check your usage:');
  console.error('Anthropic: https://console.anthropic.com/usage');
  console.error('Tavily: https://tavily.com/dashboard');
}
```

## 📋 設定チェックリスト

### 初期設定完了チェック

- [ ] Anthropic APIキー取得・設定完了
- [ ] Tavily APIキー取得・設定完了
- [ ] note.com認証状態生成完了
- [ ] GitHub Secrets設定完了
- [ ] ローカルテスト実行成功
- [ ] GitHub Actionsテスト実行成功

### 定期メンテナンスチェック

- [ ] API使用量確認（月次）
- [ ] コスト確認（月次）
- [ ] 認証状態更新（月次）
- [ ] APIキーローテーション（四半期）
- [ ] セキュリティ監査（四半期）

このガイドに従って設定することで、安全で効率的なAPI利用が可能になります。