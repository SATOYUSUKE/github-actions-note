/**
 * Fact Check Analysis Utilities
 */

import { Logger } from './logger.js';

export class FactCheckAnalyzer {
  /**
   * 高度な主張抽出
   */
  static extractAdvancedClaims(content) {
    const claims = [];
    
    try {
      // 1. 統計的主張の抽出
      const statisticalClaims = this.extractStatisticalClaims(content);
      claims.push(...statisticalClaims);
      
      // 2. 時系列的主張の抽出
      const temporalClaims = this.extractTemporalClaims(content);
      
      // 2.1. 時間的主張の検証（古い年の検出）
      const validatedTemporalClaims = this.validateTemporalClaims(temporalClaims);
      claims.push(...validatedTemporalClaims);
      
      // 3. 因果関係の主張の抽出
      const causalClaims = this.extractCausalClaims(content);
      claims.push(...causalClaims);
      
      // 4. 比較的主張の抽出
      const comparativeClaims = this.extractComparativeClaims(content);
      claims.push(...comparativeClaims);
      
      // 5. 権威的主張の抽出
      const authoritativeClaims = this.extractAuthoritativeClaims(content);
      claims.push(...authoritativeClaims);
      
      // 重複除去と優先度付け
      const uniqueClaims = this.deduplicateAndPrioritize(claims);
      
      Logger.info(`Extracted ${uniqueClaims.length} advanced claims for verification`);
      return uniqueClaims;
      
    } catch (error) {
      Logger.warn('Failed to extract advanced claims', error);
      return [];
    }
  }

  /**
   * 統計的主張の抽出
   */
  static extractStatisticalClaims(content) {
    const claims = [];
    
    // パーセンテージを含む主張
    const percentagePattern = /[^.!?。！？]*\d+(?:\.\d+)?%[^.!?。！？]*[.!?。！？]/g;
    const percentageMatches = content.match(percentagePattern) || [];
    
    percentageMatches.forEach(match => {
      claims.push({
        text: match.trim(),
        type: 'statistical_percentage',
        priority: 0.9,
        verificationMethod: 'statistical_lookup',
        extractedData: {
          percentage: match.match(/\d+(?:\.\d+)?%/)[0]
        }
      });
    });
    
    // 数値比較を含む主張
    const comparisonPattern = /[^.!?。！？]*\d+(?:倍|割|分の\d+|対\d+)[^.!?。！？]*[.!?。！？]/g;
    const comparisonMatches = content.match(comparisonPattern) || [];
    
    comparisonMatches.forEach(match => {
      claims.push({
        text: match.trim(),
        type: 'statistical_comparison',
        priority: 0.8,
        verificationMethod: 'comparative_analysis'
      });
    });
    
    return claims;
  }

  /**
   * 時系列的主張の抽出
   */
  static extractTemporalClaims(content) {
    const claims = [];
    
    // 年度を含む主張
    const yearPattern = /[^.!?。！？]*20\d{2}年[^.!?。！？]*[.!?。！？]/g;
    const yearMatches = content.match(yearPattern) || [];
    
    yearMatches.forEach(match => {
      const year = match.match(/20\d{2}/)[0];
      claims.push({
        text: match.trim(),
        type: 'temporal_year',
        priority: 0.8,
        verificationMethod: 'temporal_verification',
        extractedData: {
          year: year
        }
      });
    });
    
    // 期間を含む主張
    const periodPattern = /[^.!?。！？]*(?:過去|今後|これまでの)\d+(?:年|ヶ月|日)[^.!?。！？]*[.!?。！？]/g;
    const periodMatches = content.match(periodPattern) || [];
    
    periodMatches.forEach(match => {
      claims.push({
        text: match.trim(),
        type: 'temporal_period',
        priority: 0.7,
        verificationMethod: 'period_verification'
      });
    });
    
    return claims;
  }

