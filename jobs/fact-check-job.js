/**
 * Fact Check Job - Tavily APIを使用した記事のファクトチェック
 */

import { Logger } from '../utils/logger.js';
import { FileManager } from '../utils/file-manager.js';
import { EnvValidator } from '../utils/env-validator.js';
import { FactCheckAnalyzer } from '../utils/fact-check-analyzer.js';

class FactCheckJob {
  constructor() {
    this.tavilyApiKey = process.env.TAVILY_API_KEY;
    this.tavilyBaseUrl = 'https://api.tavily.com';
  }

  /**
   * メインの実行関数
   */
  async execute() {
    try {
      Logger.jobStart('Fact Check Job');
      
      // 環境変数の検証
      EnvValidator.validateTavilyKey();
      
      // 入力データの読み込み
      const inputs = await this.loadInputs();
      Logger.info('Fact check inputs loaded:', {
        hasArticle: !!inputs.article,
        hasResearchReport: !!inputs.researchReport,
        articleTitle: inputs.article?.title
      });
      
      // ファクトチェックの実行
      const factCheckResult = await this.performFactCheck(inputs);
      
      // 記事の修正
      const correctedArticle = await this.correctArticle(inputs.article, factCheckResult);
      
      // 結果の保存
      await this.saveResults(correctedArticle, factCheckResult);
      
      Logger.jobComplete('Fact Check Job', { 
        checkedClaims: factCheckResult.checkedClaims.length,
        corrections: factCheckResult.corrections.length,
        overallScore: `${(factCheckResult.overallScore * 100).toFixed(1)}%`
      });
      
    } catch (error) {
      Logger.jobError('Fact Check Job', error);
      process.exit(1);
    }
  }

  /**
   * 入力データを読み込み
   */
  async loadInputs() {
    try {
      // 記事データを読み込み
      const article = await FileManager.readJSON('inputs/article-draft.json');
      
      // リサーチレポートを読み込み（参考情報として）
      let researchReport = null;
      try {
        researchReport = await FileManager.readJSON('inputs/research-report.json');
      } catch (error) {
        Logger.warn('Research report not found, proceeding without it');
      }
      
      return {
        article,
        researchReport
      };
      
    } catch (error) {
      Logger.error('Failed to load inputs', error);
      throw new Error(`Input loading failed: ${error.message}`);
    }
  }

  /**
   * ファクトチェックを実行
   */
  async performFactCheck(inputs) {
    Logger.info('Starting fact check process...');
    
    try {
      // 記事から検証すべき主張を抽出（高度な抽出を使用）
      const content = inputs.article.content || inputs.article.originalArticle?.content || '';
      const advancedClaims = FactCheckAnalyzer.extractAdvancedClaims(content);
      const basicClaims = this.extractClaims(inputs.article);
      
      // 高度な抽出と基本抽出を組み合わせ
      const allClaims = [...advancedClaims, ...basicClaims];
      const uniqueClaims = allClaims.filter((claim, index, self) => 
        self.findIndex(c => c.text === claim.text) === index
      ).slice(0, 12); // 最大12個
      
      Logger.info(`Extracted ${uniqueClaims.length} claims for verification (${advancedClaims.length} advanced, ${basicClaims.length} basic)`);
      
      // 各主張をTavily APIで検証
      const checkedClaims = [];
      const corrections = [];
      
      for (let i = 0; i < uniqueClaims.length; i++) {
        const claim = uniqueClaims[i];
        Logger.info(`Checking claim ${i + 1}/${uniqueClaims.length}: ${claim.text.substring(0, 100)}...`);
        
        try {
          const verification = await this.verifyClaim(claim);
          checkedClaims.push(verification);
          
          // 修正が必要な場合
          if (verification.needsCorrection) {
            corrections.push({
              original: claim.text,
              corrected: verification.suggestedCorrection,
              reason: verification.reason,
              confidence: verification.confidence
            });
          }
          
          // API制限を考慮して少し待機
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          Logger.warn(`Failed to verify claim: ${claim.text.substring(0, 50)}...`, error);
          
          // エラーの場合は未検証として記録
          checkedClaims.push({
            claim: claim.text,
            verification: 'unverifiable',
            confidence: 0,
            sources: [],
            reason: `Verification failed: ${error.message}`
          });
        }
      }
      
      // 詳細な検証結果分析を実行
      const detailedAnalysis = FactCheckAnalyzer.analyzeVerificationResults(checkedClaims);
      
      // 修正の品質評価
      const correctionQuality = FactCheckAnalyzer.evaluateCorrectionQuality(corrections);
      
      // 全体的な信頼性スコアを計算
      const overallScore = Math.max(
        this.calculateOverallScore(checkedClaims),
        detailedAnalysis.overallReliability
      );
      
      const factCheckResult = {
        checkedClaims,
        corrections,
        overallScore,
        verificationSources: this.collectVerificationSources(checkedClaims),
        detailedAnalysis,
        correctionQuality,
        checkedAt: new Date().toISOString(),
        claimsCount: uniqueClaims.length,
        verifiedCount: checkedClaims.filter(c => c.verification === 'verified').length,
        disputedCount: checkedClaims.filter(c => c.verification === 'disputed').length,
        unverifiableCount: checkedClaims.filter(c => c.verification === 'unverifiable').length
      };
      
      Logger.info('Fact check completed:', {
        totalClaims: factCheckResult.claimsCount,
        verified: factCheckResult.verifiedCount,
        disputed: factCheckResult.disputedCount,
        unverifiable: factCheckResult.unverifiableCount,
        corrections: corrections.length
      });
      
      return factCheckResult;
      
    } catch (error) {
      Logger.error('Fact check process failed', error);
      throw error;
    }
  }

