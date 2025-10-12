/**
 * ワークフローUI支援システム
 * モバイル対応の入力検証、ヘルプテキスト、進捗表示を提供
 */

import { Logger } from './logger.js';
import { FileManager } from './file-manager.js';
import { globalConfig } from './config-manager.js';

/**
 * ワークフローUI支援クラス
 */
export class WorkflowUIHelper {
  constructor() {
    this.validationRules = new Map();
    this.helpTexts = new Map();
    this.setupValidationRules();
    this.setupHelpTexts();
  }

  /**
   * 検証ルールを設定
   */
  setupValidationRules() {
    // テーマの検証
    this.validationRules.set('theme', {
      required: true,
      minLength: 5,
      maxLength: 100,
      pattern: /^[^<>{}]*$/,
      validate: (value) => {
        if (value.length < 5) return '⚠️ テーマは5文字以上で入力してください';
        if (value.length > 100) return '⚠️ テーマは100文字以内で入力してください';
        if (/<|>|\{|\}/.test(value)) return '⚠️ 特殊文字（<>{}）は使用できません';
        return null;
      }
    });

    // 想定読者の検証
    this.validationRules.set('target', {
      required: true,
      minLength: 3,
      maxLength: 50,
      validate: (value) => {
        if (value.length < 3) return '⚠️ 想定読者は3文字以上で入力してください';
        if (value.length > 50) return '⚠️ 想定読者は50文字以内で入力してください';
        return null;
      }
    });

    // メッセージの検証
    this.validationRules.set('message', {
      required: true,
      minLength: 10,
      maxLength: 200,
      validate: (value) => {
        if (value.length < 10) return '⚠️ メッセージは10文字以上で入力してください';
        if (value.length > 200) return '⚠️ メッセージは200文字以内で入力してください';
        return null;
      }
    });

    // CTAの検証
    this.validationRules.set('cta', {
      required: true,
      minLength: 3,
      maxLength: 50,
      validate: (value) => {
        if (value.length < 3) return '⚠️ アクションは3文字以上で入力してください';
        if (value.length > 50) return '⚠️ アクションは50文字以内で入力してください';
        return null;
      }
    });

    // タグの検証
    this.validationRules.set('tags', {
      required: true,
      validate: (value) => {
        const tags = value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        
        if (tags.length === 0) return '⚠️ 最低1つのタグを入力してください';
        if (tags.length > 5) return '⚠️ タグは最大5個まで設定できます';
        
        for (const tag of tags) {
          if (tag.length > 20) return `⚠️ タグ「${tag}」は20文字以内で入力してください`;
          if (!/^[a-zA-Z0-9ぁ-んァ-ヶー一-龯\s]+$/.test(tag)) {
            return `⚠️ タグ「${tag}」に無効な文字が含まれています`;
          }
        }
        
        return null;
      }
    });
  }

