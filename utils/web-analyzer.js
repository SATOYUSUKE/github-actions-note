/**
 * Web Content Analysis Utilities
 */

import { Logger } from './logger.js';

export class WebAnalyzer {
  /**
   * コンテンツの関連性スコアを計算
   */
  static calculateRelevanceScore(content, theme, keywords = []) {
    try {
      const contentLower = content.toLowerCase();
      const themeLower = theme.toLowerCase();
      
      let score = 0;
      
      // テーマキーワードの出現頻度
      const themeWords = themeLower.split(/\s+/);
      for (const word of themeWords) {
        if (word.length > 2) {
          const occurrences = (contentLower.match(new RegExp(word, 'g')) || []).length;
          score += occurrences * 0.1;
        }
      }
      
      // 追加キーワードの出現頻度
      for (const keyword of keywords) {
        const keywordLower = keyword.toLowerCase();
        const occurrences = (contentLower.match(new RegExp(keywordLower, 'g')) || []).length;
        score += occurrences * 0.15;
      }
      
      // コンテンツの長さによる調整
      const lengthFactor = Math.min(content.length / 1000, 2);
      score *= lengthFactor;
      
      // 0-1の範囲に正規化
      return Math.min(score / 10, 1);
      
    } catch (error) {
      Logger.warn('Failed to calculate relevance score', error);
      return 0.5; // デフォルト値
    }
  }

  /**
   * 情報源の信頼性スコアを計算
   */
  static calculateCredibilityScore(url, title = '', content = '') {
    try {
      let score = 0.5; // ベーススコア
      
      // ドメインベースの信頼性
      const domain = new URL(url).hostname.toLowerCase();
      
      // 高信頼性ドメイン
      const highCredibilityDomains = [
        'wikipedia.org', 'github.com', 'stackoverflow.com',
        'medium.com', 'dev.to', 'techcrunch.com',
        'wired.com', 'arstechnica.com', 'ieee.org',
        'acm.org', 'nature.com', 'science.org',
        'mit.edu', 'stanford.edu', 'harvard.edu',
        'substack.com'
      ];
      
      // 中信頼性ドメイン
      const mediumCredibilityDomains = [
        'qiita.com', 'zenn.dev', 'note.com',
        'blog.', 'tech.', 'engineering.',
        'hashnode.com', 'dev.hashnode.com',
        'hackernoon.com', 'freecodecamp.org',
        'towards.ai', 'towardsdatascience.com',
        'blog.google', 'blog.microsoft.com',
        'aws.amazon.com/blogs', 'cloud.google.com/blog'
      ];
      
      // 低信頼性ドメイン
      const lowCredibilityDomains = [
        'ads.', 'spam.', 'fake.'
      ];
      
      if (highCredibilityDomains.some(d => domain.includes(d))) {
        score += 0.4;
      } else if (mediumCredibilityDomains.some(d => domain.includes(d))) {
        score += 0.2;
      } else if (lowCredibilityDomains.some(d => domain.includes(d))) {
        score -= 0.3;
      }
      
      // HTTPSの使用
      if (url.startsWith('https://')) {
        score += 0.1;
      }
      
      // タイトルの品質
      if (title && title.length > 10 && title.length < 200) {
        score += 0.1;
      }
      
      // コンテンツの品質指標
      if (content) {
        // 適切な長さ
        if (content.length > 500 && content.length < 10000) {
          score += 0.1;
        }
        
        // 構造化されたコンテンツ
        if (content.includes('\n') && content.includes('.')) {
          score += 0.05;
        }
      }
      
      // 0-1の範囲に制限
      return Math.max(0, Math.min(1, score));
      
    } catch (error) {
      Logger.warn('Failed to calculate credibility score', error);
      return 0.5; // デフォルト値
    }
  }

