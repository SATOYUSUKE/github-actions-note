import { test, describe } from 'node:test';
import assert from 'node:assert';
import { WritingJob } from '../../jobs/writing-job.js';

describe('WritingJob System Prompt Tests', () => {
  test('getSystemPrompt includes current year', () => {
    const writingJob = new WritingJob();
    const systemPrompt = writingJob.getSystemPrompt();
    const currentYear = new Date().getFullYear();
    
    // 現在の年が含まれていることを確認
    assert(systemPrompt.includes(currentYear.toString()), 
           `System prompt should include current year ${currentYear}`);
    
    // 年の言及に関する指示が含まれていることを確認
    assert(systemPrompt.includes('現在は'), 
           'System prompt should include current year instruction');
    
    // 時間的情報の基準年に関する指示が含まれていることを確認
    assert(systemPrompt.includes('時間的な情報は'), 
           'System prompt should include temporal information instruction');
  });

  test('getSystemPrompt returns consistent format', () => {
    const writingJob = new WritingJob();
    const systemPrompt = writingJob.getSystemPrompt();
    
    // 基本的な構造が含まれていることを確認
    assert(systemPrompt.includes('あなたは優秀なライターです'), 
           'System prompt should include writer instruction');
    
    assert(systemPrompt.includes('記事執筆の要件'), 
           'System prompt should include writing requirements');
    
    assert(systemPrompt.includes('出力形式'), 
           'System prompt should include output format instruction');
  });

  test('getSystemPrompt year updates dynamically', () => {
    const writingJob = new WritingJob();
    
    // 複数回呼び出しても同じ年が返されることを確認
    const prompt1 = writingJob.getSystemPrompt();
    const prompt2 = writingJob.getSystemPrompt();
    
    assert.strictEqual(prompt1, prompt2, 
                      'System prompt should be consistent across calls');
    
    // 現在の年が正しく含まれていることを確認
    const currentYear = new Date().getFullYear();
    const yearMatches = prompt1.match(new RegExp(currentYear.toString(), 'g'));
    
    assert(yearMatches && yearMatches.length >= 2, 
           `System prompt should contain current year ${currentYear} at least twice`);
  });
});