  /**
   * 時間的主張の検証
   */
  static validateTemporalClaims(claims) {
    const currentYear = new Date().getFullYear();
    const validatedClaims = [];
    
    claims.forEach(claim => {
      if (claim.type === 'temporal_year' && claim.extractedData?.year) {
        const mentionedYear = parseInt(claim.extractedData.year);
        const yearDifference = currentYear - mentionedYear;
        
        // 2年以上古い年を検出
        if (yearDifference >= 2) {
          validatedClaims.push({
            ...claim,
            isOutdated: true,
            yearDifference: yearDifference,
            suggestedCorrection: claim.text.replace(
              new RegExp(`${mentionedYear}年`, 'g'), 
              `${currentYear}年`
            ),
            validationMessage: `${mentionedYear}年は${yearDifference}年前の情報です。${currentYear}年の最新情報に更新することを推奨します。`
          });
        } else {
          validatedClaims.push({
            ...claim,
            isOutdated: false,
            yearDifference: yearDifference
          });
        }
      } else {
        validatedClaims.push(claim);
      }
    });
    
    Logger.info(`Validated ${validatedClaims.length} temporal claims, found ${validatedClaims.filter(c => c.isOutdated).length} outdated claims`);
    return validatedClaims;
  }

  /**
   * 因果関係の主張の抽出
   */
  static extractCausalClaims(content) {
    const claims = [];
    
    const causalPatterns = [
      /[^.!?。！？]*により[^.!?。！？]*[.!?。！？]/g,
      /[^.!?。！？]*によって[^.!?。！？]*[.!?。！？]/g,
      /[^.!?。！？]*が原因で[^.!?。！？]*[.!?。！？]/g,
      /[^.!?。！？]*の結果[^.!?。！？]*[.!?。！？]/g,
      /[^.!?。！？]*ため[^.!?。！？]*[.!?。！？]/g
    ];
    
    causalPatterns.forEach(pattern => {
      const matches = content.match(pattern) || [];
      matches.forEach(match => {
        claims.push({
          text: match.trim(),
          type: 'causal_relationship',
          priority: 0.8,
          verificationMethod: 'causal_analysis'
        });
      });
    });
    
    return claims;
  }

  /**
   * 比較的主張の抽出
   */
  static extractComparativeClaims(content) {
    const claims = [];
    
    const comparativePatterns = [
      /[^.!?。！？]*より(?:高い|低い|多い|少ない|大きい|小さい)[^.!?。！？]*[.!?。！？]/g,
      /[^.!?。！？]*最(?:高|低|大|小|多|少)[^.!?。！？]*[.!?。！？]/g,
      /[^.!?。！？]*(?:上位|下位)\d+[^.!?。！？]*[.!?。！？]/g,
      /[^.!?。！？]*(?:第|No\.)\d+位[^.!?。！？]*[.!?。！？]/g
    ];
    
    comparativePatterns.forEach(pattern => {
      const matches = content.match(pattern) || [];
      matches.forEach(match => {
        claims.push({
          text: match.trim(),
          type: 'comparative_statement',
          priority: 0.7,
          verificationMethod: 'comparative_verification'
        });
      });
    });
    
    return claims;
  }

  /**
   * 権威的主張の抽出
   */
  static extractAuthoritativeClaims(content) {
    const claims = [];
    
    const authorityPatterns = [
      /[^.!?。！？]*(?:研究|調査|報告|発表)(?:によると|では|で)[^.!?。！？]*[.!?。！？]/g,
      /[^.!?。！？]*(?:専門家|学者|研究者)(?:によると|は|が)[^.!?。！？]*[.!?。！？]/g,
      /[^.!?。！？]*(?:大学|機関|組織)(?:の|が|は)[^.!?。！？]*[.!?。！？]/g,
      /[^.!?。！？]*(?:論文|レポート|白書)(?:によると|では|で)[^.!?。！？]*[.!?。！？]/g
    ];
    
    authorityPatterns.forEach(pattern => {
      const matches = content.match(pattern) || [];
      matches.forEach(match => {
        claims.push({
          text: match.trim(),
          type: 'authoritative_claim',
          priority: 0.9,
          verificationMethod: 'authority_verification'
        });
      });
    });
    
    return claims;
  }

  /**
   * 重複除去と優先度付け
   */
  static deduplicateAndPrioritize(claims) {
    // 重複除去
    const uniqueClaims = claims.filter((claim, index, self) => 
      self.findIndex(c => c.text === claim.text) === index
    );
    
    // 優先度でソート
    uniqueClaims.sort((a, b) => b.priority - a.priority);
    
    // 長さでフィルタリング
    return uniqueClaims
      .filter(claim => claim.text.length > 20 && claim.text.length < 500)
      .slice(0, 15); // 最大15個
  }

