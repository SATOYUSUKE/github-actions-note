import { test, describe } from 'node:test';
import assert from 'node:assert';
import { ResearchJob } from '../../jobs/research-job.js';

describe('ResearchJob System Prompt Tests', () => {
  test('getSystemPrompt includes current year', () => {
    const researchJob = new ResearchJob();
    const systemPrompt = researchJob.getSystemPrompt();
    const currentYear = new Date().getFullYear();
    
    // 現在の年が含まれていることを確認
    assert(systemPrompt.includes(currentYear.toString()), 
           `System prompt should include current year ${currentYear}`);
    
    // 最新データの優先に関する指示が含まれていることを確認
    assert(systemPrompt.includes('最新の情報') || systemPrompt.includes('最新のデータ'), 
           'System prompt should include latest data instruction');
    
    // 検索クエリに年を含める指示が含まれていることを確認
    assert(systemPrompt.includes('検索') || systemPrompt.includes('リサーチ'), 
           'System prompt should include search instruction');
  });

  test('buildResearchPrompt includes current year in fallback', () => {
    const researchJob = new ResearchJob();
    
    // 空の入力でフォールバックプロンプトをテスト
    const prompt = researchJob.buildResearchPrompt({});
    const currentYear = new Date().getFullYear();
    
    // 現在の年が含まれていることを確認
    assert(prompt.includes(currentYear.toString()), 
           `Research prompt should include current year ${currentYear}`);
    
    // 最新情報の優先に関する指示が含まれていることを確認
    assert(prompt.includes('最新の情報'), 
           'Research prompt should include latest information instruction');
  });

  test('getSystemPrompt returns consistent format', () => {
    const researchJob = new ResearchJob();
    const systemPrompt = researchJob.getSystemPrompt();
    
    // 基本的な構造が含まれていることを確認
    assert(systemPrompt.includes('リサーチャー') || systemPrompt.includes('researcher'), 
           'System prompt should include researcher instruction');
    
    assert(systemPrompt.includes('リサーチ') || systemPrompt.includes('research'), 
           'System prompt should include research process');
    
    assert(systemPrompt.includes('出力形式') || systemPrompt.includes('JSON'), 
           'System prompt should include output format instruction');
  });

  test('buildResearchPrompt with custom inputs', () => {
    const researchJob = new ResearchJob();
    const currentYear = new Date().getFullYear();
    
    const inputs = {
      theme: 'AI技術の動向',
      target: 'エンジニア',
      message: 'AI技術の最新情報を知りたい'
    };
    
    const prompt = researchJob.buildResearchPrompt(inputs);
    
    // カスタム入力が含まれていることを確認
    assert(prompt.includes(inputs.theme), 
           'Research prompt should include theme');
    
    assert(prompt.includes(inputs.target), 
           'Research prompt should include target audience');
    
    // 現在の年が含まれていることを確認（フォールバック部分）
    assert(prompt.includes(currentYear.toString()), 
           `Research prompt should include current year ${currentYear}`);
  });
});