  /**
   * 日付文字列を解析
   */
  static parsePublishDate(dateString) {
    if (!dateString) return null;
    
    try {
      // 一般的な日付形式を試行
      const formats = [
        /(\d{4})-(\d{2})-(\d{2})/,  // YYYY-MM-DD
        /(\d{2})\/(\d{2})\/(\d{4})/, // MM/DD/YYYY
        /(\d{4})年(\d{1,2})月(\d{1,2})日/, // 日本語形式
      ];
      
      for (const format of formats) {
        const match = dateString.match(format);
        if (match) {
          const date = new Date(match[0]);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
          }
        }
      }
      
      // ISO形式を試行
      const isoDate = new Date(dateString);
      if (!isNaN(isoDate.getTime())) {
        return isoDate.toISOString().split('T')[0];
      }
      
      return null;
      
    } catch (error) {
      Logger.warn('Failed to parse publish date', error);
      return null;
    }
  }

  /**
   * キーワードを抽出
   */
  static extractKeywords(content, maxKeywords = 10) {
    try {
      // 基本的なキーワード抽出
      const words = content
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3)
        .filter(word => !this.isStopWord(word));
      
      // 単語の出現頻度を計算
      const frequency = {};
      for (const word of words) {
        frequency[word] = (frequency[word] || 0) + 1;
      }
      
      // 頻度順にソートして上位を返す
      return Object.entries(frequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, maxKeywords)
        .map(([word]) => word);
        
    } catch (error) {
      Logger.warn('Failed to extract keywords', error);
      return [];
    }
  }

  /**
   * ストップワードかどうかを判定
   */
  static isStopWord(word) {
    const stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
      'may', 'might', 'must', 'can', 'shall', 'about', 'into', 'through', 'during',
      'before', 'after', 'above', 'below', 'up', 'down', 'out', 'off', 'over',
      'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where',
      'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other',
      'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
      'too', 'very', 'just', 'now', 'also', 'から', 'まで', 'より', 'として',
      'について', 'において', 'による', 'によって', 'です', 'である', 'だった',
      'します', 'された', 'される', 'という', 'といった', 'ような', 'ように'
    ]);
    
    return stopWords.has(word);
  }

  /**
   * コンテンツの品質を評価
   */
  static assessContentQuality(content) {
    const assessment = {
      length: content.length,
      readability: 0,
      structure: 0,
      informativeness: 0,
      overall: 0
    };

    try {
      // 読みやすさ（文の長さと複雑さ）
      const sentences = content.split(/[.!?。！？]/).filter(s => s.trim().length > 0);
      const avgSentenceLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;
      assessment.readability = Math.max(0, Math.min(1, 1 - (avgSentenceLength - 50) / 100));

      // 構造（段落、見出し、リストの存在）
      const hasStructure = content.includes('\n\n') || content.includes('##') || content.includes('- ');
      assessment.structure = hasStructure ? 0.8 : 0.3;

      // 情報量（キーワードの多様性）
      const keywords = this.extractKeywords(content, 20);
      assessment.informativeness = Math.min(1, keywords.length / 15);

      // 総合評価
      assessment.overall = (assessment.readability + assessment.structure + assessment.informativeness) / 3;

    } catch (error) {
      Logger.warn('Failed to assess content quality', error);
    }

    return assessment;
  }

  /**
   * 検索クエリを生成
   */
  static generateSearchQueries(theme, target, message) {
    const queries = [];
    
    // 基本クエリ
    queries.push(theme);
    
    // ターゲット向けクエリ
    queries.push(`${theme} ${target}`);
    
    // メッセージ関連クエリ
    queries.push(`${theme} ${message}`);
    
    // 最新情報クエリ（2025年対応）
    queries.push(`${theme} 2025 最新`);
    queries.push(`${theme} 2024 トレンド`);
    
    // プラットフォーム特化クエリ
    queries.push(`site:medium.com ${theme} 2024`);
    queries.push(`site:substack.com ${theme}`);
    queries.push(`${theme} blog 最新記事`);
    
    // 技術ブログ・専門サイト特化クエリ
    queries.push(`site:dev.to ${theme}`);
    queries.push(`site:qiita.com ${theme}`);
    queries.push(`site:zenn.dev ${theme}`);
    
    // 統計・データクエリ
    queries.push(`${theme} 統計 データ 2024`);
    
    // 事例・ケーススタディクエリ
    queries.push(`${theme} 事例 成功例 最新`);
    
    // 専門家の意見・分析クエリ
    queries.push(`${theme} 専門家 分析 2024`);
    queries.push(`${theme} 業界動向 レポート`);
    
    return queries.slice(0, 8); // 最大8つのクエリに拡張
  }
}