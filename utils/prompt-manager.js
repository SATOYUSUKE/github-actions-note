/**
 * プロンプトテンプレート管理システム
 * カスタマイズ可能なプロンプトテンプレート、変数置換、バージョン管理を提供
 */

import { Logger } from './logger.js';
import { FileManager } from './file-manager.js';
import { globalConfig } from './config-manager.js';
import fs from 'fs';

/**
 * プロンプトタイプ定義
 */
export const PromptTypes = {
  RESEARCH_SYSTEM: 'research_system',
  RESEARCH_USER: 'research_user',
  WRITING_SYSTEM: 'writing_system',
  WRITING_USER: 'writing_user',
  FACT_CHECK_SYSTEM: 'fact_check_system',
  FACT_CHECK_USER: 'fact_check_user'
};

/**
 * プロンプトテンプレート管理クラス
 */
export class PromptManager {
  constructor() {
    this.templatesPath = 'config/templates';
    this.userTemplatesPath = 'config/templates/user';
    this.defaultTemplatesPath = 'config/templates/default';
    
    this.loadedTemplates = new Map();
    this.templateVariables = new Map();
    this.templateVersions = new Map();
  }

  /**
   * プロンプトマネージャーを初期化
   */
  async initialize() {
    try {
      Logger.info('Initializing prompt manager...');
      
      // テンプレートディレクトリを作成
      await this.ensureTemplateDirectories();
      
      // デフォルトテンプレートを作成
      await this.createDefaultTemplates();
      
      // テンプレートを読み込み
      await this.loadTemplates();
      
      Logger.info('Prompt manager initialized successfully');
      
    } catch (error) {
      Logger.error('Failed to initialize prompt manager', error);
      throw error;
    }
  }

  /**
   * テンプレートディレクトリを確保
   */
  async ensureTemplateDirectories() {
    const directories = [
      this.templatesPath,
      this.defaultTemplatesPath,
      this.userTemplatesPath
    ];

    for (const dir of directories) {
      await FileManager.ensureDirectory(dir);
    }
  }

