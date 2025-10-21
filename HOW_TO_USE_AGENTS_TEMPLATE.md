# AGENTS_TEMPLATE.md 使用ガイド

## 概要
`AGENTS_TEMPLATE.md`は、どのプロジェクトでも使える汎用的なAI開発アシスタント向けの指示書テンプレートです。

## 使用方法

### 1. 基本的な使い方
```bash
# 新しいプロジェクトでテンプレートをコピー
cp AGENTS_TEMPLATE.md /path/to/new-project/AGENTS.md
```

### 2. カスタマイズが必要な箇所

#### 必須の置換項目
- `[PROJECT_NAME]` → プロジェクト名
- `[PROJECT_DESCRIPTION]` → プロジェクトの説明
- `[UPDATE THIS SECTION WITH YOUR PROJECT'S TECHNOLOGIES]` → 使用技術スタック
- `[UPDATE THIS SECTION WITH YOUR PROJECT'S COMMANDS]` → プロジェクト固有のコマンド
- `[UPDATE THIS ENTIRE SECTION WITH YOUR PROJECT DETAILS]` → プロジェクトコンテキスト全体

#### 任意の追加項目
- `[ADD PROJECT-SPECIFIC RESTRICTIONS HERE]` → プロジェクト固有の制限事項
- `[ADD PROJECT-SPECIFIC SECURITY RULES HERE]` → セキュリティルール
- `[LIST_YOUR_SECRETS]` → 必要な環境変数・シークレット

### 3. プロジェクトタイプ別の例

#### Web アプリケーション (React + Node.js)
```markdown
## TECH STACK
- **Frontend**: React 18, TypeScript, Vite
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL, Prisma ORM
- **Testing**: Jest, React Testing Library, Supertest
- **CI/CD**: GitHub Actions
- **Configuration**: JSON, environment variables

## ESSENTIAL COMMANDS
```bash
# Install dependencies
npm install

# Start development servers
npm run dev          # Frontend (Vite)
npm run dev:api      # Backend (Express)

# Run tests
npm test             # All tests
npm run test:frontend # Frontend tests only
npm run test:api     # Backend tests only

# Build for production
npm run build
npm run build:api

# Deploy
npm run deploy
```

#### Python API (FastAPI)
```markdown
## TECH STACK
- **Runtime**: Python 3.11+
- **Framework**: FastAPI, Pydantic
- **Database**: PostgreSQL, SQLAlchemy
- **Testing**: pytest, httpx
- **CI/CD**: GitHub Actions
- **Configuration**: YAML, environment variables

## ESSENTIAL COMMANDS
```bash
# Install dependencies
pip install -r requirements.txt

# Start development server
uvicorn main:app --reload

# Run tests
pytest
pytest tests/test_api.py -v

# Lint and format
flake8 .
black .
isort .

# Build Docker image
docker build -t myapi .
```

#### Go マイクロサービス
```markdown
## TECH STACK
- **Runtime**: Go 1.21+
- **Framework**: Gin, GORM
- **Database**: PostgreSQL
- **Testing**: Go standard testing, testify
- **CI/CD**: GitHub Actions
- **Configuration**: YAML, environment variables

## ESSENTIAL COMMANDS
```bash
# Install dependencies
go mod download

# Run application
go run main.go

# Run tests
go test ./...
go test -v ./internal/handlers

# Build
go build -o bin/app

# Format and lint
gofmt -w .
golangci-lint run
```

### 4. AIアシスタントへの指示例

新しいプロジェクトでAGENTS.mdを使用する際のプロンプト例：

```
このプロジェクトのAGENTS.mdファイルを読んで、開発ガイドラインとして従ってください。

プロジェクト概要：
- [プロジェクトの簡単な説明]
- 主要技術：[使用している技術スタック]
- 開発フェーズ：[初期開発/機能追加/バグ修正など]

特に以下の点に注意してください：
- [プロジェクト固有の重要なルール]
- [セキュリティ要件]
- [パフォーマンス要件]
```

### 5. 段階的なカスタマイズ手順

#### Step 1: 基本情報の更新
1. プロジェクト名と説明を更新
2. 技術スタックを現在のものに変更
3. 基本的なコマンドを追加

#### Step 2: プロジェクト固有のルール追加
1. セキュリティ要件を追加
2. パフォーマンス要件を追加
3. コーディング規約を追加

#### Step 3: 詳細なコンテキスト追加
1. アーキテクチャの説明を追加
2. 重要なファイル構造を文書化
3. 開発ワークフローを定義

### 6. メンテナンス

#### 定期的な更新
- 新しい技術を導入した際の技術スタック更新
- 新しいコマンドやツールの追加
- プロジェクトの成長に合わせたルールの調整

#### チーム共有
- 新メンバーのオンボーディング資料として活用
- コードレビューの基準として参照
- 開発標準の統一に使用

## トラブルシューティング

### よくある問題

#### Q: AIが古い技術スタックを参照してしまう
A: TECH STACKセクションを最新の情報に更新し、古い技術への言及を削除してください。

#### Q: プロジェクト固有のルールが守られない
A: RESTRICTIONSセクションに明確に記載し、重要度を強調してください。

#### Q: コマンドが動作しない
A: ESSENTIAL COMMANDSセクションを実際のプロジェクト構成に合わせて更新してください。

### カスタマイズのベストプラクティス

1. **段階的な導入**: 一度にすべてを変更せず、段階的にカスタマイズ
2. **チームでの合意**: 重要なルールはチーム全体で合意を取る
3. **定期的な見直し**: プロジェクトの進化に合わせて定期的に更新
4. **具体的な記述**: 抽象的でなく、具体的で実行可能なルールを記載

## 関連ファイル
- `AGENTS_TEMPLATE.md`: 汎用テンプレート
- `AGENTS.md`: 現在のプロジェクト用（note.com自動化システム）
- `~/.codex/AGENTS.md`: グローバル設定（オプション）