  /**
   * 検証結果の詳細分析
   */
  static analyzeVerificationResults(checkedClaims) {
    const analysis = {
      overallReliability: 0,
      categoryBreakdown: {},
      confidenceDistribution: {},
      sourceQuality: {},
      riskAssessment: {},
      recommendations: []
    };

    try {
      // カテゴリ別の分析
      const categories = {};
      checkedClaims.forEach(claim => {
        const type = claim.type || 'unknown';
        if (!categories[type]) {
          categories[type] = { total: 0, verified: 0, disputed: 0, unverifiable: 0 };
        }
        categories[type].total++;
        categories[type][claim.verification]++;
      });

      analysis.categoryBreakdown = categories;

      // 信頼度分布の分析
      const confidenceRanges = { high: 0, medium: 0, low: 0 };
      checkedClaims.forEach(claim => {
        if (claim.confidence >= 0.8) confidenceRanges.high++;
        else if (claim.confidence >= 0.5) confidenceRanges.medium++;
        else confidenceRanges.low++;
      });

      analysis.confidenceDistribution = confidenceRanges;

      // ソース品質の分析
      const allSources = checkedClaims.flatMap(claim => claim.sources || []);
      const sourceQuality = this.analyzeSourceQuality(allSources);
      analysis.sourceQuality = sourceQuality;

      // リスク評価
      const riskAssessment = this.assessVerificationRisk(checkedClaims);
      analysis.riskAssessment = riskAssessment;

      // 推奨事項の生成
      const recommendations = this.generateRecommendations(analysis);
      analysis.recommendations = recommendations;

      // 全体的な信頼性スコア
      const reliabilityScore = this.calculateReliabilityScore(checkedClaims, analysis);
      analysis.overallReliability = reliabilityScore;

      return analysis;

    } catch (error) {
      Logger.warn('Failed to analyze verification results', error);
      return analysis;
    }
  }

  /**
   * ソース品質の分析
   */
  static analyzeSourceQuality(sources) {
    const quality = {
      totalSources: sources.length,
      averageScore: 0,
      domainDistribution: {},
      qualityTiers: { high: 0, medium: 0, low: 0 }
    };

    if (sources.length === 0) return quality;

    // 平均スコア
    const totalScore = sources.reduce((sum, source) => sum + (source.score || 0), 0);
    quality.averageScore = totalScore / sources.length;

    // ドメイン分布
    sources.forEach(source => {
      try {
        const domain = new URL(source.url).hostname;
        quality.domainDistribution[domain] = (quality.domainDistribution[domain] || 0) + 1;
      } catch (error) {
        // Invalid URL
      }
    });

    // 品質階層
    sources.forEach(source => {
      const score = source.score || 0;
      if (score >= 0.8) quality.qualityTiers.high++;
      else if (score >= 0.5) quality.qualityTiers.medium++;
      else quality.qualityTiers.low++;
    });

    return quality;
  }

  /**
   * 検証リスクの評価
   */
  static assessVerificationRisk(checkedClaims) {
    const risk = {
      level: 'low',
      factors: [],
      score: 0,
      criticalIssues: []
    };

    let riskScore = 0;

    // 未検証の主張が多い
    const unverifiableCount = checkedClaims.filter(c => c.verification === 'unverifiable').length;
    const unverifiableRatio = unverifiableCount / Math.max(1, checkedClaims.length);
    if (unverifiableRatio > 0.3) {
      riskScore += 0.3;
      risk.factors.push('高い未検証率');
    }

    // 疑問のある主張が多い
    const disputedCount = checkedClaims.filter(c => c.verification === 'disputed').length;
    const disputedRatio = disputedCount / Math.max(1, checkedClaims.length);
    if (disputedRatio > 0.2) {
      riskScore += 0.4;
      risk.factors.push('多数の疑問のある主張');
    }

    // 低信頼度の主張が多い
    const lowConfidenceCount = checkedClaims.filter(c => c.confidence < 0.5).length;
    const lowConfidenceRatio = lowConfidenceCount / Math.max(1, checkedClaims.length);
    if (lowConfidenceRatio > 0.3) {
      riskScore += 0.2;
      risk.factors.push('低信頼度の主張が多数');
    }

    // 統計的主張の検証失敗
    const statisticalClaims = checkedClaims.filter(c => 
      c.type && c.type.includes('statistical')
    );
    const failedStatistical = statisticalClaims.filter(c => 
      c.verification !== 'verified'
    );
    if (failedStatistical.length > 0) {
      riskScore += 0.3;
      risk.factors.push('統計的主張の検証問題');
      risk.criticalIssues.push(...failedStatistical.map(c => c.claim));
    }

    risk.score = Math.min(1, riskScore);

    // リスクレベルの決定
    if (risk.score >= 0.7) risk.level = 'high';
    else if (risk.score >= 0.4) risk.level = 'medium';
    else risk.level = 'low';

    return risk;
  }