  /**
   * 記事から検証すべき主張を抽出
   */
  extractClaims(article) {
    const claims = [];
    const content = article.content || article.originalArticle?.content || '';
    
    try {
      // 数値を含む文
      const numericalClaims = content.match(/[^.!?。！？]*\d+[^.!?。！？]*[.!?。！？]/g) || [];
      numericalClaims.forEach(claim => {
        claims.push({
          text: claim.trim(),
          type: 'numerical',
          confidence: 0.8
        });
      });
      
      // 日付を含む文
      const dateClaims = content.match(/[^.!?。！？]*20\d{2}年?[^.!?。！？]*[.!?。！？]/g) || [];
      dateClaims.forEach(claim => {
        claims.push({
          text: claim.trim(),
          type: 'temporal',
          confidence: 0.9
        });
      });
      
      // 統計や調査結果を示す文
      const statisticalPatterns = [
        /[^.!?。！？]*調査[^.!?。！？]*[.!?。！？]/g,
        /[^.!?。！？]*研究[^.!?。！？]*[.!?。！？]/g,
        /[^.!?。！？]*報告[^.!?。！？]*[.!?。！？]/g,
        /[^.!?。！？]*データ[^.!?。！？]*[.!?。！？]/g,
        /[^.!?。！？]*統計[^.!?。！？]*[.!?。！？]/g
      ];
      
      statisticalPatterns.forEach(pattern => {
        const matches = content.match(pattern) || [];
        matches.forEach(claim => {
          claims.push({
            text: claim.trim(),
            type: 'statistical',
            confidence: 0.9
          });
        });
      });
      
      // 断定的な主張
      const assertivePatterns = [
        /[^.!?。！？]*である[.!?。！？]/g,
        /[^.!?。！？]*です[.!?。！？]/g,
        /[^.!?。！？]*ことが分かっ[^.!?。！？]*[.!?。！？]/g,
        /[^.!?。！？]*ことが判明[^.!?。！？]*[.!?。！？]/g
      ];
      
      assertivePatterns.forEach(pattern => {
        const matches = content.match(pattern) || [];
        matches.forEach(claim => {
          claims.push({
            text: claim.trim(),
            type: 'assertive',
            confidence: 0.7
          });
        });
      });
      
      // 重複を除去し、長さでフィルタリング
      const uniqueClaims = claims
        .filter((claim, index, self) => 
          self.findIndex(c => c.text === claim.text) === index
        )
        .filter(claim => claim.text.length > 20 && claim.text.length < 300)
        .slice(0, 10); // 最大10個の主張をチェック
      
      return uniqueClaims;
      
    } catch (error) {
      Logger.warn('Failed to extract claims', error);
      return [];
    }
  }

  /**
   * Tavily APIを使用して主張を検証
   */
  async verifyClaim(claim) {
    try {
      // Tavily APIで検索
      const searchResults = await this.searchWithTavily(claim.text);
      
      // 検索結果を分析して検証結果を判定
      const verification = this.analyzeSearchResults(claim, searchResults);
      
      return verification;
      
    } catch (error) {
      Logger.warn('Tavily API verification failed', error);
      throw error;
    }
  }

