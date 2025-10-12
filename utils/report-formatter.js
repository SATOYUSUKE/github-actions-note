/**
 * Research Report Formatting Utilities
 */

import { Logger } from './logger.js';
import { FileManager } from './file-manager.js';

export class ReportFormatter {
  /**
   * リサーチレポートをMarkdown形式でフォーマット
   */
  static formatAsMarkdown(researchData) {
    try {
      let markdown = '';
      
      // ヘッダー
      markdown += `# リサーチレポート: ${researchData.topic}\n\n`;
      markdown += `**生成日時**: ${new Date(researchData.metadata.generatedAt).toLocaleString('ja-JP')}\n`;
      markdown += `**品質スコア**: ${(researchData.metadata.qualityScore * 100).toFixed(1)}%\n\n`;
      
      // 概要
      if (researchData.summary) {
        markdown += `## 概要\n\n${researchData.summary}\n\n`;
      }
      
      // 重要ポイント
      if (researchData.keyPoints && researchData.keyPoints.length > 0) {
        markdown += `## 重要ポイント\n\n`;
        researchData.keyPoints.forEach((point, index) => {
          markdown += `### ${index + 1}. ${point.title}\n\n`;
          markdown += `${point.description}\n\n`;
          if (point.source) {
            markdown += `**出典**: [${point.source}](${point.source})\n\n`;
          }
        });
      }
      
      // トレンド
      if (researchData.trends && researchData.trends.length > 0) {
        markdown += `## トレンド分析\n\n`;
        researchData.trends.forEach((trend, index) => {
          markdown += `### ${trend.trend}\n\n`;
          markdown += `${trend.description}\n\n`;
          markdown += `**影響度**: ${trend.impact}\n\n`;
        });
      }
      
      // 統計データ
      if (researchData.statistics && researchData.statistics.length > 0) {
        markdown += `## 統計データ\n\n`;
        markdown += `| 項目 | 数値 | データ源 | 取得日 |\n`;
        markdown += `|------|------|----------|--------|\n`;
        researchData.statistics.forEach(stat => {
          markdown += `| ${stat.metric} | ${stat.value} | ${stat.source} | ${stat.date || 'N/A'} |\n`;
        });
        markdown += `\n`;
      }
      
      // 専門家の意見
      if (researchData.expertOpinions && researchData.expertOpinions.length > 0) {
        markdown += `## 専門家の意見\n\n`;
        researchData.expertOpinions.forEach((opinion, index) => {
          markdown += `### ${opinion.expert}\n\n`;
          markdown += `> ${opinion.opinion}\n\n`;
          if (opinion.source) {
            markdown += `**出典**: [${opinion.source}](${opinion.source})\n\n`;
          }
        });
      }
      
      // 参考資料
      if (researchData.sources && researchData.sources.length > 0) {
        markdown += `## 参考資料\n\n`;
        researchData.sources.forEach((source, index) => {
          markdown += `${index + 1}. **[${source.title}](${source.url})**\n`;
          if (source.publishDate) {
            markdown += `   - 公開日: ${source.publishDate}\n`;
          }
          markdown += `   - 関連性: ${(source.relevanceScore * 100).toFixed(1)}%\n`;
          markdown += `   - 信頼性: ${(source.credibilityScore * 100).toFixed(1)}%\n\n`;
        });
      }
      
      // キーワード
      if (researchData.metadata.keywords && researchData.metadata.keywords.length > 0) {
        markdown += `## 抽出キーワード\n\n`;
        markdown += researchData.metadata.keywords.map(keyword => `\`${keyword}\``).join(', ');
        markdown += `\n\n`;
      }
      
      return markdown;
      
    } catch (error) {
      Logger.error('Failed to format research report as markdown', error);
      return `# リサーチレポート\n\nエラーが発生しました: ${error.message}`;
    }
  }