  /**
   * 推奨事項の生成
   */
  static generateRecommendations(analysis) {
    const recommendations = [];

    // 未検証率が高い場合
    if (analysis.confidenceDistribution.low > analysis.confidenceDistribution.high) {
      recommendations.push({
        priority: 'high',
        category: 'verification',
        recommendation: '未検証の主張が多いため、追加の情報源での確認を推奨します。',
        action: 'additional_verification'
      });
    }

    // ソース品質が低い場合
    if (analysis.sourceQuality.averageScore < 0.6) {
      recommendations.push({
        priority: 'medium',
        category: 'sources',
        recommendation: 'より信頼性の高い情報源からの引用を増やすことを推奨します。',
        action: 'improve_sources'
      });
    }

    // リスクが高い場合
    if (analysis.riskAssessment.level === 'high') {
      recommendations.push({
        priority: 'high',
        category: 'risk',
        recommendation: '記事の公開前に専門家による追加レビューを推奨します。',
        action: 'expert_review'
      });
    }

    // 統計的主張の問題
    const statisticalIssues = analysis.categoryBreakdown.statistical_percentage || 
                             analysis.categoryBreakdown.statistical_comparison;
    if (statisticalIssues && (statisticalIssues.disputed > 0 || statisticalIssues.unverifiable > 0)) {
      recommendations.push({
        priority: 'high',
        category: 'statistics',
        recommendation: '統計データの出典を明確にし、最新の情報に更新することを推奨します。',
        action: 'update_statistics'
      });
    }

    return recommendations;
  }

  /**
   * 信頼性スコアの計算
   */
  static calculateReliabilityScore(checkedClaims, analysis) {
    if (checkedClaims.length === 0) return 0.5;

    let score = 0;

    // 検証済み主張の割合
    const verifiedCount = checkedClaims.filter(c => c.verification === 'verified').length;
    const verifiedRatio = verifiedCount / checkedClaims.length;
    score += verifiedRatio * 0.4;

    // 平均信頼度
    const avgConfidence = checkedClaims.reduce((sum, c) => sum + c.confidence, 0) / checkedClaims.length;
    score += avgConfidence * 0.3;

    // ソース品質
    score += analysis.sourceQuality.averageScore * 0.2;

    // リスク評価（逆算）
    score += (1 - analysis.riskAssessment.score) * 0.1;

    return Math.min(1, Math.max(0, score));
  }

  /**
   * 修正の品質評価
   */
  static evaluateCorrectionQuality(corrections) {
    const evaluation = {
      totalCorrections: corrections.length,
      highConfidenceCorrections: 0,
      averageConfidence: 0,
      correctionTypes: {},
      qualityScore: 0
    };

    if (corrections.length === 0) return evaluation;

    // 高信頼度修正のカウント
    evaluation.highConfidenceCorrections = corrections.filter(c => c.confidence >= 0.8).length;

    // 平均信頼度
    const totalConfidence = corrections.reduce((sum, c) => sum + c.confidence, 0);
    evaluation.averageConfidence = totalConfidence / corrections.length;

    // 修正タイプの分類
    corrections.forEach(correction => {
      const type = this.classifyCorrection(correction);
      evaluation.correctionTypes[type] = (evaluation.correctionTypes[type] || 0) + 1;
    });

    // 品質スコア
    const highConfidenceRatio = evaluation.highConfidenceCorrections / corrections.length;
    evaluation.qualityScore = (highConfidenceRatio * 0.6) + (evaluation.averageConfidence * 0.4);

    return evaluation;
  }

  /**
   * 修正の分類
   */
  static classifyCorrection(correction) {
    const original = correction.original.toLowerCase();
    const corrected = correction.corrected.toLowerCase();

    if (original.match(/\d+/) && corrected.match(/\d+/)) {
      return 'numerical';
    } else if (original.match(/20\d{2}/) && corrected.match(/20\d{2}/)) {
      return 'temporal';
    } else if (correction.reason.includes('統計') || correction.reason.includes('データ')) {
      return 'statistical';
    } else {
      return 'factual';
    }
  }
}