  /**
   * Tavily APIで検索を実行
   */
  async searchWithTavily(query) {
    try {
      const response = await fetch(`${this.tavilyBaseUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.tavilyApiKey}`
        },
        body: JSON.stringify({
          query,
          search_depth: 'advanced',
          include_answer: true,
          include_raw_content: false,
          max_results: 5,
          include_domains: [],
          exclude_domains: ['ads.', 'spam.']
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Tavily API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data;
      
    } catch (error) {
      Logger.error('Tavily API request failed', error);
      throw error;
    }
  }

  /**
   * 検索結果を分析して検証結果を判定
   */
  analyzeSearchResults(claim, searchResults) {
    try {
      const verification = {
        claim: claim.text,
        verification: 'unverifiable',
        confidence: 0,
        sources: [],
        reason: '',
        needsCorrection: false,
        suggestedCorrection: null
      };

      // 検索結果が存在しない場合
      if (!searchResults.results || searchResults.results.length === 0) {
        verification.reason = '関連する情報が見つかりませんでした';
        return verification;
      }

      // 検索結果から関連性の高い情報を抽出
      const relevantResults = searchResults.results.filter(result => 
        result.score > 0.7 && result.content && result.content.length > 50
      );

      if (relevantResults.length === 0) {
        verification.reason = '十分に関連性の高い情報が見つかりませんでした';
        return verification;
      }

      // ソース情報を記録
      verification.sources = relevantResults.map(result => ({
        url: result.url,
        title: result.title,
        content: result.content.substring(0, 200),
        score: result.score
      }));

      // Tavily APIの回答を利用
      if (searchResults.answer) {
        const answer = searchResults.answer.toLowerCase();
        const claimLower = claim.text.toLowerCase();
        
        // 簡単な一致度チェック
        const keyWords = this.extractKeyWords(claimLower);
        const matchingWords = keyWords.filter(word => answer.includes(word));
        const matchRatio = matchingWords.length / Math.max(1, keyWords.length);
        
        if (matchRatio > 0.6) {
          verification.verification = 'verified';
          verification.confidence = Math.min(0.9, matchRatio + 0.2);
          verification.reason = 'Tavily APIの回答と一致する情報が見つかりました';
        } else if (matchRatio > 0.3) {
          verification.verification = 'disputed';
          verification.confidence = 0.6;
          verification.reason = 'Tavily APIの回答と部分的に一致しますが、相違点があります';
          verification.needsCorrection = true;
          verification.suggestedCorrection = this.generateCorrection(claim.text, searchResults.answer);
        } else {
          verification.verification = 'disputed';
          verification.confidence = 0.4;
          verification.reason = 'Tavily APIの回答と大きく異なる内容です';
          verification.needsCorrection = true;
          verification.suggestedCorrection = this.generateCorrection(claim.text, searchResults.answer);
        }
      } else {
        // 回答がない場合は、検索結果の内容を基に判定
        verification.verification = 'verified';
        verification.confidence = 0.7;
        verification.reason = '関連する情報源が見つかりました';
      }

      return verification;
      
    } catch (error) {
      Logger.warn('Failed to analyze search results', error);
      return {
        claim: claim.text,
        verification: 'unverifiable',
        confidence: 0,
        sources: [],
        reason: `分析エラー: ${error.message}`,
        needsCorrection: false,
        suggestedCorrection: null
      };
    }
  }

  /**
   * キーワードを抽出
   */
  extractKeyWords(text) {
    return text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !this.isStopWord(word))
      .slice(0, 10);
  }

  /**
   * ストップワードかどうかを判定
   */
  isStopWord(word) {
    const stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'です', 'である', 'だった', 'します', 'された', 'される', 'という', 'といった',
      'ような', 'ように', 'から', 'まで', 'より', 'として', 'について', 'において'
    ]);
    
