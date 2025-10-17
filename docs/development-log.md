# Note Automation System 開発ログ

## プロジェクト概要

GitHub Actionsを使用してnote記事のリサーチから自動投稿までを完全自動化するシステムの開発記録。

### 開発日時
- 開始日: 2025年1月12日
- 現在のステータス: Task 1 完了、Task 2 準備中

## 開発フロー

### 1. Spec作成フェーズ (完了)

#### 1.1 要件定義 (requirements.md)
- **作成内容**: 10の詳細な要件定義
- **主要要件**:
  - テーマ指定による自動ワークフロー実行
  - Claude Code SDKによるWeb検索リサーチ
  - Claude Sonnet 4.5による記事執筆
  - Tavily APIによるファクトチェック
  - Playwrightによるnote.com自動投稿
  - モバイル対応とセキュアな認証管理

#### 1.2 システム設計 (design.md)
- **アーキテクチャ**: 4つの独立したJob構成
  1. Research Job (リサーチ)
  2. Writing Job (執筆)
  3. Fact Check Job (ファクトチェック)
  4. Publishing Job (投稿)
- **技術スタック**:
  - GitHub Actions (ワークフロー管理)
  - Node.js 20+ (ランタイム)
  - Claude Code SDK (リサーチ)
  - Claude Sonnet 4.5 (記事執筆)
  - Tavily API (ファクトチェック)
  - Playwright (自動投稿)

#### 1.3 実装計画 (tasks.md)
- **総タスク数**: 10個のメインタスク
- **テスト戦略**: 単体テストをオプション（*マーク）として設定
- **MVP重視**: コア機能を優先した実装順序

### 2. 環境セットアップフェーズ (完了)

#### 2.1 Playwrightセットアップ
```bash
# 実行したコマンド
mkdir note-automation-setup
cd note-automation-setup
npm init -y
npm install playwright
npx playwright install chromium
```

#### 2.2 note.comログイン状態取得
- **課題**: 初回実行時にnote.comが「安全でないブラウザ」として検出
- **解決策**: 
  - User-Agentの設定
  - システムChromeの使用 (`channel: 'chrome'`)
  - 自動化検出回避の設定

#### 2.3 ログイン状態検証
- **作成ファイル**:
  - `login-note-chrome.mjs`: ログイン状態取得スクリプト
  - `test-login.mjs`: ログイン状態テストスクリプト
  - `debug-login.mjs`: UI構造調査スクリプト

- **検証結果**:
  - ✅ `note-state.json` 正常生成
  - ✅ 記事作成ページ (`https://editor.note.com/notes/n3205f0d681f6/edit/`) アクセス成功
  - ✅ ログイン状態有効確認

### 3. 実装フェーズ

#### 3.1 Task 1: プロジェクト構造とGitHub Actionsワークフロー基盤 (完了)

**作成されたファイル構造**:
```
note-automation-system/
├── .github/workflows/
│   └── note-automation.yml     # 4つのJobを持つワークフロー
├── jobs/                       # 各Jobスクリプト用ディレクトリ
├── utils/
│   ├── logger.js              # ログ出力管理
│   ├── file-manager.js        # ファイル操作とGitHub Actions連携
│   └── env-validator.js       # 環境変数検証
├── setup/                     # セットアップスクリプト用
├── inputs/                    # Job間データ転送（入力）
├── outputs/                   # Job間データ転送（出力）
├── package.json               # 依存関係とスクリプト定義
├── README.md                  # 詳細なセットアップ手順
└── .gitignore                 # 適切なファイル除外設定
```

**主要機能**:
- GitHub Actions ワークフローの完全定義
- 手動トリガーとスケジュール実行対応
- 4つのJob間でのArtifact連携
- 環境変数の安全な管理
- エラーハンドリングとログ出力

## 技術的な発見と解決策

### 1. note.com UI構造の調査結果
```html
<!-- ヘッダー構造 -->
<div class="m-navbarContainer svelte-1vzg1vo">
  <div class="m-navbarLogoContainer svelte-1s7rfpy">
    <!-- note.comはSvelteフレームワークを使用 -->
    <!-- 動的なクラス名（ハッシュ付き）を使用 -->
```

### 2. Playwright自動化の課題と対策
- **課題**: note.comの自動化検出
- **対策**: 
  - `--disable-blink-features=AutomationControlled`
  - 実際のブラウザUser-Agent使用
  - システムChromeの利用

### 3. GitHub Actions設計のポイント
- **Job分離**: 各処理を独立したJobとして実装
- **Artifact連携**: Job間でのデータ受け渡し
- **エラーハンドリング**: 各段階での適切なエラー処理
- **セキュリティ**: GitHub Secretsによる認証情報管理

## 現在の状況

### 完了項目
- ✅ Spec作成（要件、設計、タスク）
- ✅ Playwrightセットアップ
- ✅ note.comログイン状態取得・検証
- ✅ Task 1: プロジェクト基盤構築

### 次のステップ
- 🔄 Task 2: Research Job with Claude Code SDK integration
  - Claude Code SDKセットアップ
  - Web検索機能実装
  - 構造化リサーチレポート生成

### 必要な環境変数
```bash
# GitHub Secretsに設定が必要
ANTHROPIC_API_KEY=your_anthropic_api_key_here     # Claude API用
TAVILY_API_KEY=your_tavily_api_key_here          # ファクトチェック用
NOTE_STORAGE_STATE_JSON=your_note_storage_state_json_here    # note.comログイン状態
```

## 学んだこと

1. **Spec駆動開発の重要性**: 要件→設計→実装の順序で進めることで、明確な方向性を保てた
2. **Playwright認証の複雑さ**: Webサイトの自動化検出が厳しくなっており、適切な設定が必要
3. **GitHub Actionsの柔軟性**: 複雑なワークフローも適切に設計すれば実現可能
4. **セキュリティ考慮**: 認証情報の適切な管理が重要

## 今後の課題

1. **Claude Code SDKの統合**: Web検索機能の実装
2. **エラーハンドリングの強化**: 各APIの制限やエラーへの対応
3. **パフォーマンス最適化**: ワークフロー実行時間の短縮
4. **テスト戦略**: 自動テストの実装（オプション）

## 参考資料

- [note-automation-reference.yaml](.kiro/specs/url-content-video-generator/note-automation-reference.yaml): 元となった参考記事の構造化データ
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Playwright Documentation](https://playwright.dev/)
- [Anthropic API Documentation](https://docs.anthropic.com/)
- [Tavily API Documentation](https://tavily.com/docs)