  /**
   * ヘルプテキストを設定
   */
  setupHelpTexts() {
    this.helpTexts.set('theme', {
      title: '📝 記事のテーマ',
      description: '記事の主要なトピックを入力してください',
      examples: [
        'AI技術の最新動向',
        'リモートワークの効率化',
        'プログラミング初心者向けガイド',
        'データサイエンス入門'
      ],
      tips: [
        '具体的で興味を引くテーマを選びましょう',
        '読者が検索しそうなキーワードを含めると効果的です',
        '専門用語は想定読者のレベルに合わせて調整しましょう'
      ]
    });

    this.helpTexts.set('target', {
      title: '👥 想定読者',
      description: '記事を読む人の属性や知識レベルを指定してください',
      examples: [
        'エンジニア初心者',
        'マネージャー層',
        '学生・新卒',
        'フリーランサー',
        'IT業界転職希望者'
      ],
      tips: [
        '読者の知識レベルを明確にすると、適切な難易度の記事が生成されます',
        '職業、経験年数、興味分野などを含めると効果的です'
      ]
    });

    this.helpTexts.set('message', {
      title: '💡 伝えたい核メッセージ',
      description: '記事を通じて読者に伝えたい主要なメッセージを入力してください',
      examples: [
        '技術の進歩で生産性向上',
        '継続的な学習の重要性',
        'チームワークが成功の鍵',
        '効率的な時間管理術'
      ],
      tips: [
        '記事全体を通じて一貫したメッセージにしましょう',
        '読者にとって価値のある内容を心がけましょう',
        '行動につながる具体的なメッセージが効果的です'
      ]
    });

    this.helpTexts.set('cta', {
      title: '🎯 読後のアクション',
      description: '記事を読んだ後に読者に取ってもらいたい行動を指定してください',
      examples: [
        '実際に試してみる',
        'チームで議論する',
        '学習計画を立てる',
        'ツールを導入する',
        'スキルアップに取り組む'
      ],
      tips: [
        '具体的で実行しやすいアクションを設定しましょう',
        '読者のレベルに合った難易度にしましょう',
        '記事の内容と関連性の高いアクションが効果的です'
      ]
    });

    this.helpTexts.set('tags', {
      title: '🏷️ タグ',
      description: '記事の内容を表すキーワードをカンマ区切りで入力してください（最大5個）',
      examples: [
        'AI,機械学習,Python',
        'リモートワーク,生産性,ツール',
        'プログラミング,初心者,学習',
        'データ分析,可視化,Excel'
      ],
      tips: [
        'SEO効果を高めるため、検索されやすいキーワードを選びましょう',
        '記事の内容を正確に表すタグを設定しましょう',
        '一般的すぎるタグより、具体的なタグの方が効果的です'
      ]
    });

    this.helpTexts.set('writing_style', {
      title: '✍️ 記事のスタイル',
      description: '記事の文体や書き方のスタイルを選択してください',
      options: {
        casual: {
          name: 'カジュアル',
          description: '親しみやすく、読みやすい文体',
          suitable: '一般読者、初心者向け'
        },
        informative: {
          name: '情報豊富',
          description: '実用的で詳細な情報を含む文体',
          suitable: 'ビジネスパーソン、実務者向け'
        },
        technical: {
          name: '技術的',
          description: '専門用語を使った詳細な技術解説',
          suitable: 'エンジニア、技術者向け'
        },
        academic: {
          name: '学術的',
          description: '厳密で論理的な文体',
          suitable: '研究者、専門家向け'
        }
      }
    });

    this.helpTexts.set('content_length', {
      title: '📏 記事の長さ',
      description: '生成する記事の長さを選択してください',
      options: {
        short: {
          name: '短い',
          description: '1000-1500文字程度',
          suitable: 'サクッと読める記事、概要紹介'
        },
        medium: {
          name: '中程度',
          description: '2000-3000文字程度',
          suitable: '一般的な解説記事、ハウツー'
        },
        long: {
          name: '長い',
          description: '3500-5000文字程度',
          suitable: '詳細な解説、包括的なガイド'
        }
      }
    });

    this.helpTexts.set('research_depth', {
      title: '🔍 リサーチの深度',
      description: '記事作成前のリサーチの詳細さを選択してください',
      options: {
        basic: {
          name: '基本的',
          description: '基本的な情報収集',
          suitable: '簡単な記事、既知のトピック'
        },
        standard: {
          name: '標準的',
          description: '幅広い情報収集と分析',
          suitable: '一般的な記事、バランス重視'
        },
        deep: {
          name: '詳細',
          description: '徹底的な調査と多角的分析',
          suitable: '専門的な記事、新しいトピック'
        }
      }
    });

    this.helpTexts.set('fact_check_level', {
      title: '✅ ファクトチェックの厳密さ',
      description: '記事内容の事実確認の厳密さを選択してください',
      options: {
        basic: {
          name: '基本的',
          description: '主要な事実のみチェック',
          suitable: '一般的な内容、時間重視'
        },
        standard: {
          name: '標準的',
          description: 'バランスの取れた事実確認',
          suitable: '通常の記事、品質重視'
        },
        strict: {
          name: '厳密',
          description: '徹底的な事実確認と検証',
          suitable: '専門的な記事、正確性重視'
        }
      }
    });
  }

  /**
   * 入力値を検証
   */
  validateInput(fieldName, value) {
    const rule = this.validationRules.get(fieldName);
    if (!rule) {
      return { valid: true, message: null };
    }

    // 必須チェック
    if (rule.required && (!value || value.trim().length === 0)) {
      return { valid: false, message: `⚠️ ${fieldName}は必須項目です` };
    }

    // カスタム検証
    if (rule.validate) {
      const message = rule.validate(value);
      if (message) {
        return { valid: false, message };
      }
    }

    return { valid: true, message: null };
  }

