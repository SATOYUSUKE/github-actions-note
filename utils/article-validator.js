/**
 * Article Quality Validation Utilities
 */

import { Logger } from './logger.js';

export class ArticleValidator {
  /**
   * 記事の包括的な品質検証
   */
  static validateArticleQuality(article, inputs) {
    Logger.info('Starting comprehensive article quality validation...');
    
    const validation = {
      structure: this.validateStructure(article.content),
      content: this.validateContent(article.content, inputs),
      metadata: this.validateMetadata(article),
      seo: this.validateSEO(article, inputs),
      readability: this.validateReadability(article.content),
      engagement: this.validateEngagement(article.content),
      technical: this.validateTechnical(article)
    };
    
    // 総合品質スコアを計算
    const overallScore = this.calculateOverallScore(validation);
    
    // 改善提案を生成
    const suggestions = this.generateImprovementSuggestions(validation);
    
    const result = {
      validation,
      overallScore,
      suggestions,
      validatedAt: new Date().toISOString()
    };
    
    Logger.info('Article quality validation completed:', {
      overallScore: `${(overallScore * 100).toFixed(1)}%`,
      suggestionsCount: suggestions.length
    });
    
    return result;
  }

  /**
   * 記事構造の検証
   */
  static validateStructure(content) {
    const structure = {
      hasTitle: true, // タイトルは別途管理
      hasIntroduction: false,
      hasConclusion: false,
      hasHeadings: false,
      hasProperHierarchy: false,
      headingCount: 0,
      paragraphCount: 0,
      listCount: 0,
      score: 0
    };

    try {
      // 見出しの検証
      const headings = content.match(/^#{2,3} .+$/gm) || [];
      structure.hasHeadings = headings.length > 0;
      structure.headingCount = headings.length;
      
      // 見出し階層の検証
      const h2Count = (content.match(/^## /gm) || []).length;
      const h3Count = (content.match(/^### /gm) || []).length;
      structure.hasProperHierarchy = h2Count > 0 && h3Count <= h2Count * 3;
      
      // 段落の検証
      const paragraphs = content.split('\n\n').filter(p => 
        p.trim().length > 0 && 
        !p.match(/^#{2,3} /) && 
        !p.match(/^[-*+] /) &&
        !p.match(/^```/)
      );
      structure.paragraphCount = paragraphs.length;
      
      // 導入部の検証（最初の段落が十分な長さ）
      if (paragraphs.length > 0 && paragraphs[0].length > 100) {
        structure.hasIntroduction = true;
      }
      
      // 結論部の検証（最後の段落または「まとめ」見出し）
      const hasConclusion = content.includes('まとめ') || 
                           content.includes('結論') || 
                           content.includes('おわりに') ||
                           (paragraphs.length > 0 && paragraphs[paragraphs.length - 1].length > 50);
      structure.hasConclusion = hasConclusion;
      
      // リストの検証
      const lists = content.match(/^[-*+] .+$/gm) || [];
      structure.listCount = lists.length;
      
      // 構造スコアの計算
      let score = 0;
      if (structure.hasIntroduction) score += 0.2;
      if (structure.hasConclusion) score += 0.2;
      if (structure.hasHeadings) score += 0.2;
      if (structure.hasProperHierarchy) score += 0.2;
      if (structure.paragraphCount >= 3) score += 0.1;
      if (structure.listCount > 0) score += 0.1;
      
      structure.score = score;
      
    } catch (error) {
      Logger.warn('Failed to validate article structure', error);
      structure.score = 0.3; // デフォルトスコア
    }
    
    return structure;
  }

  /**
   * コンテンツ品質の検証
   */
  static validateContent(content, inputs) {
    const contentValidation = {
      length: content.length,
      wordCount: 0,
      sentenceCount: 0,
      avgSentenceLength: 0,
      keywordDensity: 0,
      topicCoverage: 0,
      originalityScore: 0,
      factualAccuracy: 0,
      score: 0
    };

    try {
      // 基本統計
      const words = content.split(/\s+/).filter(w => w.length > 0);
      contentValidation.wordCount = words.length;
      
      const sentences = content.split(/[.!?。！？]/).filter(s => s.trim().length > 0);
      contentValidation.sentenceCount = sentences.length;
      contentValidation.avgSentenceLength = sentences.length > 0 ? 
        words.length / sentences.length : 0;
      
      // キーワード密度
      contentValidation.keywordDensity = this.calculateKeywordDensity(content, inputs.theme);
      
      // トピックカバレッジ
      contentValidation.topicCoverage = this.calculateTopicCoverage(content, inputs);
      
      // 独創性スコア（簡易版）
      contentValidation.originalityScore = this.calculateOriginalityScore(content);
      
      // 事実の正確性（基本チェック）
      contentValidation.factualAccuracy = this.checkFactualAccuracy(content);
      
      // コンテンツスコアの計算
      let score = 0;
      
      // 適切な長さ（1500-4000文字）
      if (contentValidation.length >= 1500 && contentValidation.length <= 4000) {
        score += 0.25;
      } else if (contentValidation.length >= 800 && contentValidation.length <= 6000) {
        score += 0.15;
      }
      
      // 適切な文の長さ
      if (contentValidation.avgSentenceLength >= 10 && contentValidation.avgSentenceLength <= 25) {
        score += 0.15;
      }
      
      // キーワード密度
      score += contentValidation.keywordDensity * 0.2;
      
      // トピックカバレッジ
      score += contentValidation.topicCoverage * 0.2;
      
      // 独創性
      score += contentValidation.originalityScore * 0.1;
      
      // 事実の正確性
      score += contentValidation.factualAccuracy * 0.1;
      
      contentValidation.score = Math.min(1, score);
      
    } catch (error) {
      Logger.warn('Failed to validate content quality', error);
      contentValidation.score = 0.5;
    }
    
    return contentValidation;
  }

  /**
   * メタデータの検証
   */
  static validateMetadata(article) {
    const metadata = {
      hasTitle: !!article.title,
      titleLength: article.title?.length || 0,
      hasSummary: !!article.summary,
      summaryLength: article.summary?.length || 0,
      hasKeyPoints: !!(article.keyPoints && article.keyPoints.length > 0),
      keyPointsCount: article.keyPoints?.length || 0,
      hasTags: !!(article.tags && article.tags.length > 0),
      tagsCount: article.tags?.length || 0,
      hasCallToAction: !!article.callToAction,
      score: 0
    };

    let score = 0;
    
    // タイトル
    if (metadata.hasTitle && metadata.titleLength >= 15 && metadata.titleLength <= 50) {
      score += 0.25;
    } else if (metadata.hasTitle && metadata.titleLength >= 10 && metadata.titleLength <= 70) {
      score += 0.15;
    }
    
    // 要約
    if (metadata.hasSummary && metadata.summaryLength >= 50 && metadata.summaryLength <= 300) {
      score += 0.2;
    }
    
    // 重要ポイント
    if (metadata.hasKeyPoints && metadata.keyPointsCount >= 3 && metadata.keyPointsCount <= 5) {
      score += 0.2;
    }
    
    // タグ
    if (metadata.hasTags && metadata.tagsCount >= 3 && metadata.tagsCount <= 5) {
      score += 0.2;
    }
    
    // CTA
    if (metadata.hasCallToAction) {
      score += 0.15;
    }
    
    metadata.score = score;
    return metadata;
  }

  /**
   * SEO品質の検証
   */
  static validateSEO(article, inputs) {
    const seo = {
      titleOptimization: 0,
      keywordPlacement: 0,
      headingStructure: 0,
      contentLength: 0,
      internalStructure: 0,
      score: 0
    };

    try {
      const content = article.content;
      const title = article.title;
      const theme = inputs.theme;
      
      // タイトル最適化
      if (title && title.includes(theme.split(' ')[0])) {
        seo.titleOptimization = 0.8;
      } else if (title) {
        seo.titleOptimization = 0.4;
      }
      
      // キーワード配置
      const firstParagraph = content.split('\n\n')[0] || '';
      if (firstParagraph.toLowerCase().includes(theme.toLowerCase())) {
        seo.keywordPlacement += 0.5;
      }
      
      const headings = content.match(/^#{2,3} .+$/gm) || [];
      const keywordInHeadings = headings.some(h => 
        h.toLowerCase().includes(theme.toLowerCase())
      );
      if (keywordInHeadings) {
        seo.keywordPlacement += 0.3;
      }
      
      // 見出し構造
      const h2Count = (content.match(/^## /gm) || []).length;
      const h3Count = (content.match(/^### /gm) || []).length;
      if (h2Count >= 2 && h2Count <= 6) {
        seo.headingStructure = 0.8;
      } else if (h2Count >= 1) {
        seo.headingStructure = 0.5;
      }
      
      // コンテンツ長
      if (content.length >= 1500 && content.length <= 4000) {
        seo.contentLength = 1.0;
      } else if (content.length >= 800) {
        seo.contentLength = 0.7;
      }
      
      // 内部構造
      const hasLists = content.includes('- ');
      const hasQuotes = content.includes('> ');
      const hasCode = content.includes('`');
      const structureElements = [hasLists, hasQuotes, hasCode].filter(Boolean).length;
      seo.internalStructure = Math.min(1, structureElements / 2);
      
      // SEOスコア計算
      seo.score = (
        seo.titleOptimization * 0.3 +
        seo.keywordPlacement * 0.25 +
        seo.headingStructure * 0.2 +
        seo.contentLength * 0.15 +
        seo.internalStructure * 0.1
      );
      
    } catch (error) {
      Logger.warn('Failed to validate SEO quality', error);
      seo.score = 0.5;
    }
    
    return seo;
  }

  /**
   * 読みやすさの検証
   */
  static validateReadability(content) {
    const readability = {
      avgSentenceLength: 0,
      avgWordLength: 0,
      paragraphLength: 0,
      transitionWords: 0,
      passiveVoice: 0,
      complexWords: 0,
      score: 0
    };

    try {
      const sentences = content.split(/[.!?。！？]/).filter(s => s.trim().length > 0);
      const words = content.split(/\s+/).filter(w => w.length > 0);
      const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
      
      // 平均文長
      readability.avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : 0;
      
      // 平均語長
      const totalChars = words.join('').length;
      readability.avgWordLength = words.length > 0 ? totalChars / words.length : 0;
      
      // 段落長
      const avgParagraphLength = paragraphs.length > 0 ? 
        paragraphs.reduce((sum, p) => sum + p.length, 0) / paragraphs.length : 0;
      readability.paragraphLength = avgParagraphLength;
      
      // 接続詞の使用
      const transitionWords = ['しかし', 'また', 'さらに', 'そして', 'つまり', 'したがって', 'ただし'];
      const transitionCount = transitionWords.reduce((count, word) => 
        count + (content.match(new RegExp(word, 'g')) || []).length, 0
      );
      readability.transitionWords = Math.min(1, transitionCount / sentences.length * 10);
      
      // 読みやすさスコア計算
      let score = 0;
      
      // 適切な文長（10-25語）
      if (readability.avgSentenceLength >= 10 && readability.avgSentenceLength <= 25) {
        score += 0.3;
      } else if (readability.avgSentenceLength >= 5 && readability.avgSentenceLength <= 35) {
        score += 0.2;
      }
      
      // 適切な段落長（100-300文字）
      if (avgParagraphLength >= 100 && avgParagraphLength <= 300) {
        score += 0.3;
      }
      
      // 接続詞の適切な使用
      score += readability.transitionWords * 0.2;
      
      // その他の要素
      score += 0.2; // ベーススコア
      
      readability.score = Math.min(1, score);
      
    } catch (error) {
      Logger.warn('Failed to validate readability', error);
      readability.score = 0.6;
    }
    
    return readability;
  }

  /**
   * エンゲージメント要素の検証
   */
  static validateEngagement(content) {
    const engagement = {
      hasQuestions: false,
      hasCallouts: false,
      hasExamples: false,
      hasPersonalTouch: false,
      hasActionableContent: false,
      emotionalWords: 0,
      score: 0
    };

    try {
      // 質問の存在
      engagement.hasQuestions = content.includes('？') || content.includes('?') || 
                               content.includes('でしょうか') || content.includes('ますか');
      
      // 呼びかけの存在
      const callouts = ['皆さん', 'あなた', '読者', 'みなさん'];
      engagement.hasCallouts = callouts.some(word => content.includes(word));
      
      // 具体例の存在
      const exampleWords = ['例えば', '具体的に', '実際に', 'ケース', '事例'];
      engagement.hasExamples = exampleWords.some(word => content.includes(word));
      
      // 個人的な要素
      const personalWords = ['私', '筆者', '経験', '感じ', '思い'];
      engagement.hasPersonalTouch = personalWords.some(word => content.includes(word));
      
      // 行動を促す内容
      const actionWords = ['試し', '実践', '始め', '取り組', 'やってみ', 'チャレンジ'];
      engagement.hasActionableContent = actionWords.some(word => content.includes(word));
      
      // 感情的な言葉
      const emotionalWords = ['素晴らしい', '驚く', '感動', '興味深い', '魅力的', '重要', '必要'];
      const emotionalCount = emotionalWords.reduce((count, word) => 
        count + (content.match(new RegExp(word, 'g')) || []).length, 0
      );
      engagement.emotionalWords = Math.min(1, emotionalCount / 10);
      
      // エンゲージメントスコア計算
      let score = 0;
      if (engagement.hasQuestions) score += 0.2;
      if (engagement.hasCallouts) score += 0.15;
      if (engagement.hasExamples) score += 0.2;
      if (engagement.hasPersonalTouch) score += 0.15;
      if (engagement.hasActionableContent) score += 0.2;
      score += engagement.emotionalWords * 0.1;
      
      engagement.score = Math.min(1, score);
      
    } catch (error) {
      Logger.warn('Failed to validate engagement', error);
      engagement.score = 0.5;
    }
    
    return engagement;
  }

  /**
   * 技術的品質の検証
   */
  static validateTechnical(article) {
    const technical = {
      hasValidJSON: true,
      hasRequiredFields: true,
      contentFormatting: 0,
      tagValidation: 0,
      metadataCompleteness: 0,
      score: 0
    };

    try {
      // 必須フィールドの検証
      const requiredFields = ['title', 'content', 'tags'];
      technical.hasRequiredFields = requiredFields.every(field => 
        article[field] !== undefined && article[field] !== null
      );
      
      // コンテンツフォーマットの検証
      const content = article.content;
      const hasProperMarkdown = content.includes('## ') || content.includes('### ');
      const hasProperLineBreaks = !content.includes('\n\n\n\n');
      const hasValidChars = !/[<>]/.test(content);
      
      let formatScore = 0;
      if (hasProperMarkdown) formatScore += 0.4;
      if (hasProperLineBreaks) formatScore += 0.3;
      if (hasValidChars) formatScore += 0.3;
      technical.contentFormatting = formatScore;
      
      // タグの検証
      if (article.tags && Array.isArray(article.tags)) {
        const validTags = article.tags.filter(tag => 
          typeof tag === 'string' && tag.length > 0 && tag.length <= 20
        );
        technical.tagValidation = validTags.length / Math.max(1, article.tags.length);
      }
      
      // メタデータの完全性
      const metadataFields = ['summary', 'keyPoints', 'targetAudience', 'callToAction'];
      const presentFields = metadataFields.filter(field => 
        article[field] !== undefined && article[field] !== null
      );
      technical.metadataCompleteness = presentFields.length / metadataFields.length;
      
      // 技術スコア計算
      let score = 0;
      if (technical.hasValidJSON) score += 0.2;
      if (technical.hasRequiredFields) score += 0.3;
      score += technical.contentFormatting * 0.2;
      score += technical.tagValidation * 0.15;
      score += technical.metadataCompleteness * 0.15;
      
      technical.score = score;
      
    } catch (error) {
      Logger.warn('Failed to validate technical quality', error);
      technical.score = 0.6;
    }
    
    return technical;
  }

  /**
   * 総合品質スコアを計算
   */
  static calculateOverallScore(validation) {
    const weights = {
      structure: 0.2,
      content: 0.25,
      metadata: 0.15,
      seo: 0.15,
      readability: 0.15,
      engagement: 0.05,
      technical: 0.05
    };

    let totalScore = 0;
    for (const [category, weight] of Object.entries(weights)) {
      if (validation[category] && validation[category].score !== undefined) {
        totalScore += validation[category].score * weight;
      }
    }

    return Math.min(1, totalScore);
  }

  /**
   * 改善提案を生成
   */
  static generateImprovementSuggestions(validation) {
    const suggestions = [];

    // 構造の改善
    if (validation.structure.score < 0.7) {
      if (!validation.structure.hasIntroduction) {
        suggestions.push({
          category: 'structure',
          priority: 'high',
          suggestion: '記事の導入部分を充実させることをお勧めします。読者の関心を引く導入文を追加してください。'
        });
      }
      if (!validation.structure.hasConclusion) {
        suggestions.push({
          category: 'structure',
          priority: 'high',
          suggestion: 'まとめや結論部分を追加して、記事の要点を整理してください。'
        });
      }
      if (validation.structure.headingCount < 2) {
        suggestions.push({
          category: 'structure',
          priority: 'medium',
          suggestion: '見出しを追加して記事の構造を明確にしてください。'
        });
      }
    }

    // コンテンツの改善
    if (validation.content.score < 0.7) {
      if (validation.content.length < 1500) {
        suggestions.push({
          category: 'content',
          priority: 'high',
          suggestion: 'コンテンツの量を増やして、より詳細な情報を提供してください。'
        });
      }
      if (validation.content.keywordDensity < 0.5) {
        suggestions.push({
          category: 'content',
          priority: 'medium',
          suggestion: 'メインテーマに関連するキーワードをより多く含めてください。'
        });
      }
    }

    // SEOの改善
    if (validation.seo.score < 0.7) {
      if (validation.seo.titleOptimization < 0.6) {
        suggestions.push({
          category: 'seo',
          priority: 'high',
          suggestion: 'タイトルにメインキーワードを含めて、SEO効果を高めてください。'
        });
      }
      if (validation.seo.headingStructure < 0.6) {
        suggestions.push({
          category: 'seo',
          priority: 'medium',
          suggestion: '見出し構造を改善して、検索エンジンにとって理解しやすい構造にしてください。'
        });
      }
    }

    // 読みやすさの改善
    if (validation.readability.score < 0.7) {
      suggestions.push({
        category: 'readability',
        priority: 'medium',
        suggestion: '文章の長さや段落の構成を調整して、読みやすさを向上させてください。'
      });
    }

    // エンゲージメントの改善
    if (validation.engagement.score < 0.5) {
      suggestions.push({
        category: 'engagement',
        priority: 'low',
        suggestion: '読者との対話的な要素（質問、具体例、行動促進）を追加してください。'
      });
    }

    return suggestions;
  }

  /**
   * キーワード密度を計算
   */
  static calculateKeywordDensity(content, theme) {
    try {
      const contentLower = content.toLowerCase();
      const themeLower = theme.toLowerCase();
      const words = contentLower.split(/\s+/).filter(w => w.length > 0);
      
      if (words.length === 0) return 0;
      
      const themeWords = themeLower.split(/\s+/);
      let keywordCount = 0;
      
      for (const themeWord of themeWords) {
        if (themeWord.length > 2) {
          keywordCount += (contentLower.match(new RegExp(themeWord, 'g')) || []).length;
        }
      }
      
      const density = keywordCount / words.length;
      
      // 理想的な密度は1-3%
      if (density >= 0.01 && density <= 0.03) {
        return 1;
      } else if (density >= 0.005 && density <= 0.05) {
        return 0.7;
      } else {
        return Math.max(0, 1 - Math.abs(density - 0.02) / 0.02);
      }
      
    } catch (error) {
      return 0.5;
    }
  }

  /**
   * トピックカバレッジを計算
   */
  static calculateTopicCoverage(content, inputs) {
    try {
      const contentLower = content.toLowerCase();
      
      // 基本トピック要素
      const topicElements = [
        inputs.theme.toLowerCase(),
        inputs.target.toLowerCase(),
        inputs.message.toLowerCase()
      ];
      
      let coverage = 0;
      for (const element of topicElements) {
        if (contentLower.includes(element)) {
          coverage += 0.33;
        }
      }
      
      return Math.min(1, coverage);
      
    } catch (error) {
      return 0.5;
    }
  }

  /**
   * 独創性スコアを計算（簡易版）
   */
  static calculateOriginalityScore(content) {
    try {
      // 語彙の多様性
      const words = content.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      const uniqueWords = new Set(words);
      const diversity = uniqueWords.size / Math.max(1, words.length);
      
      // 文の多様性（文の長さのばらつき）
      const sentences = content.split(/[.!?。！？]/).filter(s => s.trim().length > 0);
      const sentenceLengths = sentences.map(s => s.length);
      const avgLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
      const variance = sentenceLengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / sentenceLengths.length;
      const sentenceDiversity = Math.min(1, variance / 1000);
      
      return (diversity + sentenceDiversity) / 2;
      
    } catch (error) {
      return 0.6;
    }
  }

  /**
   * 事実の正確性をチェック（基本版）
   */
  static checkFactualAccuracy(content) {
    try {
      // 基本的な事実チェック要素
      let accuracy = 0.7; // ベーススコア
      
      // 数値データの存在
      const hasNumbers = /\d+/.test(content);
      if (hasNumbers) accuracy += 0.1;
      
      // 日付の存在
      const hasDates = /20\d{2}年|20\d{2}/.test(content);
      if (hasDates) accuracy += 0.1;
      
      // 引用や参考文献の言及
      const hasReferences = content.includes('によると') || content.includes('調査') || content.includes('研究');
      if (hasReferences) accuracy += 0.1;
      
      return Math.min(1, accuracy);
      
    } catch (error) {
      return 0.7;
    }
  }
}