  /**
   * デフォルトテンプレートを作成
   */
  async createDefaultTemplates() {
    // リサーチジョブ用テンプレート
    const researchSystemTemplate = {
      name: 'Research System Prompt',
      version: '1.0.0',
      description: 'System prompt for research job using Claude Code SDK',
      variables: ['research_depth', 'writing_style', 'target_audience'],
      template: `あなたは優秀なリサーチャーです。与えられたテーマについて、web_searchとweb_fetchツールを使用して{{research_depth}}なリサーチを行い、構造化されたレポートを作成してください。

リサーチの手順:
1. まず、テーマに関連する複数の検索クエリを実行
2. 信頼できる情報源から詳細な情報を収集
3. 最新のトレンドや統計データを調査
4. 専門家の意見や事例を収集
5. 収集した情報を整理して構造化されたレポートを作成

対象読者: {{target_audience}}
記事スタイル: {{writing_style}}

出力形式:
必ず以下のJSON形式で回答してください:

{
  "topic": "リサーチテーマ",
  "summary": "テーマの概要説明（200文字程度）",
  "keyPoints": [
    {
      "title": "重要ポイントのタイトル",
      "description": "詳細説明",
      "source": "情報源URL"
    }
  ],
  "trends": [
    {
      "trend": "トレンド名",
      "description": "トレンドの説明",
      "impact": "影響度（高/中/低）"
    }
  ],
  "statistics": [
    {
      "metric": "統計項目",
      "value": "数値",
      "source": "データ源",
      "date": "データ取得日"
    }
  ],
  "expertOpinions": [
    {
      "expert": "専門家名",
      "opinion": "意見内容",
      "source": "引用元"
    }
  ],
  "sources": [
    {
      "url": "URL",
      "title": "タイトル",
      "relevanceScore": 0.9,
      "credibilityScore": 0.8,
      "publishDate": "2024-01-01"
    }
  ]
}`
    };

    const researchUserTemplate = {
      name: 'Research User Prompt',
      version: '1.0.0',
      description: 'User prompt template for research job',
      variables: ['theme', 'target', 'message', 'research_depth'],
      template: `以下のテーマについて{{research_depth}}なリサーチを行ってください:

テーマ: {{theme}}
想定読者: {{target}}
伝えたいメッセージ: {{message}}

リサーチ要件:
1. テーマに関する最新情報と動向を調査
2. 想定読者に適した情報レベルで収集
3. 伝えたいメッセージを裏付ける事実やデータを重点的に調査
4. 信頼できる情報源から最低5つ以上の参考資料を収集
5. 統計データや専門家の意見を含める

web_searchとweb_fetchツールを積極的に使用して、最新で正確な情報を収集してください。
最終的に、構造化されたJSONレポートとして出力してください。`
    };

    // ライティングジョブ用テンプレート
    const writingSystemTemplate = {
      name: 'Writing System Prompt',
      version: '1.0.0',
      description: 'System prompt for writing job using Claude Sonnet',
      variables: ['writing_style', 'content_length', 'target_audience'],
      template: `あなたは優秀なライターです。リサーチレポートを基に、読者にとって価値のある記事を執筆してください。

記事執筆の要件:
1. note.comに適したMarkdown形式で執筆
2. {{target_audience}}の知識レベルに合わせた内容
3. {{writing_style}}なスタイルで執筆
4. {{content_length}}の記事として構成
5. 具体例や事例を豊富に含める
6. 実践的で行動につながる内容
7. SEOを意識したタイトルと構成
8. 適切な見出し構造（H2, H3を使用）
9. 読みやすい段落分け

出力形式:
必ず以下のJSON形式で回答してください:

{
  "title": "魅力的で具体的なタイトル（50文字以内）",
  "content": "Markdown形式の記事本文",
  "tags": ["タグ1", "タグ2", "タグ3"],
  "summary": "記事の要約（200文字程度）",
  "keyPoints": [
    "重要ポイント1",
    "重要ポイント2",
    "重要ポイント3"
  ],
  "targetAudience": "想定読者の詳細",
  "callToAction": "読者に促したい具体的なアクション"
}

記事の構成例:
## はじめに
（読者の関心を引く導入）

## [メインテーマ]の現状
（リサーチ結果を基にした現状分析）

## 具体的な活用方法
（実践的な内容）

## 成功事例・失敗事例
（具体例）

## まとめ
（要点の整理と次のアクション）`
    };

    const writingUserTemplate = {
      name: 'Writing User Prompt',
      version: '1.0.0',
      description: 'User prompt template for writing job',
      variables: ['theme', 'target', 'message', 'cta', 'tags', 'writing_style', 'content_length', 'research_summary', 'key_points', 'trends', 'statistics'],
      template: `以下の情報を基に、魅力的で実用的な記事を執筆してください:

## 基本情報
- テーマ: {{theme}}
- 想定読者: {{target}}
- 伝えたいメッセージ: {{message}}
- 読後のアクション: {{cta}}
- 推奨タグ: {{tags}}
- 記事スタイル: {{writing_style}}
- 記事の長さ: {{content_length}}

## リサーチ結果

### 概要
{{research_summary}}

### 重要ポイント
{{key_points}}

### トレンド情報
{{trends}}

### 統計データ
{{statistics}}

## 執筆要件
1. 想定読者（{{target}}）に適した内容レベル
2. 「{{message}}」というメッセージを効果的に伝える
3. 読者が「{{cta}}」したくなる構成
4. リサーチ結果を根拠として活用
5. {{content_length}}の記事として構成
6. note.comで人気が出そうな魅力的なタイトル
7. 実践的で具体的な内容

リサーチ結果を効果的に活用し、読者にとって価値のある記事を作成してください。`
    };

    // ファクトチェックジョブ用テンプレート
    const factCheckSystemTemplate = {
      name: 'Fact Check System Prompt',
      version: '1.0.0',
      description: 'System prompt for fact-checking analysis',
      variables: ['fact_check_level'],
      template: `あなたは優秀なファクトチェッカーです。与えられた記事の内容を{{fact_check_level}}にチェックし、事実の正確性を検証してください。

ファクトチェックの手順:
1. 記事から検証すべき事実的な主張を抽出
2. 各主張について信頼できる情報源で検証
3. 不正確または疑わしい情報を特定
4. 必要に応じて修正案を提案
5. 全体的な信頼性スコアを算出

検証レベル: {{fact_check_level}}

出力形式:
以下のJSON形式で回答してください:

{
  "checkedClaims": [
    {
      "claim": "検証した主張",
      "verification": "verified|disputed|unverifiable",
      "confidence": 0.9,
      "sources": ["検証に使用した情報源"],
      "reason": "検証結果の理由"
    }
  ],
  "corrections": [
    {
      "original": "元の記述",
      "corrected": "修正案",
      "reason": "修正理由",
      "confidence": 0.8
    }
  ],
  "overallScore": 0.85,
  "summary": "ファクトチェック結果の要約"
}`
    };

    // テンプレートを保存
    const templates = [
      { type: PromptTypes.RESEARCH_SYSTEM, data: researchSystemTemplate },
      { type: PromptTypes.RESEARCH_USER, data: researchUserTemplate },
      { type: PromptTypes.WRITING_SYSTEM, data: writingSystemTemplate },
      { type: PromptTypes.WRITING_USER, data: writingUserTemplate },
      { type: PromptTypes.FACT_CHECK_SYSTEM, data: factCheckSystemTemplate }
    ];

    for (const { type, data } of templates) {
      const filePath = `${this.defaultTemplatesPath}/${type}.json`;
      await FileManager.writeJSON(filePath, data);
    }
  }