  /**
   * 全入力値を検証
   */
  validateAllInputs(inputs) {
    const results = {
      valid: true,
      errors: [],
      warnings: []
    };

    for (const [fieldName, value] of Object.entries(inputs)) {
      const validation = this.validateInput(fieldName, value);
      if (!validation.valid) {
        results.valid = false;
        results.errors.push({
          field: fieldName,
          message: validation.message
        });
      }
    }

    // 追加の整合性チェック
    const consistencyCheck = this.checkInputConsistency(inputs);
    if (consistencyCheck.warnings.length > 0) {
      results.warnings.push(...consistencyCheck.warnings);
    }

    return results;
  }

  /**
   * 入力値の整合性をチェック
   */
  checkInputConsistency(inputs) {
    const warnings = [];

    // テーマと想定読者の整合性
    if (inputs.theme && inputs.target) {
      const theme = inputs.theme.toLowerCase();
      const target = inputs.target.toLowerCase();

      if (theme.includes('技術') && !target.includes('エンジニア') && !target.includes('開発者') && !target.includes('技術者')) {
        warnings.push({
          type: 'consistency',
          message: '💡 技術的なテーマですが、想定読者が技術者以外に設定されています。内容の難易度を調整します。'
        });
      }

      if (theme.includes('初心者') && target.includes('上級') || target.includes('エキスパート')) {
        warnings.push({
          type: 'consistency',
          message: '💡 初心者向けのテーマですが、想定読者が上級者に設定されています。内容レベルを調整します。'
        });
      }
    }

    // スタイルと想定読者の整合性
    if (inputs.writing_style && inputs.target) {
      const style = inputs.writing_style;
      const target = inputs.target.toLowerCase();

      if (style === 'academic' && target.includes('初心者')) {
        warnings.push({
          type: 'style_mismatch',
          message: '💡 学術的なスタイルが選択されていますが、想定読者が初心者です。読みやすさを重視した内容に調整します。'
        });
      }

      if (style === 'casual' && target.includes('専門家') || target.includes('エキスパート')) {
        warnings.push({
          type: 'style_mismatch',
          message: '💡 カジュアルなスタイルが選択されていますが、想定読者が専門家です。適切な専門性を保った内容にします。'
        });
      }
    }

    return { warnings };
  }

  /**
   * ヘルプテキストを取得
   */
  getHelpText(fieldName) {
    return this.helpTexts.get(fieldName) || null;
  }

  /**
   * フィールドの推奨値を生成
   */
  generateSuggestions(fieldName, context = {}) {
    const suggestions = [];

    switch (fieldName) {
      case 'theme':
        if (context.industry) {
          suggestions.push(`${context.industry}業界の最新動向`);
          suggestions.push(`${context.industry}における効率化手法`);
        }
        suggestions.push('AI技術の実践的活用法');
        suggestions.push('リモートワーク成功の秘訣');
        suggestions.push('データ分析入門ガイド');
        break;

      case 'target':
        if (context.theme) {
          const theme = context.theme.toLowerCase();
          if (theme.includes('ai') || theme.includes('技術')) {
            suggestions.push('エンジニア初心者');
            suggestions.push('IT業界転職希望者');
            suggestions.push('技術マネージャー');
          } else if (theme.includes('ビジネス') || theme.includes('経営')) {
            suggestions.push('新任マネージャー');
            suggestions.push('起業家志望者');
            suggestions.push('ビジネスパーソン');
          }
        }
        suggestions.push('学生・新卒');
        suggestions.push('フリーランサー');
        break;

      case 'tags':
        if (context.theme) {
          const theme = context.theme.toLowerCase();
          if (theme.includes('ai')) {
            suggestions.push('AI,機械学習,自動化');
          } else if (theme.includes('プログラミング')) {
            suggestions.push('プログラミング,開発,コーディング');
          } else if (theme.includes('ビジネス')) {
            suggestions.push('ビジネス,効率化,生産性');
          }
        }
        suggestions.push('技術,学習,スキルアップ');
        break;
    }

    return suggestions;
  }

