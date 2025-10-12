/**
 * note.com Content Formatting Utilities
 */

import { Logger } from './logger.js';

export class NoteFormatter {
  /**
   * 記事をnote.com互換形式にフォーマット
   */
  static formatForNote(article) {
    try {
      Logger.info('Formatting article for note.com...');
      
      let formattedContent = article.content;
      
      // note.com特有のフォーマット調整
      formattedContent = this.adjustHeadings(formattedContent);
      formattedContent = this.formatLists(formattedContent);
      formattedContent = this.formatLinks(formattedContent);
      formattedContent = this.formatCodeBlocks(formattedContent);
      formattedContent = this.formatQuotes(formattedContent);
      formattedContent = this.addLineBreaks(formattedContent);
      formattedContent = this.optimizeForMobile(formattedContent);
      
      // note.com用のメタデータを追加
      const noteArticle = {
        title: this.optimizeTitle(article.title),
        content: formattedContent,
        tags: this.formatTags(article.tags),
        summary: article.summary,
        originalArticle: article,
        noteFormatting: {
          appliedAt: new Date().toISOString(),
          adjustments: this.getAppliedAdjustments(article.content, formattedContent)
        }
      };
      
      Logger.info('Article formatted for note.com successfully');
      return noteArticle;
      
    } catch (error) {
      Logger.error('Failed to format article for note.com', error);
      throw error;
    }
  }

  /**
   * 見出しをnote.com形式に調整
   */
  static adjustHeadings(content) {
    // H1は使用せず、H2から開始
    content = content.replace(/^# /gm, '## ');
    
    // H4以降は使用せず、H3に統一
    content = content.replace(/^#{4,} /gm, '### ');
    
    // 見出しの前後に適切な空行を追加
    content = content.replace(/^(#{2,3} .+)$/gm, '\n$1\n');
    
    return content;
  }

  /**
   * リストをnote.com形式に調整
   */
  static formatLists(content) {
    // 番号付きリストの調整
    content = content.replace(/^\d+\.\s/gm, (match, offset, string) => {
      const lineStart = string.lastIndexOf('\n', offset - 1) + 1;
      const indent = string.slice(lineStart, offset).match(/^\s*/)[0];
      return indent + match;
    });
    
    // 箇条書きリストの調整
    content = content.replace(/^[-*+]\s/gm, '- ');
    
    // ネストしたリストの調整
    content = content.replace(/^(\s+)[-*+]\s/gm, '$1- ');
    
    return content;
  }

  /**
   * リンクをnote.com形式に調整
   */
  static formatLinks(content) {
    // Markdownリンクをそのまま保持（note.comは対応している）
    // ただし、長いURLは短縮表示を推奨
    content = content.replace(/\[([^\]]{50,})\]\(([^)]+)\)/g, (match, text, url) => {
      const shortText = text.length > 50 ? text.substring(0, 47) + '...' : text;
      return `[${shortText}](${url})`;
    });
    
    // 生のURLをリンク形式に変換
    content = content.replace(/(https?:\/\/[^\s]+)/g, (match) => {
      // 既にMarkdownリンク内にある場合はスキップ
      return match;
    });
    
    return content;
  }

  /**
   * コードブロックをnote.com形式に調整
   */
  static formatCodeBlocks(content) {
    // インラインコードの調整
    content = content.replace(/`([^`]+)`/g, '`$1`');
    
    // コードブロックの調整（note.comは```をサポート）
    content = content.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      // 言語指定がある場合はそのまま、ない場合は推測
      const language = lang || this.detectCodeLanguage(code);
      return `\`\`\`${language}\n${code.trim()}\n\`\`\``;
    });
    