  /**
   * リサーチレポートをHTML形式でフォーマット
   */
  static formatAsHTML(researchData) {
    try {
      let html = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>リサーチレポート: ${researchData.topic}</title>
    <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; margin: 40px; }
        .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .metadata { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .section { margin-bottom: 30px; }
        .quality-score { display: inline-block; background: #4CAF50; color: white; padding: 5px 10px; border-radius: 3px; }
        .source-item { background: #f9f9f9; padding: 10px; margin: 10px 0; border-left: 4px solid #2196F3; }
        .score { font-weight: bold; color: #666; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f2f2f2; }
        blockquote { border-left: 4px solid #ccc; margin: 0; padding-left: 20px; font-style: italic; }
    </style>
</head>
<body>
    <div class="header">
        <h1>リサーチレポート: ${researchData.topic}</h1>
        <div class="metadata">
            <strong>生成日時:</strong> ${new Date(researchData.metadata.generatedAt).toLocaleString('ja-JP')}<br>
            <strong>品質スコア:</strong> <span class="quality-score">${(researchData.metadata.qualityScore * 100).toFixed(1)}%</span>
        </div>
    </div>
`;

      // 概要
      if (researchData.summary) {
        html += `
    <div class="section">
        <h2>概要</h2>
        <p>${researchData.summary}</p>
    </div>
`;
      }

      // 重要ポイント
      if (researchData.keyPoints && researchData.keyPoints.length > 0) {
        html += `
    <div class="section">
        <h2>重要ポイント</h2>
`;
        researchData.keyPoints.forEach((point, index) => {
          html += `
        <h3>${index + 1}. ${point.title}</h3>
        <p>${point.description}</p>
        ${point.source ? `<p><strong>出典:</strong> <a href="${point.source}" target="_blank">${point.source}</a></p>` : ''}
`;
        });
        html += `    </div>\n`;
      }

      // 参考資料
      if (researchData.sources && researchData.sources.length > 0) {
        html += `
    <div class="section">
        <h2>参考資料</h2>
`;
        researchData.sources.forEach((source, index) => {
          html += `
        <div class="source-item">
            <strong><a href="${source.url}" target="_blank">${source.title}</a></strong><br>
            ${source.publishDate ? `公開日: ${source.publishDate}<br>` : ''}
            <span class="score">関連性: ${(source.relevanceScore * 100).toFixed(1)}%</span> | 
            <span class="score">信頼性: ${(source.credibilityScore * 100).toFixed(1)}%</span>
        </div>
`;
        });
        html += `    </div>\n`;
      }

      html += `
</body>
</html>`;

      return html;
      
    } catch (error) {
      Logger.error('Failed to format research report as HTML', error);
      return `<html><body><h1>エラー</h1><p>${error.message}</p></body></html>`;
    }
  }

  /**
   * サマリーレポートを生成
   */
  static generateSummary(researchData) {
    try {
      const summary = {
        topic: researchData.topic,
        generatedAt: researchData.metadata.generatedAt,
        qualityScore: researchData.metadata.qualityScore,
        stats: {
          totalSources: researchData.sources?.length || 0,
          totalKeyPoints: researchData.keyPoints?.length || 0,
          totalTrends: researchData.trends?.length || 0,
          totalStatistics: researchData.statistics?.length || 0,
          totalExpertOpinions: researchData.expertOpinions?.length || 0
        },
        topSources: researchData.sources?.slice(0, 3).map(source => ({
          title: source.title,
          url: source.url,
          qualityScore: ((source.relevanceScore + source.credibilityScore) / 2 * 100).toFixed(1)
        })) || [],
        keywords: researchData.metadata.keywords?.slice(0, 5) || []
      };

      return summary;
      
    } catch (error) {
      Logger.error('Failed to generate summary', error);
      return {
        topic: researchData.topic || 'Unknown',
        error: error.message
      };
    }
  }

  /**
   * GitHub Actions用の出力フォーマット
   */
  static formatForGitHubActions(researchData) {
    try {
      // 重要な情報のみを抽出してサイズを最小化
      const compactData = {
        topic: researchData.topic,
        summary: researchData.summary,
        keyPoints: researchData.keyPoints?.slice(0, 5) || [], // 最大5つ
        topSources: researchData.sources?.slice(0, 3) || [], // 最大3つ
        keywords: researchData.metadata?.keywords?.slice(0, 10) || [],
        qualityScore: researchData.metadata?.qualityScore || 0,
        generatedAt: researchData.metadata?.generatedAt
      };

      return compactData;
      
    } catch (error) {
      Logger.error('Failed to format for GitHub Actions', error);
      return {
        topic: researchData.topic || 'Unknown',
        error: error.message
      };
    }
  }

  /**
   * 複数フォーマットで出力を保存
   */
  static async saveMultipleFormats(researchData, outputDir = 'outputs') {
    try {
      await FileManager.ensureDirectory(outputDir);
      
      const results = {
        json: `${outputDir}/research-report.json`,
        markdown: `${outputDir}/research-report.md`,
        html: `${outputDir}/research-report.html`,
        summary: `${outputDir}/research-summary.json`
      };

      // JSON形式で保存
      await FileManager.writeJSON(results.json, researchData);
      
      // Markdown形式で保存
      const markdownContent = this.formatAsMarkdown(researchData);
      await FileManager.writeFile(results.markdown, markdownContent);
      
      // HTML形式で保存
      const htmlContent = this.formatAsHTML(researchData);
      await FileManager.writeFile(results.html, htmlContent);
      
      // サマリーを保存
      const summary = this.generateSummary(researchData);
      await FileManager.writeJSON(results.summary, summary);
      
      Logger.info('Research report saved in multiple formats:', results);
      return results;
      
    } catch (error) {
      Logger.error('Failed to save multiple formats', error);
      throw error;
    }
  }
}