  /**
   * モバイル対応の進捗表示を生成
   */
  generateMobileProgressDisplay(currentStep, totalSteps, stepName, progress = 0) {
    const progressBar = '█'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));
    
    return {
      title: `📱 ステップ ${currentStep}/${totalSteps}: ${stepName}`,
      progressBar: `[${progressBar}] ${progress}%`,
      emoji: this.getStepEmoji(stepName),
      estimatedTime: this.estimateStepTime(stepName)
    };
  }

  /**
   * ステップ用の絵文字を取得
   */
  getStepEmoji(stepName) {
    const emojiMap = {
      'リサーチ': '🔍',
      '記事執筆': '✍️',
      'ファクトチェック': '✅',
      '投稿処理': '📤',
      '完了': '🎉'
    };
    return emojiMap[stepName] || '⚙️';
  }

  /**
   * ステップの推定時間を取得
   */
  estimateStepTime(stepName) {
    const timeMap = {
      'リサーチ': '約2-3分',
      '記事執筆': '約3-4分',
      'ファクトチェック': '約2-3分',
      '投稿処理': '約1-2分'
    };
    return timeMap[stepName] || '約1-2分';
  }

  /**
   * エラーメッセージをモバイル対応形式で生成
   */
  formatMobileErrorMessage(error) {
    return {
      title: '❌ エラーが発生しました',
      message: error.message,
      suggestions: this.generateErrorSuggestions(error),
      actionRequired: this.determineRequiredAction(error)
    };
  }

  /**
   * エラーの提案を生成
   */
  generateErrorSuggestions(error) {
    const suggestions = [];
    
    if (error.message.includes('API')) {
      suggestions.push('🔑 API キーの設定を確認してください');
      suggestions.push('🌐 ネットワーク接続を確認してください');
      suggestions.push('⏰ しばらく待ってから再試行してください');
    }
    
    if (error.message.includes('認証') || error.message.includes('authentication')) {
      suggestions.push('🔐 認証情報を更新してください');
      suggestions.push('📝 ログイン状態を確認してください');
    }
    
    if (error.message.includes('タイムアウト') || error.message.includes('timeout')) {
      suggestions.push('⏰ 処理時間を長めに設定してください');
      suggestions.push('🔄 再試行してください');
    }

    return suggestions;
  }

  /**
   * 必要なアクションを決定
   */
  determineRequiredAction(error) {
    if (error.message.includes('API key')) {
      return 'api_key_update';
    }
    if (error.message.includes('authentication')) {
      return 'login_required';
    }
    if (error.message.includes('quota') || error.message.includes('limit')) {
      return 'wait_and_retry';
    }
    return 'retry';
  }

  /**
   * 成功メッセージをモバイル対応形式で生成
   */
  formatMobileSuccessMessage(result) {
    return {
      title: '🎉 処理が完了しました',
      summary: this.generateResultSummary(result),
      nextSteps: this.generateNextSteps(result),
      shareableLink: result.noteUrl || null
    };
  }

  /**
   * 結果サマリーを生成
   */
  generateResultSummary(result) {
    const summary = [];
    
    if (result.title) {
      summary.push(`📝 タイトル: ${result.title}`);
    }
    
    if (result.wordCount) {
      summary.push(`📊 文字数: ${result.wordCount}文字`);
    }
    
    if (result.qualityScore) {
      summary.push(`⭐ 品質スコア: ${Math.round(result.qualityScore * 100)}%`);
    }
    
    if (result.status) {
      const statusEmoji = result.status === 'published' ? '🌐' : '📝';
      const statusText = result.status === 'published' ? '公開済み' : '下書き保存';
      summary.push(`${statusEmoji} ステータス: ${statusText}`);
    }

    return summary;
  }

  /**
   * 次のステップを生成
   */
  generateNextSteps(result) {
    const steps = [];
    
    if (result.status === 'draft') {
      steps.push('📝 下書きを確認して公開してください');
      steps.push('✏️ 必要に応じて内容を編集してください');
    } else if (result.status === 'published') {
      steps.push('📊 記事のパフォーマンスを監視してください');
      steps.push('💬 読者からのフィードバックを確認してください');
    }
    
    steps.push('🔄 次の記事の企画を検討してください');
    
    return steps;
  }
}

/**
 * グローバルUI支援インスタンス
 */
export const globalUIHelper = new WorkflowUIHelper();

export default WorkflowUIHelper;