    return content;
  }

  /**
   * 引用をnote.com形式に調整
   */
  static formatQuotes(content) {
    // ブロック引用の調整
    content = content.replace(/^> (.+)$/gm, '> $1');
    
    // 複数行引用の調整
    content = content.replace(/^> (.+)\n^> (.+)/gm, '> $1\n> $2');
    
    return content;
  }

  /**
   * 改行を最適化
   */
  static addLineBreaks(content) {
    // 段落間の適切な空行
    content = content.replace(/\n{3,}/g, '\n\n');
    
    // 見出しの前後の空行を確保
    content = content.replace(/([^\n])\n(#{2,3} )/g, '$1\n\n$2');
    content = content.replace /(#{2,3} .+)\n([^\n])/g, '$1\n\n$2');
    
    // リストの前後の空行
    content = content.replace(/([^\n])\n([-*+] )/g, '$1\n\n$2');
    content = content.replace(/([-*+] .+)\n([^\n-*+])/g, '$1\n\n$2');
    
    return content;
  }

  /**
   * モバイル表示を最適化
   */
  static optimizeForMobile(content) {
    // 長い行を適切に分割
    const lines = content.split('\n');
    const optimizedLines = lines.map(line => {
      // 見出しやリスト項目以外の長い行を分割
      if (line.length > 80 && !line.match(/^#{2,3} /) && !line.match(/^[-*+] /)) {
        return this.wrapLongLine(line, 80);
      }
      return line;
    });
    
    return optimizedLines.join('\n');
  }

  /**
   * 長い行を適切に分割
   */
  static wrapLongLine(line, maxLength) {
    if (line.length <= maxLength) return line;
    
    const words = line.split(' ');
    const wrappedLines = [];
    let currentLine = '';
    
    for (const word of words) {
      if ((currentLine + ' ' + word).length <= maxLength) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) {
          wrappedLines.push(currentLine);
          currentLine = word;
        } else {
          // 単語自体が長すぎる場合
          wrappedLines.push(word);
        }
      }
    }
    
    if (currentLine) {
      wrappedLines.push(currentLine);
    }
    
    return wrappedLines.join('\n');
  }

  /**
   * タイトルを最適化
   */
  static optimizeTitle(title) {
    // note.comで効果的なタイトルの特徴
    let optimizedTitle = title;
    
    // 長すぎるタイトルを調整
    if (optimizedTitle.length > 50) {
      optimizedTitle = optimizedTitle.substring(0, 47) + '...';
    }
    
    // 短すぎるタイトルに補足を追加
    if (optimizedTitle.length < 15) {
      optimizedTitle += 'について解説';
    }
    
    // 特殊文字の調整
    optimizedTitle = optimizedTitle.replace(/[<>]/g, '');
    
    return optimizedTitle;
  }

  /**
   * タグをnote.com形式に調整
   */
  static formatTags(tags) {
    if (!Array.isArray(tags)) return [];
    
    return tags
      .map(tag => {
        // タグの正規化
        let formattedTag = tag.trim();
        
        // 英数字と日本語のみ許可
        formattedTag = formattedTag.replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '');
        
        // 長すぎるタグを短縮
        if (formattedTag.length > 20) {
          formattedTag = formattedTag.substring(0, 20);
        }
        
        return formattedTag;
      })
      .filter(tag => tag.length > 0)
      .slice(0, 5); // note.comは最大5つのタグ
  }

  /**
   * コード言語を推測
   */
  static detectCodeLanguage(code) {
    const trimmedCode = code.trim();
    
    // JavaScript/TypeScript
    if (trimmedCode.includes('function') || trimmedCode.includes('=>') || 
        trimmedCode.includes('const ') || trimmedCode.includes('let ')) {
      return 'javascript';
    }
    
    // Python
    if (trimmedCode.includes('def ') || trimmedCode.includes('import ') || 
        trimmedCode.includes('print(')) {
      return 'python';
    }
    
    // HTML
    if (trimmedCode.includes('<') && trimmedCode.includes('>')) {
      return 'html';
    }
    
    // CSS
    if (trimmedCode.includes('{') && trimmedCode.includes(':') && 
        trimmedCode.includes(';')) {
      return 'css';
    }
    
    // JSON
    if ((trimmedCode.startsWith('{') && trimmedCode.endsWith('}')) ||
        (trimmedCode.startsWith('[') && trimmedCode.endsWith(']'))) {
      return 'json';
    }
    
    // Shell/Bash
    if (trimmedCode.includes('$') || trimmedCode.includes('#!/')) {
      return 'bash';
    }
    
    return 'text';
  }

  /**
   * 適用された調整を記録
   */
  static getAppliedAdjustments(original, formatted) {
    const adjustments = [];
    
    if (original !== formatted) {
      // 見出しの調整
      if (original.includes('# ') && !formatted.includes('# ')) {
        adjustments.push('heading_adjustment');
      }
      
      // 改行の調整
      if (original.split('\n').length !== formatted.split('\n').length) {
        adjustments.push('line_break_optimization');
      }
      
      // リストの調整
      if (original.match(/^[-*+]/m) && formatted.match(/^-/m)) {
        adjustments.push('list_formatting');
      }
      
      // コードブロックの調整
      if (original.includes('```') && formatted.includes('```')) {
        adjustments.push('code_block_formatting');
      }
    }
    
    return adjustments;
  }

  /**
   * note.com投稿用のデータ構造を作成
   */
  static createNotePostData(noteArticle) {
    return {
      title: noteArticle.title,
      content: noteArticle.content,
      tags: noteArticle.tags,
      status: 'draft', // 'draft' または 'published'
      metadata: {
        summary: noteArticle.summary,
        wordCount: noteArticle.originalArticle.metadata?.wordCount || 0,
        estimatedReadingTime: noteArticle.originalArticle.metadata?.estimatedReadingTime || 0,
        qualityScore: noteArticle.originalArticle.qualityScore || 0,
        formattedAt: noteArticle.noteFormatting.appliedAt
      }
    };
  }

  /**
   * プレビュー用HTML生成
   */
  static generatePreviewHTML(noteArticle) {
    const content = noteArticle.content
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
      .replace(/\n/g, '<br>');
    
    return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${noteArticle.title} - Preview</title>
    <style>
        body { 
            font-family: 'Helvetica Neue', Arial, sans-serif; 
            line-height: 1.6; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px;
            background: #f8f9fa;
        }
        .article {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #333; border-bottom: 2px solid #007acc; padding-bottom: 10px; }
        h2 { color: #444; margin-top: 30px; }
        h3 { color: #555; }
        .tags { margin-top: 30px; }
        .tag { 
            display: inline-block; 
            background: #007acc; 
            color: white; 
            padding: 4px 8px; 
            border-radius: 4px; 
            margin-right: 8px; 
            font-size: 0.9em;
        }
        .metadata {
            background: #f1f3f4;
            padding: 15px;
            border-radius: 4px;
            margin-top: 20px;
            font-size: 0.9em;
            color: #666;
        }
        blockquote {
            border-left: 4px solid #007acc;
            margin: 0;
            padding-left: 20px;
            font-style: italic;
            color: #666;
        }
        code {
            background: #f1f3f4;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Monaco', 'Consolas', monospace;
        }
    </style>
</head>
<body>
    <div class="article">
        <h1>${noteArticle.title}</h1>
        ${content}
        
        <div class="tags">
            ${noteArticle.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
        </div>
        
        <div class="metadata">
            <strong>記事情報:</strong><br>
            文字数: ${noteArticle.originalArticle.metadata?.characterCount || 0}文字 | 
            推定読了時間: ${noteArticle.originalArticle.metadata?.estimatedReadingTime || 0}分 | 
            品質スコア: ${((noteArticle.originalArticle.qualityScore || 0) * 100).toFixed(1)}%
        </div>
    </div>
</body>
</html>`;
  }
}