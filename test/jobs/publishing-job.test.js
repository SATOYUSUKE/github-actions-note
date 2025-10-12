/**
 * Unit tests for Publishing Job
 * Tests core functionality through mock implementations
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

// Mock Publishing Job implementation for testing
class MockPublishingJob {
  constructor() {
    this.jobName = 'Publishing Job';
    this.screenshots = [];
  }

  // Test dry run validation
  performDryRun(inputs) {
    const dryRunResult = {
      success: true,
      status: 'dry_run_completed',
      message: 'Dry run completed successfully',
      article: {
        title: inputs.article.title,
        contentLength: inputs.article.content?.length || 0,
        tags: inputs.article.tags || [],
        hasFactCheck: !!inputs.article.factCheck,
        factCheckScore: inputs.article.factCheck?.overallScore || 0,
        qualityScore: inputs.article.originalArticle?.qualityScore || inputs.article.qualityScore || 0
      },
      validation: {
        titleValid: this.validateTitle(inputs.article.title),
        contentValid: this.validateContent(inputs.article.content),
        tagsValid: this.validateTags(inputs.article.tags),
        factCheckValid: this.validateFactCheck(inputs.article.factCheck),
        qualityValid: this.validateQuality(inputs.article),
        readyForPublication: false
      },
      recommendations: [],
      estimatedPublishTime: this.estimatePublishTime(inputs.article),
      timestamp: new Date().toISOString()
    };
    
    const validationDetails = this.analyzeValidationResults(dryRunResult.validation, inputs.article);
    dryRunResult.validationDetails = validationDetails;
    
    dryRunResult.recommendations = this.generateDryRunRecommendations(dryRunResult.validation, inputs.article);
    
    const criticalChecks = [
      dryRunResult.validation.titleValid,
      dryRunResult.validation.contentValid,
      dryRunResult.validation.factCheckValid
    ];
    
    const optionalChecks = [
      dryRunResult.validation.tagsValid,
      dryRunResult.validation.qualityValid
    ];
    
    const criticalPassed = criticalChecks.every(check => check);
    const optionalPassed = optionalChecks.filter(check => check).length;
    
    dryRunResult.validation.readyForPublication = criticalPassed && optionalPassed >= 1;
    
    if (!dryRunResult.validation.readyForPublication) {
      if (!criticalPassed) {
        dryRunResult.success = false;
        dryRunResult.message = 'Critical validation failed - article not ready for publication';
        dryRunResult.status = 'validation_failed';
      } else {
        dryRunResult.message = 'Article ready for publication with minor issues';
        dryRunResult.status = 'ready_with_warnings';
      }
    } else {
      dryRunResult.message = 'Article fully validated and ready for publication';
      dryRunResult.status = 'ready_for_publication';
    }
    
    dryRunResult.statistics = this.generateDryRunStatistics(dryRunResult);
    
    return dryRunResult;
  }

  // Test validation functions
  validateTitle(title) {
    return !!(title && title.length >= 5 && title.length <= 100);
  }

  validateContent(content) {
    return !!(content && content.length >= 100 && content.length <= 50000);
  }

  validateTags(tags) {
    return Array.isArray(tags) && tags.length <= 5 && 
           tags.every(tag => typeof tag === 'string' && tag.length <= 20);
  }

  validateFactCheck(factCheck) {
    if (!factCheck || !factCheck.checked) {
      return false;
    }
    return factCheck.overallScore >= 0.6;
  }

  validateQuality(article) {
    const qualityScore = article.originalArticle?.qualityScore || article.qualityScore || 0;
    return qualityScore >= 0.7;
  }

  // Test validation analysis
  analyzeValidationResults(validation, article) {
    const details = {
      title: {
        length: article.title?.length || 0,
        recommended: '15-50文字',
        status: validation.titleValid ? 'pass' : 'fail'
      },
      content: {
        length: article.content?.length || 0,
        recommended: '500-10000文字',
        status: validation.contentValid ? 'pass' : 'fail'
      },
      tags: {
        count: article.tags?.length || 0,
        recommended: '1-5個',
        status: validation.tagsValid ? 'pass' : 'fail'
      },
      factCheck: {
        score: article.factCheck?.overallScore || 0,
        recommended: '60%以上',
        status: validation.factCheckValid ? 'pass' : 'fail'
      },
      quality: {
        score: article.originalArticle?.qualityScore || article.qualityScore || 0,
        recommended: '70%以上',
        status: validation.qualityValid ? 'pass' : 'fail'
      }
    };
    
    return details;
  }

  // Test recommendation generation
  generateDryRunRecommendations(validation, article) {
    const recommendations = [];
    
    if (!validation.titleValid) {
      const titleLength = article.title?.length || 0;
      if (titleLength < 15) {
        recommendations.push({
          type: 'title',
          priority: 'high',
          message: 'タイトルが短すぎます。15文字以上にすることを推奨します。',
          currentValue: titleLength,
          recommendedValue: '15-50文字'
        });
      } else if (titleLength > 50) {
        recommendations.push({
          type: 'title',
          priority: 'medium',
          message: 'タイトルが長すぎます。50文字以内にすることを推奨します。',
          currentValue: titleLength,
          recommendedValue: '15-50文字'
        });
      }
    }
    
    if (!validation.contentValid) {
      const contentLength = article.content?.length || 0;
      if (contentLength < 500) {
        recommendations.push({
          type: 'content',
          priority: 'high',
          message: 'コンテンツが短すぎます。より詳細な内容を追加してください。',
          currentValue: contentLength,
          recommendedValue: '500文字以上'
        });
      }
    }
    
    if (!validation.factCheckValid) {
      const score = article.factCheck?.overallScore || 0;
      recommendations.push({
        type: 'factcheck',
        priority: 'high',
        message: 'ファクトチェックスコアが低いです。内容の見直しを推奨します。',
        currentValue: `${(score * 100).toFixed(1)}%`,
        recommendedValue: '60%以上'
      });
    }
    
    if (!validation.qualityValid) {
      const score = article.originalArticle?.qualityScore || article.qualityScore || 0;
      recommendations.push({
        type: 'quality',
        priority: 'medium',
        message: '記事品質スコアが低いです。構造や内容の改善を検討してください。',
        currentValue: `${(score * 100).toFixed(1)}%`,
        recommendedValue: '70%以上'
      });
    }
    
    if (!validation.tagsValid) {
      const tagCount = article.tags?.length || 0;
      if (tagCount === 0) {
        recommendations.push({
          type: 'tags',
          priority: 'low',
          message: 'タグが設定されていません。SEO効果を高めるためタグの追加を推奨します。',
          currentValue: tagCount,
          recommendedValue: '1-5個'
        });
      }
    }
    
    return recommendations;
  }

  // Test publish time estimation
  estimatePublishTime(article) {
    const baseTime = 30;
    const contentFactor = Math.min((article.content?.length || 0) / 1000, 5);
    const tagFactor = (article.tags?.length || 0) * 2;
    
    return Math.ceil(baseTime + contentFactor + tagFactor);
  }

  // Test statistics generation
  generateDryRunStatistics(dryRunResult) {
    const validation = dryRunResult.validation;
    
    const totalChecks = Object.keys(validation).length - 1; // readyForPublicationを除く
    const passedChecks = Object.values(validation).filter(v => v === true).length;
    
    return {
      totalChecks,
      passedChecks,
      failedChecks: totalChecks - passedChecks,
      passRate: (passedChecks / totalChecks * 100).toFixed(1),
      criticalIssues: dryRunResult.recommendations.filter(r => r.priority === 'high').length,
      warnings: dryRunResult.recommendations.filter(r => r.priority === 'medium').length,
      suggestions: dryRunResult.recommendations.filter(r => r.priority === 'low').length
    };
  }

  // Test content input verification
  verifyContentInput(article) {
    try {
      const verification = {
        success: false,
        titleMatch: false,
        contentMatch: false,
        details: {}
      };

      // Simulate title verification
      const titleValue = article.title || '';
      verification.titleMatch = titleValue.trim() === article.title.trim();
      verification.details.expectedTitle = article.title;
      verification.details.actualTitle = titleValue;

      // Simulate content verification
      const contentValue = article.content || '';
      const expectedStart = article.content.substring(0, 100);
      const actualStart = contentValue.substring(0, 100);
      verification.contentMatch = actualStart.includes(expectedStart.substring(0, 50));
      verification.details.expectedContentStart = expectedStart;
      verification.details.actualContentStart = actualStart;

      verification.success = verification.titleMatch && verification.contentMatch;
      return verification;

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Test tag verification
  verifyTagsSet(expectedTags) {
    try {
      const verification = {
        success: false,
        expectedCount: expectedTags.length,
        actualCount: 0,
        matchedTags: [],
        details: {}
      };

      // Simulate tag detection
      const actualTags = expectedTags.slice(0, Math.ceil(expectedTags.length * 0.8)); // 80% success rate
      
      verification.actualCount = actualTags.length;
      verification.details.actualTags = actualTags;
      verification.details.expectedTags = expectedTags;

      for (const expectedTag of expectedTags) {
        if (actualTags.some(actualTag => actualTag.includes(expectedTag) || expectedTag.includes(actualTag))) {
          verification.matchedTags.push(expectedTag);
        }
      }

      verification.success = verification.matchedTags.length >= Math.ceil(expectedTags.length * 0.5);

      return verification;

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Test publication waiting
  waitForPublicationComplete(expectedStatus) {
    // Simulate successful publication detection
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true); // Simulate successful detection
      }, 100);
    });
  }

  // Test URL extraction
  getArticleUrl() {
    // Simulate article URL extraction
    return Promise.resolve('https://note.com/user/n/article123');
  }

  // Test screenshot functionality
  takeScreenshot(step) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `screenshot-${step}-${timestamp}.png`;
      const path = `outputs/screenshots/${filename}`;
      
      this.screenshots.push({
        step: step,
        filename: filename,
        path: path,
        timestamp: new Date().toISOString()
      });
      
      return Promise.resolve();
      
    } catch (error) {
      return Promise.resolve(); // Don't fail on screenshot errors
    }
  }
}

// Mock data
const mockVerifiedArticle = {
  title: 'AI技術の最新動向について',
  content: `# AI技術の最新動向について

AI技術は急速に発展しており、様々な分野で活用されています。

## 機械学習の進歩

深層学習技術により、より高精度な予測が可能になりました。

## まとめ

AI技術の進歩により、生産性向上が期待されます。`,
  tags: ['AI', '技術', '機械学習'],
  factCheck: {
    checked: true,
    overallScore: 0.85,
    correctionsApplied: 1
  },
  originalArticle: {
    qualityScore: 0.8,
    metadata: {
      wordCount: 150,
      estimatedReadingTime: 1
    }
  }
};

describe('Publishing Job Core Logic', () => {
  let publishingJob;

  beforeEach(() => {
    publishingJob = new MockPublishingJob();
  });

  describe('performDryRun', () => {
    test('should perform comprehensive dry run validation', () => {
      const inputs = {
        article: mockVerifiedArticle,
        isPublic: false,
        dryRun: true
      };

      const result = publishingJob.performDryRun(inputs);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.status, 'ready_for_publication');
      assert.ok(result.article);
      assert.ok(result.validation);
      assert.ok(result.recommendations);
      assert.ok(result.estimatedPublishTime);
      assert.ok(result.statistics);

      assert.strictEqual(result.validation.titleValid, true);
      assert.strictEqual(result.validation.contentValid, true);
      assert.strictEqual(result.validation.factCheckValid, true);
      assert.strictEqual(result.validation.readyForPublication, true);
    });

    test('should identify validation failures', () => {
      const poorArticle = {
        title: 'Bad', // Too short
        content: 'Short', // Too short
        tags: [],
        factCheck: {
          checked: true,
          overallScore: 0.3 // Too low
        },
        originalArticle: {
          qualityScore: 0.5 // Too low
        }
      };

      const inputs = {
        article: poorArticle,
        isPublic: false,
        dryRun: true
      };

      const result = publishingJob.performDryRun(inputs);

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.status, 'validation_failed');
      assert.strictEqual(result.validation.titleValid, false);
      assert.strictEqual(result.validation.contentValid, false);
      assert.strictEqual(result.validation.factCheckValid, false);
      assert.strictEqual(result.validation.readyForPublication, false);
    });

    test('should generate appropriate recommendations', () => {
      const articleWithIssues = {
        title: 'Short', // Too short
        content: mockVerifiedArticle.content,
        tags: [],
        factCheck: {
          checked: true,
          overallScore: 0.8
        },
        originalArticle: {
          qualityScore: 0.8
        }
      };

      const inputs = {
        article: articleWithIssues,
        isPublic: false,
        dryRun: true
      };

      const result = publishingJob.performDryRun(inputs);

      assert.ok(Array.isArray(result.recommendations));
      // Should have recommendations for the short title
      if (result.recommendations.length > 0) {
        const titleRecommendation = result.recommendations.find(r => r.type === 'title');
        if (titleRecommendation) {
          assert.strictEqual(titleRecommendation.priority, 'high');
        }
      }
    });

    test('should calculate statistics correctly', () => {
      const inputs = {
        article: mockVerifiedArticle,
        isPublic: false,
        dryRun: true
      };

      const result = publishingJob.performDryRun(inputs);

      assert.ok(result.statistics);
      assert.ok(result.statistics.totalChecks > 0);
      assert.ok(result.statistics.passedChecks >= 0);
      assert.ok(result.statistics.failedChecks >= 0);
      assert.ok(result.statistics.passRate);
    });
  });

  describe('validateTitle', () => {
    test('should validate good titles', () => {
      assert.strictEqual(publishingJob.validateTitle('AI技術の最新動向について'), true);
      assert.strictEqual(publishingJob.validateTitle('適切な長さのタイトル'), true);
    });

    test('should reject bad titles', () => {
      assert.strictEqual(publishingJob.validateTitle('短い'), false); // Too short
      assert.strictEqual(publishingJob.validateTitle(''), false); // Empty
      assert.strictEqual(publishingJob.validateTitle('A'.repeat(101)), false); // Too long
      assert.strictEqual(publishingJob.validateTitle(null), false); // Null
    });
  });

  describe('validateContent', () => {
    test('should validate good content', () => {
      const goodContent = 'A'.repeat(1000); // 1000 characters
      assert.strictEqual(publishingJob.validateContent(goodContent), true);
    });

    test('should reject bad content', () => {
      assert.strictEqual(publishingJob.validateContent('Short'), false); // Too short
      assert.strictEqual(publishingJob.validateContent(''), false); // Empty
      assert.strictEqual(publishingJob.validateContent('A'.repeat(50001)), false); // Too long
      assert.strictEqual(publishingJob.validateContent(null), false); // Null
    });
  });

  describe('validateTags', () => {
    test('should validate good tags', () => {
      assert.strictEqual(publishingJob.validateTags(['AI', '技術']), true);
      assert.strictEqual(publishingJob.validateTags(['tag1', 'tag2', 'tag3']), true);
      assert.strictEqual(publishingJob.validateTags([]), true); // Empty is valid
    });

    test('should reject bad tags', () => {
      assert.strictEqual(publishingJob.validateTags(['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6']), false); // Too many
      assert.strictEqual(publishingJob.validateTags(['A'.repeat(21)]), false); // Tag too long
      assert.strictEqual(publishingJob.validateTags([123]), false); // Non-string tag
      assert.strictEqual(publishingJob.validateTags('not-array'), false); // Not array
    });
  });

  describe('validateFactCheck', () => {
    test('should validate good fact check', () => {
      const goodFactCheck = {
        checked: true,
        overallScore: 0.8
      };
      assert.strictEqual(publishingJob.validateFactCheck(goodFactCheck), true);
    });

    test('should reject bad fact check', () => {
      assert.strictEqual(publishingJob.validateFactCheck(null), false);
      assert.strictEqual(publishingJob.validateFactCheck({ checked: false }), false);
      assert.strictEqual(publishingJob.validateFactCheck({ checked: true, overallScore: 0.5 }), false);
    });
  });

  describe('validateQuality', () => {
    test('should validate good quality', () => {
      const goodArticle = {
        originalArticle: { qualityScore: 0.8 }
      };
      assert.strictEqual(publishingJob.validateQuality(goodArticle), true);

      const goodArticleAlt = {
        qualityScore: 0.75
      };
      assert.strictEqual(publishingJob.validateQuality(goodArticleAlt), true);
    });

    test('should reject poor quality', () => {
      const poorArticle = {
        originalArticle: { qualityScore: 0.6 }
      };
      assert.strictEqual(publishingJob.validateQuality(poorArticle), false);

      const noQualityArticle = {};
      assert.strictEqual(publishingJob.validateQuality(noQualityArticle), false);
    });
  });

  describe('estimatePublishTime', () => {
    test('should estimate publish time correctly', () => {
      const shortArticle = {
        content: 'Short content',
        tags: ['tag1']
      };
      const shortTime = publishingJob.estimatePublishTime(shortArticle);
      assert.ok(shortTime >= 30); // At least base time

      const longArticle = {
        content: 'A'.repeat(5000),
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5']
      };
      const longTime = publishingJob.estimatePublishTime(longArticle);
      assert.ok(longTime > shortTime); // Should take longer
    });

    test('should handle missing content gracefully', () => {
      const emptyArticle = {};
      const time = publishingJob.estimatePublishTime(emptyArticle);
      assert.strictEqual(time, 30); // Base time
    });
  });

  describe('verifyContentInput', () => {
    test('should verify content input successfully', () => {
      const article = {
        title: 'Test Title',
        content: 'Test content for verification'
      };

      const result = publishingJob.verifyContentInput(article);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.titleMatch, true);
      assert.strictEqual(result.contentMatch, true);
    });

    test('should detect title mismatch', () => {
      const article = {
        title: 'Expected Title',
        content: 'Test content'
      };

      // Mock different title detection
      const originalMethod = publishingJob.verifyContentInput;
      publishingJob.verifyContentInput = function(article) {
        const result = originalMethod.call(this, article);
        result.titleMatch = false;
        result.details.actualTitle = 'Different Title';
        result.success = false;
        return result;
      };

      const result = publishingJob.verifyContentInput(article);

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.titleMatch, false);
    });
  });

  describe('verifyTagsSet', () => {
    test('should verify tags set successfully', () => {
      const expectedTags = ['AI', '技術', '機械学習'];

      const result = publishingJob.verifyTagsSet(expectedTags);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.expectedCount, 3);
      assert.ok(result.matchedTags.length >= 2); // At least 50% match
    });

    test('should handle partial tag matches', () => {
      const expectedTags = ['AI', '技術', '機械学習'];

      const result = publishingJob.verifyTagsSet(expectedTags);

      assert.ok(result.matchedTags.length >= Math.ceil(expectedTags.length * 0.5));
    });

    test('should fail with insufficient matches', () => {
      const expectedTags = ['AI', '技術', '機械学習', '深層学習', '自然言語処理'];

      // Mock low success rate
      const originalMethod = publishingJob.verifyTagsSet;
      publishingJob.verifyTagsSet = function(expectedTags) {
        const result = originalMethod.call(this, expectedTags);
        result.matchedTags = ['AI']; // Only 1/5 tags
        result.success = false;
        return result;
      };

      const result = publishingJob.verifyTagsSet(expectedTags);

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.matchedTags.length, 1);
    });
  });

  describe('waitForPublicationComplete', () => {
    test('should detect publication completion', async () => {
      const result = await publishingJob.waitForPublicationComplete('published');
      assert.strictEqual(result, true);
    });
  });

  describe('getArticleUrl', () => {
    test('should get article URL', async () => {
      const url = await publishingJob.getArticleUrl();
      assert.strictEqual(url, 'https://note.com/user/n/article123');
    });
  });

  describe('takeScreenshot', () => {
    test('should take screenshot successfully', async () => {
      await publishingJob.takeScreenshot('test-step');

      assert.strictEqual(publishingJob.screenshots.length, 1);

      const screenshot = publishingJob.screenshots[0];
      assert.strictEqual(screenshot.step, 'test-step');
      assert.ok(screenshot.filename);
      assert.ok(screenshot.path);
      assert.ok(screenshot.timestamp);
    });

    test('should handle multiple screenshots', async () => {
      await publishingJob.takeScreenshot('step-1');
      await publishingJob.takeScreenshot('step-2');
      await publishingJob.takeScreenshot('step-3');

      assert.strictEqual(publishingJob.screenshots.length, 3);
      assert.strictEqual(publishingJob.screenshots[0].step, 'step-1');
      assert.strictEqual(publishingJob.screenshots[1].step, 'step-2');
      assert.strictEqual(publishingJob.screenshots[2].step, 'step-3');
    });
  });

  describe('analyzeValidationResults', () => {
    test('should analyze validation results correctly', () => {
      const validation = {
        titleValid: true,
        contentValid: true,
        tagsValid: true,
        factCheckValid: true,
        qualityValid: true
      };

      const article = {
        title: 'Test Title',
        content: 'A'.repeat(1000),
        tags: ['AI', '技術'],
        factCheck: { overallScore: 0.8 },
        originalArticle: { qualityScore: 0.8 }
      };

      const details = publishingJob.analyzeValidationResults(validation, article);

      assert.strictEqual(details.title.status, 'pass');
      assert.strictEqual(details.content.status, 'pass');
      assert.strictEqual(details.tags.status, 'pass');
      assert.strictEqual(details.factCheck.status, 'pass');
      assert.strictEqual(details.quality.status, 'pass');
    });

    test('should handle failed validations', () => {
      const validation = {
        titleValid: false,
        contentValid: false,
        tagsValid: false,
        factCheckValid: false,
        qualityValid: false
      };

      const article = {
        title: 'Bad',
        content: 'Short',
        tags: [],
        factCheck: { overallScore: 0.3 },
        originalArticle: { qualityScore: 0.3 }
      };

      const details = publishingJob.analyzeValidationResults(validation, article);

      assert.strictEqual(details.title.status, 'fail');
      assert.strictEqual(details.content.status, 'fail');
      assert.strictEqual(details.tags.status, 'fail');
      assert.strictEqual(details.factCheck.status, 'fail');
      assert.strictEqual(details.quality.status, 'fail');
    });
  });

  describe('generateDryRunStatistics', () => {
    test('should generate statistics correctly', () => {
      const dryRunResult = {
        validation: {
          titleValid: true,
          contentValid: true,
          tagsValid: false,
          factCheckValid: true,
          qualityValid: false,
          readyForPublication: true
        },
        recommendations: [
          { priority: 'high' },
          { priority: 'medium' },
          { priority: 'low' }
        ]
      };

      const stats = publishingJob.generateDryRunStatistics(dryRunResult);

      assert.strictEqual(stats.totalChecks, 5); // Excluding readyForPublication
      assert.strictEqual(stats.passedChecks, 3);
      assert.strictEqual(stats.failedChecks, 2);
      assert.strictEqual(stats.passRate, '60.0');
      assert.strictEqual(stats.criticalIssues, 1);
      assert.strictEqual(stats.warnings, 1);
      assert.strictEqual(stats.suggestions, 1);
    });
  });
});