  /**
   * テンプレートを読み込み
   */
  async loadTemplates() {
    try {
      const templateTypes = Object.values(PromptTypes);
      
      for (const type of templateTypes) {
        // デフォルトテンプレートを読み込み
        const defaultPath = `${this.defaultTemplatesPath}/${type}.json`;
        let template = null;
        
        if (fs.existsSync(defaultPath)) {
          template = await FileManager.readJSON(defaultPath);
        }
        
        // ユーザーテンプレートが存在する場合は上書き
        const userPath = `${this.userTemplatesPath}/${type}.json`;
        if (fs.existsSync(userPath)) {
          const userTemplate = await FileManager.readJSON(userPath);
          template = { ...template, ...userTemplate };
        }
        
        if (template) {
          this.loadedTemplates.set(type, template);
          this.templateVariables.set(type, template.variables || []);
          Logger.debug(`Loaded template: ${type}`);
        }
      }
      
    } catch (error) {
      Logger.error('Failed to load templates', error);
      throw error;
    }
  }

  /**
   * プロンプトを生成
   */
  generatePrompt(type, variables = {}) {
    try {
      const template = this.loadedTemplates.get(type);
      if (!template) {
        throw new Error(`Template not found: ${type}`);
      }

      let prompt = template.template;
      
      // 設定から変数を取得
      const configVariables = this.getConfigVariables();
      const allVariables = { ...configVariables, ...variables };
      
      // 変数を置換
      for (const [key, value] of Object.entries(allVariables)) {
        const placeholder = `{{${key}}}`;
        const replacement = this.formatVariable(value);
        prompt = prompt.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), replacement);
      }
      
