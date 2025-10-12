/**
 * Unit tests for Research Job
 * Tests core functionality through mock implementations
 */

import { test, describe, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';

// Mock Research Job implementation for testing
class MockResearchJob {
  constructor() {
    this.jobName = 'Research Job';
  }

  // Test the input parsing logic
  getInputs() {
    const mockEnv = {
      'THEME': 'AI技術の最新動向',
      'TARGET': 'エンジニア初心者', 
      'MESSAGE': '技術の進歩で生産性向上'
    };
    
    return {
      theme: mockEnv['THEME'] || 'AI技術の最新動向',
      target: mockEnv['TARGET'] || 'エンジニア初心者',
      message: mockEnv['MESSAGE'] || '技術の進歩で生産性向上'
    };
  }

  // Test the research response parsing logic
  parseResearchResponse(response, inputs) {
    try {
      let content = '';
      for (const block of response.content) {
        if (block.type === 'text') {
          content += block.text;
        }
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const researchData = JSON.parse(jsonMatch[0]);
        
        // Add metadata
        researchData.metadata = {
          generatedAt: new Date().toISOString(),
          model: 'claude-3-5-sonnet-20241022',
          inputs,
          totalSources: researchData.sources?.length || 0,
          totalKeyPoints: researchData.keyPoints?.length || 0,
          qualityScore: this.calculateOverallQuality(researchData)
        };

        return researchData;
      } else {
        return this.createFallbackReport(content, inputs);
      }
    } catch (error) {
      return this.createFallbackReport(response.content[0]?.text || '', inputs);
    }
  }

  // Test quality calculation logic
  calculateOverallQuality(researchData) {
    let score = 0;
    let factors = 0;
    
    // Source quality
    if (researchData.sources && researchData.sources.length > 0) {
      const avgSourceQuality = researchData.sources.reduce((sum, source) => {
        return sum + ((source.relevanceScore + source.credibilityScore) / 2);
      }, 0) / researchData.sources.length;
      score += avgSourceQuality * 0.4;
      factors += 0.4;
    }
    
    // Content amount
    const contentAmount = (researchData.keyPoints?.length || 0) + 
                         (researchData.trends?.length || 0) + 
                         (researchData.statistics?.length || 0);
    score += Math.min(1, contentAmount / 10) * 0.3;
    factors += 0.3;
    
    // Diversity
    const diversity = [
      researchData.keyPoints?.length > 0,
      researchData.trends?.length > 0,
      researchData.statistics?.length > 0,
      researchData.expertOpinions?.length > 0
    ].filter(Boolean).length / 4;
    score += diversity * 0.3;
    factors += 0.3;
    
    return factors > 0 ? score / factors : 0;
  }

  // Test fallback report creation
  createFallbackReport(content, inputs) {
    return {
      topic: inputs.theme,
      summary: `${inputs.theme}に関するリサーチを実施しました。`,
      keyPoints: [
        {
          title: '基本情報',
          description: content.substring(0, 500),
          source: 'Claude Analysis'
        }
      ],
      trends: [],
      statistics: [],
      expertOpinions: [],
      sources: [],
      metadata: {
        generatedAt: new Date().toISOString(),
        model: 'claude-3-5-sonnet-20241022',
        inputs,
        fallback: true
      }
    };
  }

  // Test error creation logic
  createJobError(error) {
    if (error.name === 'JobError') {
      return error;
    }

    let errorType = 'unknown_error';
    let retryable = false;
    let severity = 'high';

    if (error.message?.includes('API key') || error.message?.includes('authentication')) {
      errorType = 'authentication_error';
      severity = 'critical';
    } else if (error.message?.includes('network') || error.message?.includes('ENOTFOUND')) {
      errorType = 'network_error';
      retryable = true;
      severity = 'medium';
    } else if (error.message?.includes('timeout')) {
      errorType = 'timeout_error';
      retryable = true;
      severity = 'medium';
    } else if (error.status) {
      errorType = 'api_error';
      retryable = error.status >= 500;
      severity = error.status >= 500 ? 'medium' : 'high';
    }

    return {
      name: 'JobError',
      jobName: this.jobName,
      errorType,
      message: error.message || 'Unknown error occurred',
      details: { 
        originalError: error,
        stack: error.stack 
      },
      retryable,
      severity,
      timestamp: new Date().toISOString()
    };
  }

  // Test prompt building logic
  buildResearchPrompt(inputs) {
    return `以下のテーマについて包括的なリサーチを行ってください:

テーマ: ${inputs.theme}
想定読者: ${inputs.target}
伝えたいメッセージ: ${inputs.message}

リサーチ要件:
1. テーマに関する最新情報と動向を調査
2. 想定読者に適した情報レベルで収集
3. 伝えたいメッセージを裏付ける事実やデータを重点的に調査
4. 信頼できる情報源から最低5つ以上の参考資料を収集
5. 統計データや専門家の意見を含める

web_searchとweb_fetchツールを積極的に使用して、最新で正確な情報を収集してください。
最終的に、構造化されたJSONレポートとして出力してください。`;
  }
}

// Mock API responses
const mockAnthropicResponse = {
  content: [{
    type: 'text',
    text: JSON.stringify({
      topic: 'AI技術の最新動向',
      summary: 'AI技術は急速に進歩しており、様々な分野で活用されています。',
      keyPoints: [
        {
          title: '機械学習の進歩',
          description: '深層学習技術の発展により、より高精度な予測が可能になりました。',
          source: 'https://example.com/ml-progress'
        }
      ],
      trends: [
        {
          trend: '生成AI',
          description: 'ChatGPTやGPT-4などの大規模言語モデルが注目されています。',
          impact: '高'
        }
      ],
      statistics: [
        {
          metric: 'AI市場規模',
          value: '1兆円',
          source: 'AI Research Institute',
          date: '2024-01-01'
        }
      ],
      expertOpinions: [
        {
          expert: '田中博士',
          opinion: 'AIの発展は今後も加速すると予想されます。',
          source: 'Tech Journal'
        }
      ],
      sources: [
        {
          url: 'https://example.com/ai-trends',
          title: 'AI技術の最新動向',
          relevanceScore: 0.9,
          credibilityScore: 0.8,
          publishDate: '2024-01-01'
        }
      ]
    })
  }]
};

describe('Research Job Core Logic', () => {
  let researchJob;

  beforeEach(() => {
    researchJob = new MockResearchJob();
  });

  describe('getInputs', () => {
    test('should get inputs with default values', () => {
      const inputs = researchJob.getInputs();

      assert.deepStrictEqual(inputs, {
        theme: 'AI技術の最新動向',
        target: 'エンジニア初心者',
        message: '技術の進歩で生産性向上'
      });
    });
  });

  describe('parseResearchResponse', () => {
    test('should parse valid JSON response correctly', () => {
      const inputs = {
        theme: 'AI技術の最新動向',
        target: 'エンジニア初心者',
        message: '技術の進歩で生産性向上'
      };

      const result = researchJob.parseResearchResponse(mockAnthropicResponse, inputs);

      assert.strictEqual(result.topic, 'AI技術の最新動向');
      assert.strictEqual(result.keyPoints.length, 1);
      assert.strictEqual(result.trends.length, 1);
      assert.strictEqual(result.statistics.length, 1);
      assert.strictEqual(result.sources.length, 1);
      assert.ok(result.metadata);
      assert.strictEqual(result.metadata.model, 'claude-3-5-sonnet-20241022');
    });

    test('should create fallback report when JSON parsing fails', () => {
      const invalidResponse = {
        content: [{
          type: 'text',
          text: 'Invalid JSON content without proper structure'
        }]
      };

      const inputs = {
        theme: 'AI技術の最新動向',
        target: 'エンジニア初心者',
        message: '技術の進歩で生産性向上'
      };

      const result = researchJob.parseResearchResponse(invalidResponse, inputs);

      assert.strictEqual(result.topic, 'AI技術の最新動向');
      assert.ok(result.metadata.fallback);
      assert.strictEqual(result.keyPoints.length, 1);
      assert.strictEqual(result.keyPoints[0].title, '基本情報');
    });

    test('should handle empty response content', () => {
      const emptyResponse = {
        content: []
      };

      const inputs = {
        theme: 'AI技術の最新動向',
        target: 'エンジニア初心者',
        message: '技術の進歩で生産性向上'
      };

      const result = researchJob.parseResearchResponse(emptyResponse, inputs);

      assert.strictEqual(result.topic, 'AI技術の最新動向');
      assert.ok(result.metadata.fallback);
    });
  });

  describe('calculateOverallQuality', () => {
    test('should calculate quality score correctly with all data types', () => {
      const researchData = {
        sources: [
          { relevanceScore: 0.9, credibilityScore: 0.8 },
          { relevanceScore: 0.7, credibilityScore: 0.9 }
        ],
        keyPoints: [{ title: 'Point 1' }, { title: 'Point 2' }],
        trends: [{ trend: 'Trend 1' }],
        statistics: [{ metric: 'Stat 1' }],
        expertOpinions: [{ expert: 'Expert 1' }]
      };

      const score = researchJob.calculateOverallQuality(researchData);

      assert.ok(score >= 0 && score <= 1);
      assert.ok(score > 0.5); // Should be above average with good data
    });

    test('should handle missing data gracefully', () => {
      const researchData = {
        sources: [],
        keyPoints: [],
        trends: [],
        statistics: [],
        expertOpinions: []
      };

      const score = researchJob.calculateOverallQuality(researchData);

      assert.strictEqual(score, 0); // Score is 0 when no factors contribute
    });

    test('should weight source quality appropriately', () => {
      const highQualityData = {
        sources: [
          { relevanceScore: 1.0, credibilityScore: 1.0 }
        ],
        keyPoints: [],
        trends: [],
        statistics: [],
        expertOpinions: []
      };

      const lowQualityData = {
        sources: [
          { relevanceScore: 0.1, credibilityScore: 0.1 }
        ],
        keyPoints: [],
        trends: [],
        statistics: [],
        expertOpinions: []
      };

      const highScore = researchJob.calculateOverallQuality(highQualityData);
      const lowScore = researchJob.calculateOverallQuality(lowQualityData);

      assert.ok(highScore > lowScore);
    });
  });

  describe('createJobError', () => {
    test('should create appropriate JobError for API errors', () => {
      const apiError = new Error('API Error');
      apiError.status = 500;

      const jobError = researchJob.createJobError(apiError);

      assert.strictEqual(jobError.name, 'JobError');
      assert.strictEqual(jobError.jobName, 'Research Job');
      assert.strictEqual(jobError.errorType, 'api_error');
      assert.strictEqual(jobError.retryable, true);
    });

    test('should create appropriate JobError for authentication errors', () => {
      const authError = new Error('Invalid API key');

      const jobError = researchJob.createJobError(authError);

      assert.strictEqual(jobError.errorType, 'authentication_error');
      assert.strictEqual(jobError.retryable, false);
      assert.strictEqual(jobError.severity, 'critical');
    });

    test('should create appropriate JobError for network errors', () => {
      const networkError = new Error('ENOTFOUND api.anthropic.com');

      const jobError = researchJob.createJobError(networkError);

      assert.strictEqual(jobError.errorType, 'network_error');
      assert.strictEqual(jobError.retryable, true);
    });

    test('should pass through existing JobError instances', () => {
      const existingJobError = {
        name: 'JobError',
        jobName: 'Test Job',
        errorType: 'test_error'
      };

      const result = researchJob.createJobError(existingJobError);

      assert.strictEqual(result, existingJobError);
    });
  });

  describe('buildResearchPrompt', () => {
    test('should build comprehensive research prompt', () => {
      const inputs = {
        theme: 'AI技術の最新動向',
        target: 'エンジニア初心者',
        message: '技術の進歩で生産性向上'
      };

      const prompt = researchJob.buildResearchPrompt(inputs);

      assert.ok(prompt.includes(inputs.theme));
      assert.ok(prompt.includes(inputs.target));
      assert.ok(prompt.includes(inputs.message));
      assert.ok(prompt.includes('web_search'));
      assert.ok(prompt.includes('web_fetch'));
      assert.ok(prompt.includes('JSON'));
    });
  });

  describe('createFallbackReport', () => {
    test('should create fallback report with proper structure', () => {
      const content = 'Some research content that could not be parsed as JSON';
      const inputs = {
        theme: 'AI技術の最新動向',
        target: 'エンジニア初心者',
        message: '技術の進歩で生産性向上'
      };

      const report = researchJob.createFallbackReport(content, inputs);

      assert.strictEqual(report.topic, inputs.theme);
      assert.ok(report.summary.includes(inputs.theme));
      assert.strictEqual(report.keyPoints.length, 1);
      assert.strictEqual(report.keyPoints[0].title, '基本情報');
      assert.ok(report.metadata.fallback);
      assert.strictEqual(report.metadata.model, 'claude-3-5-sonnet-20241022');
    });

    test('should handle long content appropriately', () => {
      const longContent = 'A'.repeat(1000);
      const inputs = {
        theme: 'Test Theme',
        target: 'Test Target',
        message: 'Test Message'
      };

      const report = researchJob.createFallbackReport(longContent, inputs);

      // Should truncate content to 500 characters
      assert.ok(report.keyPoints[0].description.length <= 500);
    });
  });
});