    return stopWords.has(word.toLowerCase());
  }

  /**
   * 修正案を生成
   */
  generateCorrection(originalClaim, tavilyAnswer) {
    try {
      // 簡単な修正案生成（実際の実装ではより高度な処理が必要）
      const correction = `${originalClaim} (注: 最新の情報によると、${tavilyAnswer.substring(0, 100)}...)`;
      return correction;
    } catch (error) {
      return originalClaim;
    }
  }

  /**
   * 全体的な信頼性スコアを計算
   */
  calculateOverallScore(checkedClaims) {
    if (checkedClaims.length === 0) return 0.5;
    
    const totalConfidence = checkedClaims.reduce((sum, claim) => {
      if (claim.verification === 'verified') {
        return sum + claim.confidence;
      } else if (claim.verification === 'disputed') {
        return sum + (claim.confidence * 0.5);
      } else {
        return sum + 0.3; // unverifiable
      }
    }, 0);
    
    return totalConfidence / checkedClaims.length;
  }

  /**
   * 検証ソースを収集
   */
  collectVerificationSources(checkedClaims) {
    const allSources = [];
    
    checkedClaims.forEach(claim => {
      if (claim.sources && Array.isArray(claim.sources)) {
        allSources.push(...claim.sources);
      }
    });
    
    // 重複を除去してスコア順にソート
    const uniqueSources = allSources
      .filter((source, index, self) => 
        self.findIndex(s => s.url === source.url) === index
      )
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 10);
    
    return uniqueSources;
  }

  /**
   * 記事を修正
   */
  async correctArticle(article, factCheckResult) {
    Logger.info('Applying corrections to article...');
    
    try {
      let correctedContent = article.content || article.originalArticle?.content || '';
      let correctionCount = 0;
      const appliedCorrections = [];
      const skippedCorrections = [];
      
      // 修正を信頼度順にソート
      const sortedCorrections = [...factCheckResult.corrections].sort((a, b) => b.confidence - a.confidence);
      
      // 修正が必要な項目を適用
      for (const correction of sortedCorrections) {
        if (correction.confidence >= 0.7) {
          // 高い信頼度の修正のみ適用
          const beforeLength = correctedContent.length;
          correctedContent = correctedContent.replace(
            correction.original,
            correction.corrected
          );
          
          // 実際に置換されたかチェック
          if (correctedContent.length !== beforeLength || !correctedContent.includes(correction.original)) {
            correctionCount++;
            appliedCorrections.push(correction);
          } else {
            skippedCorrections.push({
              ...correction,
              reason: 'Text not found for replacement'
            });
          }
        } else {
          skippedCorrections.push({
            ...correction,
            reason: 'Low confidence score'
          });
        }
      }
      
      // 最終検証を実行
      const finalValidation = await this.performFinalValidation(correctedContent, factCheckResult);
      
      // 修正された記事を作成
      const correctedArticle = {
        ...article,
        content: correctedContent,
        factCheck: {
          checked: true,
          checkedAt: factCheckResult.checkedAt,
          overallScore: factCheckResult.overallScore,
          correctionsApplied: correctionCount,
          totalCorrections: factCheckResult.corrections.length,
          claimsVerified: factCheckResult.verifiedCount,
          claimsDisputed: factCheckResult.disputedCount,
          claimsUnverifiable: factCheckResult.unverifiableCount,
          appliedCorrections,
          skippedCorrections,
          detailedAnalysis: factCheckResult.detailedAnalysis,
          correctionQuality: factCheckResult.correctionQuality,
          finalValidation
        }
      };
      
      Logger.info(`Applied ${correctionCount} corrections to article`, {
        applied: correctionCount,
        skipped: skippedCorrections.length,
        finalScore: finalValidation.score
      });
      
      return correctedArticle;
      
    } catch (error) {
      Logger.warn('Failed to apply corrections, returning original article', error);
      
      // 修正に失敗した場合は元の記事にファクトチェック情報のみ追加
      return {
        ...article,
        factCheck: {
          checked: true,
          checkedAt: factCheckResult.checkedAt,
          overallScore: factCheckResult.overallScore,
          correctionsApplied: 0,
          totalCorrections: factCheckResult.corrections.length,
          error: 'Failed to apply corrections',
          detailedAnalysis: factCheckResult.detailedAnalysis,
          correctionQuality: factCheckResult.correctionQuality
        }
      };
    }
  }

  /**
   * 最終検証を実行
   */
  async performFinalValidation(content, factCheckResult) {
    Logger.info('Performing final validation...');
    
    const validation = {
      score: 0,
      issues: [],
      recommendations: [],
      readinessLevel: 'not_ready',
      validatedAt: new Date().toISOString()
    };

    try {
      let score = 0;
      
      // 1. ファクトチェックスコアの評価
      const factCheckScore = factCheckResult.overallScore;
      score += factCheckScore * 0.4;
      
      if (factCheckScore < 0.6) {
        validation.issues.push({
          type: 'fact_check',
          severity: 'high',
          message: 'ファクトチェックスコアが低すぎます',
          recommendation: '追加の検証が必要です'
        });
      }
      
      // 2. 修正品質の評価
      const correctionQuality = factCheckResult.correctionQuality?.qualityScore || 0.5;
      score += correctionQuality * 0.2;
      
      if (correctionQuality < 0.7 && factCheckResult.corrections.length > 0) {
        validation.issues.push({
          type: 'correction_quality',
          severity: 'medium',
          message: '修正の品質が不十分です',
          recommendation: '修正内容の再確認を推奨します'
        });
      }
      
      // 3. リスク評価
      const riskLevel = factCheckResult.detailedAnalysis?.riskAssessment?.level || 'medium';
      if (riskLevel === 'low') {
        score += 0.2;
      } else if (riskLevel === 'medium') {
        score += 0.1;
        validation.issues.push({
          type: 'risk',
          severity: 'medium',
          message: '中程度のリスクが検出されました',
          recommendation: '慎重な確認を推奨します'
        });
      } else {
        validation.issues.push({
          type: 'risk',
          severity: 'high',
          message: '高リスクが検出されました',
          recommendation: '専門家による追加レビューが必要です'
        });
      }
      
      // 4. コンテンツ整合性の確認
      const contentIntegrity = this.checkContentIntegrity(content);
      score += contentIntegrity * 0.2;
      
      if (contentIntegrity < 0.8) {
        validation.issues.push({
          type: 'content_integrity',
          severity: 'medium',
          message: 'コンテンツの整合性に問題があります',
          recommendation: '記事の構造と内容を再確認してください'
        });
      }
      
      validation.score = Math.min(1, score);
      
      // 公開準備レベルの判定
      if (validation.score >= 0.8 && validation.issues.filter(i => i.severity === 'high').length === 0) {
        validation.readinessLevel = 'ready';
      } else if (validation.score >= 0.6) {
        validation.readinessLevel = 'needs_review';
      } else {
        validation.readinessLevel = 'not_ready';
      }
      
      // 推奨事項の生成
      validation.recommendations = this.generateFinalRecommendations(validation, factCheckResult);
      
      return validation;
      
    } catch (error) {
      Logger.warn('Final validation failed', error);
      validation.issues.push({
        type: 'validation_error',
        severity: 'high',
        message: '最終検証でエラーが発生しました',
        recommendation: '手動での確認が必要です'
      });
      return validation;
    }
  }

  /**
   * コンテンツ整合性をチェック
   */
  checkContentIntegrity(content) {
    try {
      let score = 1.0;
      
      // 基本的な構造チェック
      if (!content || content.length < 500) {
        score -= 0.3;
      }
      
      // 見出し構造のチェック
      const headings = content.match(/^#{2,3} .+$/gm) || [];
      if (headings.length < 2) {
        score -= 0.2;
      }
      
      // 段落構造のチェック
      const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
      if (paragraphs.length < 3) {
        score -= 0.2;
      }
      
      // 不自然な文章パターンのチェック
      const unnaturalPatterns = [
        /\[修正\]/g,
        /\[要確認\]/g,
        /\[削除\]/g,
        /\(\?\?\?\)/g
      ];
      
      unnaturalPatterns.forEach(pattern => {
        if (pattern.test(content)) {
          score -= 0.1;
        }
      });
      
      return Math.max(0, score);
      
    } catch (error) {
      return 0.5;
    }
  }

  /**
   * 最終推奨事項を生成
   */
  generateFinalRecommendations(validation, factCheckResult) {
    const recommendations = [];
    
    // 高優先度の問題への対応
    const highSeverityIssues = validation.issues.filter(i => i.severity === 'high');
    if (highSeverityIssues.length > 0) {
      recommendations.push({
        priority: 'critical',
        action: 'resolve_critical_issues',
        description: '重大な問題を解決してから公開してください',
        details: highSeverityIssues.map(i => i.message)
      });
    }
    
    // ファクトチェック関連の推奨事項
    if (factCheckResult.detailedAnalysis?.recommendations) {
      recommendations.push(...factCheckResult.detailedAnalysis.recommendations.map(rec => ({
        priority: rec.priority,
        action: rec.action,
        description: rec.recommendation,
        category: 'fact_check'
      })));
    }
    
    // 公開準備レベル別の推奨事項
    switch (validation.readinessLevel) {
      case 'ready':
        recommendations.push({
          priority: 'low',
          action: 'publish',
          description: '記事は公開準備が整っています',
          category: 'publication'
        });
        break;
        
      case 'needs_review':
        recommendations.push({
          priority: 'medium',
          action: 'review_before_publish',
          description: '軽微な確認後に公開可能です',
          category: 'publication'
        });
        break;
        
      case 'not_ready':
        recommendations.push({
          priority: 'high',
          action: 'major_revision',
          description: '大幅な修正が必要です',
          category: 'publication'
        });
        break;
    }
    
    return recommendations;
  }

  /**
   * 結果を保存
   */
  async saveResults(correctedArticle, factCheckResult) {
    Logger.info('Saving fact check results...');
    
    try {
      // 出力ディレクトリの確保
      await FileManager.ensureDirectory('outputs');
      await FileManager.ensureDirectory('outputs/fact-check');
      
      // 修正済み記事を保存
      const articlePath = 'outputs/verified-article.json';
      await FileManager.writeJSON(articlePath, correctedArticle);
      
      // ファクトチェックレポートを保存
      const factCheckPath = 'outputs/fact-check-report.json';
      await FileManager.writeJSON(factCheckPath, factCheckResult);
      
      // 詳細なファクトチェック分析を保存
      const analysisPath = 'outputs/fact-check/detailed-analysis.json';
      await FileManager.writeJSON(analysisPath, factCheckResult.detailedAnalysis);
      
      // 修正履歴を保存
      const correctionsPath = 'outputs/fact-check/corrections.json';
      await FileManager.writeJSON(correctionsPath, {
        applied: correctedArticle.factCheck.appliedCorrections || [],
        skipped: correctedArticle.factCheck.skippedCorrections || [],
        quality: factCheckResult.correctionQuality
      });
      
      // Markdown形式でも保存
      const markdownPath = 'outputs/verified-article.md';
      const markdownContent = this.formatAsMarkdown(correctedArticle, factCheckResult);
      await FileManager.writeFile(markdownPath, markdownContent);
      
      // 詳細レポートをHTML形式で保存
      const htmlReportPath = 'outputs/fact-check/detailed-report.html';
      const htmlReport = this.generateDetailedHTMLReport(correctedArticle, factCheckResult);
      await FileManager.writeFile(htmlReportPath, htmlReport);
      
      // 公開準備チェックリストを保存
      const checklistPath = 'outputs/fact-check/publication-checklist.json';
      const checklist = this.generatePublicationChecklist(correctedArticle, factCheckResult);
      await FileManager.writeJSON(checklistPath, checklist);
      
      // GitHub Actions出力を設定
      const compactResult = {
        title: correctedArticle.title,
        overallScore: factCheckResult.overallScore,
        correctionsApplied: correctedArticle.factCheck.correctionsApplied,
        claimsVerified: factCheckResult.verifiedCount,
        claimsDisputed: factCheckResult.disputedCount,
        readinessLevel: correctedArticle.factCheck.finalValidation?.readinessLevel || 'unknown',
        factChecked: true
      };
      
      FileManager.setGitHubOutput('verified-article', JSON.stringify(compactResult));
      
      Logger.info('Fact check results saved:', {
        article: articlePath,
        report: factCheckPath,
        analysis: analysisPath,
        corrections: correctionsPath,
        markdown: markdownPath,
        htmlReport: htmlReportPath,
        checklist: checklistPath
      });
      
    } catch (error) {
      Logger.error('Failed to save fact check results', error);
      throw error;
    }
  }

  /**
   * 詳細HTMLレポートを生成
   */
  generateDetailedHTMLReport(correctedArticle, factCheckResult) {
    const factCheck = correctedArticle.factCheck;
    const analysis = factCheckResult.detailedAnalysis;
    
    return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ファクトチェックレポート - ${correctedArticle.title}</title>
    <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; margin: 40px; }
        .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .score { font-size: 2em; font-weight: bold; color: ${factCheck.overallScore >= 0.8 ? '#4CAF50' : factCheck.overallScore >= 0.6 ? '#FF9800' : '#F44336'}; }
        .section { margin-bottom: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
        .high-risk { background-color: #ffebee; border-color: #f44336; }
        .medium-risk { background-color: #fff3e0; border-color: #ff9800; }
        .low-risk { background-color: #e8f5e8; border-color: #4caf50; }
        .claim { margin: 10px 0; padding: 10px; border-left: 4px solid #2196F3; background: #f9f9f9; }
        .verified { border-left-color: #4CAF50; }
        .disputed { border-left-color: #FF9800; }
        .unverifiable { border-left-color: #F44336; }
        .correction { margin: 10px 0; padding: 15px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; }
        .recommendation { margin: 10px 0; padding: 10px; background: #e3f2fd; border-left: 4px solid #2196F3; }
        .stats { display: flex; gap: 20px; margin: 20px 0; }
        .stat { text-align: center; padding: 15px; background: #f5f5f5; border-radius: 8px; flex: 1; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>ファクトチェックレポート</h1>
        <h2>${correctedArticle.title}</h2>
        <div class="score">${(factCheck.overallScore * 100).toFixed(1)}%</div>
        <p>検証日時: ${new Date(factCheck.checkedAt).toLocaleString('ja-JP')}</p>
    </div>

    <div class="stats">
        <div class="stat">
            <h3>検証済み</h3>
            <div style="font-size: 2em; color: #4CAF50;">${factCheckResult.verifiedCount}</div>
        </div>
        <div class="stat">
            <h3>疑問あり</h3>
            <div style="font-size: 2em; color: #FF9800;">${factCheckResult.disputedCount}</div>
        </div>
        <div class="stat">
            <h3>未検証</h3>
            <div style="font-size: 2em; color: #F44336;">${factCheckResult.unverifiableCount}</div>
        </div>
        <div class="stat">
            <h3>修正適用</h3>
            <div style="font-size: 2em; color: #2196F3;">${factCheck.correctionsApplied}</div>
        </div>
    </div>

    <div class="section ${analysis.riskAssessment.level === 'high' ? 'high-risk' : analysis.riskAssessment.level === 'medium' ? 'medium-risk' : 'low-risk'}">
        <h3>リスク評価</h3>
        <p><strong>レベル:</strong> ${analysis.riskAssessment.level}</p>
        <p><strong>スコア:</strong> ${(analysis.riskAssessment.score * 100).toFixed(1)}%</p>
        <p><strong>要因:</strong> ${analysis.riskAssessment.factors.join(', ')}</p>
    </div>

    <div class="section">
        <h3>検証された主張</h3>
        ${factCheckResult.checkedClaims.map(claim => `
            <div class="claim ${claim.verification}">
                <strong>${claim.verification === 'verified' ? '✓ 検証済み' : claim.verification === 'disputed' ? '⚠ 疑問あり' : '? 未検証'}</strong>
                <p>${claim.claim}</p>
                <small>信頼度: ${(claim.confidence * 100).toFixed(1)}% | ${claim.reason}</small>
            </div>
        `).join('')}
    </div>

    ${factCheck.appliedCorrections && factCheck.appliedCorrections.length > 0 ? `
    <div class="section">
        <h3>適用された修正</h3>
        ${factCheck.appliedCorrections.map(correction => `
            <div class="correction">
                <p><strong>元の内容:</strong> ${correction.original}</p>
                <p><strong>修正後:</strong> ${correction.corrected}</p>
                <p><strong>理由:</strong> ${correction.reason}</p>
                <small>信頼度: ${(correction.confidence * 100).toFixed(1)}%</small>
            </div>
        `).join('')}
    </div>
    ` : ''}

    <div class="section">
        <h3>推奨事項</h3>
        ${analysis.recommendations.map(rec => `
            <div class="recommendation">
                <strong>${rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢'} ${rec.category}</strong>
                <p>${rec.recommendation}</p>
            </div>
        `).join('')}
    </div>

    <div class="section">
        <h3>検証ソース</h3>
        <table>
            <tr><th>タイトル</th><th>URL</th><th>スコア</th></tr>
            ${factCheckResult.verificationSources.map(source => `
                <tr>
                    <td>${source.title}</td>
                    <td><a href="${source.url}" target="_blank">${source.url}</a></td>
                    <td>${(source.score * 100).toFixed(1)}%</td>
                </tr>
            `).join('')}
        </table>
    </div>
</body>
</html>`;
  }

  /**
   * 公開準備チェックリストを生成
   */
  generatePublicationChecklist(correctedArticle, factCheckResult) {
    const factCheck = correctedArticle.factCheck;
    const validation = factCheck.finalValidation;
    
    const checklist = {
      articleTitle: correctedArticle.title,
      generatedAt: new Date().toISOString(),
      readinessLevel: validation?.readinessLevel || 'unknown',
      overallScore: factCheck.overallScore,
      
      checks: [
        {
          category: 'fact_verification',
          name: 'ファクトチェック完了',
          status: factCheck.checked ? 'passed' : 'failed',
          score: factCheck.overallScore,
          details: `${factCheckResult.verifiedCount}件検証済み、${factCheckResult.disputedCount}件疑問あり`
        },
        {
          category: 'corrections',
          name: '必要な修正の適用',
          status: factCheck.correctionsApplied >= factCheck.totalCorrections * 0.8 ? 'passed' : 'warning',
          score: factCheck.totalCorrections > 0 ? factCheck.correctionsApplied / factCheck.totalCorrections : 1,
          details: `${factCheck.correctionsApplied}/${factCheck.totalCorrections}件の修正を適用`
        },
        {
          category: 'risk_assessment',
          name: 'リスク評価',
          status: factCheckResult.detailedAnalysis.riskAssessment.level === 'low' ? 'passed' : 
                  factCheckResult.detailedAnalysis.riskAssessment.level === 'medium' ? 'warning' : 'failed',
          score: 1 - factCheckResult.detailedAnalysis.riskAssessment.score,
          details: `リスクレベル: ${factCheckResult.detailedAnalysis.riskAssessment.level}`
        },
        {
          category: 'content_integrity',
          name: 'コンテンツ整合性',
          status: validation?.score >= 0.8 ? 'passed' : validation?.score >= 0.6 ? 'warning' : 'failed',
          score: validation?.score || 0.5,
          details: '記事の構造と内容の整合性チェック'
        }
      ],
      
      recommendations: validation?.recommendations || [],
      
      publicationDecision: {
        recommended: validation?.readinessLevel === 'ready',
        requiresReview: validation?.readinessLevel === 'needs_review',
        blockers: validation?.issues?.filter(i => i.severity === 'high') || []
      }
    };
    
    return checklist;
  }

  /**
   * 結果をMarkdown形式でフォーマット
   */
  formatAsMarkdown(correctedArticle, factCheckResult) {
    let markdown = `# ${correctedArticle.title}\n\n`;
    
    // ファクトチェック情報
    markdown += `## ファクトチェック情報\n\n`;
    markdown += `- **検証日時**: ${new Date(factCheckResult.checkedAt).toLocaleString('ja-JP')}\n`;
    markdown += `- **信頼性スコア**: ${(factCheckResult.overallScore * 100).toFixed(1)}%\n`;
    markdown += `- **検証済み主張**: ${factCheckResult.verifiedCount}件\n`;
    markdown += `- **疑問のある主張**: ${factCheckResult.disputedCount}件\n`;
    markdown += `- **未検証主張**: ${factCheckResult.unverifiableCount}件\n`;
    markdown += `- **適用された修正**: ${correctedArticle.factCheck.correctionsApplied}件\n\n`;
    
    // 記事本文
    markdown += correctedArticle.content;
    
    // ファクトチェック詳細
    if (factCheckResult.corrections.length > 0) {
      markdown += `\n\n## 修正履歴\n\n`;
      factCheckResult.corrections.forEach((correction, index) => {
        markdown += `### 修正 ${index + 1}\n\n`;
        markdown += `**元の内容**: ${correction.original}\n\n`;
        markdown += `**修正後**: ${correction.corrected}\n\n`;
        markdown += `**理由**: ${correction.reason}\n\n`;
        markdown += `**信頼度**: ${(correction.confidence * 100).toFixed(1)}%\n\n`;
      });
    }
    
    // 検証ソース
    if (factCheckResult.verificationSources.length > 0) {
      markdown += `\n## 検証ソース\n\n`;
      factCheckResult.verificationSources.forEach((source, index) => {
        markdown += `${index + 1}. [${source.title}](${source.url})\n`;
        markdown += `   - スコア: ${(source.score * 100).toFixed(1)}%\n\n`;
      });
    }
    
    return markdown;
  }
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  const job = new FactCheckJob();
  await job.execute();
}