      // 未置換の変数をチェック
      const unreplacedVariables = prompt.match(/\{\{[^}]+\}\}/g);
      if (unreplacedVariables) {
        Logger.warn(`Unreplaced variables in template ${type}:`, unreplacedVariables);
      }
      
      return prompt;
      
    } catch (error) {
      Logger.error(`Failed to generate prompt for ${type}`, error);
      throw error;
    }
  }

  /**
   * 設定から変数を取得
   */
  getConfigVariables() {
    const variables = {};
    
    try {
      const workflowConfig = globalConfig.getConfig('workflow');
      
      // 高度な設定から変数を取得
      if (workflowConfig.advanced) {
        variables.research_depth = this.mapResearchDepth(workflowConfig.advanced.researchDepth);
        variables.writing_style = this.mapWritingStyle(workflowConfig.advanced.writingStyle);
        variables.content_length = this.mapContentLength(workflowConfig.advanced.contentLength);
        variables.fact_check_level = this.mapFactCheckLevel(workflowConfig.advanced.factCheckLevel);
      }
      
      // パラメータから変数を取得
      if (workflowConfig.parameters) {
        variables.target_audience = workflowConfig.parameters.target?.default || 'エンジニア初心者';
      }
      
    } catch (error) {
      Logger.warn('Failed to get config variables', error);
    }
    
    return variables;
  }

  /**
   * リサーチ深度をマップ
   */
  mapResearchDepth(depth) {
    const mapping = {
      basic: '基本的',
      standard: '包括的',
      deep: '詳細で深い'
    };
    return mapping[depth] || '包括的';
  }

  /**
   * ライティングスタイルをマップ
   */
  mapWritingStyle(style) {
    const mapping = {
      casual: 'カジュアルで親しみやすい',
      informative: '情報豊富で実用的',
      technical: '技術的で専門的',
      academic: '学術的で厳密'
    };
    return mapping[style] || '情報豊富で実用的';
  }

  /**
   * コンテンツ長をマップ
   */
  mapContentLength(length) {
    const mapping = {
      short: '短い（1000-1500文字）',
      medium: '中程度（2000-3000文字）',
      long: '長い（3500-5000文字）'
    };
    return mapping[length] || '中程度（2000-3000文字）';
  }

  /**
   * ファクトチェックレベルをマップ
   */
  mapFactCheckLevel(level) {
    const mapping = {
      basic: '基本的',
      standard: '標準的',
      strict: '厳密'
    };
    return mapping[level] || '標準的';
  }

  /**
   * 変数をフォーマット
   */
  formatVariable(value) {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  }

  /**
   * テンプレートを更新
   */
  async updateTemplate(type, updates) {
    try {
      const currentTemplate = this.loadedTemplates.get(type);
      if (!currentTemplate) {
        throw new Error(`Template not found: ${type}`);
      }

      const updatedTemplate = { ...currentTemplate, ...updates };
      
      // バージョンを更新
      const version = updatedTemplate.version || '1.0.0';
      const [major, minor, patch] = version.split('.').map(Number);
      updatedTemplate.version = `${major}.${minor}.${patch + 1}`;
      
      // ユーザーテンプレートとして保存
      const userPath = `${this.userTemplatesPath}/${type}.json`;
      await FileManager.writeJSON(userPath, updatedTemplate);
      
      // メモリ内のテンプレートを更新
      this.loadedTemplates.set(type, updatedTemplate);
      this.templateVariables.set(type, updatedTemplate.variables || []);
      
      Logger.info(`Template updated: ${type} v${updatedTemplate.version}`);
      
    } catch (error) {
      Logger.error(`Failed to update template ${type}`, error);
      throw error;
    }
  }

  /**
   * テンプレートをリセット
   */
  async resetTemplate(type) {
    try {
      // ユーザーテンプレートを削除
      const userPath = `${this.userTemplatesPath}/${type}.json`;
      if (fs.existsSync(userPath)) {
        fs.unlinkSync(userPath);
      }
      
      // デフォルトテンプレートを再読み込み
      const defaultPath = `${this.defaultTemplatesPath}/${type}.json`;
      if (fs.existsSync(defaultPath)) {
        const defaultTemplate = await FileManager.readJSON(defaultPath);
        this.loadedTemplates.set(type, defaultTemplate);
        this.templateVariables.set(type, defaultTemplate.variables || []);
      }
      
      Logger.info(`Template reset to default: ${type}`);
      
    } catch (error) {
      Logger.error(`Failed to reset template ${type}`, error);
      throw error;
    }
  }

  /**
   * テンプレート一覧を取得
   */
  getTemplateList() {
    const templates = [];
    
    for (const [type, template] of this.loadedTemplates) {
      templates.push({
        type,
        name: template.name,
        version: template.version,
        description: template.description,
        variables: template.variables || [],
        hasCustomization: fs.existsSync(`${this.userTemplatesPath}/${type}.json`)
      });
    }
    
    return templates;
  }

  /**
   * テンプレート変数を取得
   */
  getTemplateVariables(type) {
    return this.templateVariables.get(type) || [];
  }

  /**
   * テンプレートをエクスポート
   */
  async exportTemplates(types = null) {
    try {
      const exportData = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        templates: {}
      };

      const typesToExport = types || Array.from(this.loadedTemplates.keys());
      
      for (const type of typesToExport) {
        const template = this.loadedTemplates.get(type);
        if (template) {
          exportData.templates[type] = template;
        }
      }

      const filename = `templates-export-${Date.now()}.json`;
      const exportPath = `outputs/${filename}`;
      
      await FileManager.ensureDirectory('outputs');
      await FileManager.writeJSON(exportPath, exportData);
      
      Logger.info(`Templates exported to: ${exportPath}`);
      return exportPath;
      
    } catch (error) {
      Logger.error('Failed to export templates', error);
      throw error;
    }
  }

  /**
   * テンプレートをインポート
   */
  async importTemplates(importPath) {
    try {
      const importData = await FileManager.readJSON(importPath);
      
      if (!importData.templates) {
        throw new Error('Invalid import file format');
      }

      for (const [type, template] of Object.entries(importData.templates)) {
        // テンプレートを検証
        if (!template.name || !template.template) {
          Logger.warn(`Skipping invalid template: ${type}`);
          continue;
        }

        // ユーザーテンプレートとして保存
        const userPath = `${this.userTemplatesPath}/${type}.json`;
        await FileManager.writeJSON(userPath, template);
        
        // メモリ内のテンプレートを更新
        this.loadedTemplates.set(type, template);
        this.templateVariables.set(type, template.variables || []);
        
        Logger.info(`Template imported: ${type}`);
      }
      
    } catch (error) {
      Logger.error('Failed to import templates', error);
      throw error;
    }
  }
}

/**
 * グローバルプロンプトマネージャーインスタンス
 */
export const globalPromptManager = new PromptManager();

export default PromptManager;