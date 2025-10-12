# Requirements Document

## Introduction

GitHub Actionsを使用してnote記事のリサーチから自動投稿までを完全自動化するシステムです。このシステムは、ユーザーがテーマを指定するだけで、Web検索によるリサーチ、AI による記事執筆、ファクトチェック、そしてnote.comへの自動投稿までを一連のワークフローとして実行します。スマートフォンからでも実行可能で、完全無料（API料金除く）で利用できる自動化システムを提供します。

## System Prerequisites

- GitHub Actions環境（無料枠：月2,000分まで）
- Node.js runtime環境
- Playwright（Webブラウザ自動操作ライブラリ）
- 必要なAPI キー：
  - Anthropic API（Claude Sonnet 4.5用）
  - Tavily API（ファクトチェック用）
- note.com アカウントとログイン認証情報

## Requirements

### Requirement 1

**User Story:** As a content creator, I want to specify a theme and have the system automatically research, write, and publish an article to note.com, so that I can maintain consistent content output without manual effort.

#### Acceptance Criteria

1. WHEN user provides article theme, target audience, core message, and tags THEN system SHALL initiate automated workflow
2. WHEN workflow is triggered THEN system SHALL execute research, writing, fact-checking, and publishing steps sequentially
3. WHEN workflow completes THEN system SHALL publish article to note.com as draft or public post based on user preference
4. IF any step fails THEN system SHALL log error details and stop workflow execution

### Requirement 2

**User Story:** As a content creator, I want the system to conduct comprehensive research on my specified topic, so that the generated article contains accurate and up-to-date information.

#### Acceptance Criteria

1. WHEN research job starts THEN system SHALL use Claude Code SDK with WebSearch and WebFetch capabilities
2. WHEN conducting research THEN system SHALL perform multiple search queries to gather comprehensive information
3. WHEN research completes THEN system SHALL generate structured research report with sources
4. IF research finds insufficient information THEN system SHALL expand search queries automatically

### Requirement 3

**User Story:** As a content creator, I want the system to write engaging articles based on research findings, so that the content meets professional publishing standards.

#### Acceptance Criteria

1. WHEN writing job starts THEN system SHALL use Claude Sonnet 4.5 to generate article content
2. WHEN generating content THEN system SHALL create title, body text, and appropriate tags
3. WHEN writing completes THEN system SHALL produce article in note.com compatible format
4. IF content generation fails THEN system SHALL retry with adjusted parameters

### Requirement 4

**User Story:** As a content creator, I want the system to fact-check generated articles, so that published content maintains accuracy and credibility.

#### Acceptance Criteria

1. WHEN fact-check job starts THEN system SHALL use Tavily API to verify article claims
2. WHEN fact-checking THEN system SHALL identify and flag potentially inaccurate statements
3. WHEN corrections are needed THEN system SHALL automatically revise article content
4. WHEN fact-check completes THEN system SHALL provide final verified article version

### Requirement 5

**User Story:** As a content creator, I want the system to automatically publish articles to note.com, so that I don't need to manually copy and paste content.

#### Acceptance Criteria

1. WHEN publishing job starts THEN system SHALL use Playwright to automate note.com interaction
2. WHEN accessing note.com THEN system SHALL authenticate using stored login credentials
3. WHEN publishing THEN system SHALL input title, content, and tags automatically
4. WHEN publish completes THEN system SHALL save as draft or publish based on user preference
5. IF authentication fails THEN system SHALL report login credential issues

### Requirement 6

**User Story:** As a mobile user, I want to trigger the automation workflow from my smartphone, so that I can initiate content creation while on the go.

#### Acceptance Criteria

1. WHEN user accesses GitHub Actions via mobile browser THEN system SHALL display workflow trigger interface
2. WHEN user inputs parameters on mobile THEN system SHALL accept and validate all required fields
3. WHEN workflow runs THEN system SHALL execute normally regardless of trigger device
4. IF mobile interface has issues THEN system SHALL provide alternative access methods

### Requirement 7

**User Story:** As a system administrator, I want to configure API keys and authentication securely, so that the system can access required services without exposing credentials.

#### Acceptance Criteria

1. WHEN setting up system THEN user SHALL install Playwright and required dependencies locally
2. WHEN setting up system THEN user SHALL generate note.com storageState using Playwright login script
3. WHEN setting up system THEN user SHALL configure Anthropic API key as GitHub secret
4. WHEN setting up system THEN user SHALL configure Tavily API key as GitHub secret
5. WHEN setting up system THEN user SHALL configure note.com storageState JSON as GitHub secret
6. WHEN workflow runs THEN system SHALL access secrets securely without logging credentials
7. IF credentials are invalid THEN system SHALL report authentication errors clearly

### Requirement 8

**User Story:** As a content creator, I want to customize workflow parameters and prompts, so that the generated content matches my specific style and requirements.

#### Acceptance Criteria

1. WHEN user wants customization THEN system SHALL provide editable YAML workflow configuration
2. WHEN modifying prompts THEN system SHALL allow custom AI instruction templates
3. WHEN changing parameters THEN system SHALL validate configuration before execution
4. IF configuration is invalid THEN system SHALL provide clear error messages

### Requirement 9

**User Story:** As a content creator, I want to test the system without actually publishing, so that I can verify content quality before going live.

#### Acceptance Criteria

1. WHEN user enables dry run mode THEN system SHALL execute all steps except final publishing
2. WHEN dry run completes THEN system SHALL provide generated article for review
3. WHEN testing THEN system SHALL log all workflow steps for debugging
4. IF dry run reveals issues THEN system SHALL provide actionable feedback

### Requirement 10

**User Story:** As a system user, I want clear error handling and troubleshooting guidance, so that I can resolve issues independently.

#### Acceptance Criteria

1. WHEN errors occur THEN system SHALL log detailed error messages with context
2. WHEN authentication expires THEN system SHALL provide credential renewal instructions
3. WHEN API limits are reached THEN system SHALL report usage status and recommendations
4. WHEN workflow fails THEN system SHALL suggest specific troubleshooting steps