import { test, describe } from 'node:test';
import assert from 'node:assert';
import { FactCheckAnalyzer } from '../../utils/fact-check-analyzer.js';

describe('FactCheckAnalyzer Temporal Validation Tests', () => {
  test('validateTemporalClaims detects outdated years', () => {
    const currentYear = new Date().getFullYear();
    const outdatedYear = currentYear - 3; // 3年前
    
    const temporalClaims = [
      {
        text: `${outdatedYear}年のデータによると、AI市場は成長しています`,
        type: 'temporal_year',
        confidence: 0.8,
        extractedData: {
          year: outdatedYear.toString()
        }
      },
      {
        text: `${currentYear}年の最新調査では、技術が進歩しています`,
        type: 'temporal_year',
        confidence: 0.9,
        extractedData: {
          year: currentYear.toString()
        }
      }
    ];
    
    const validatedClaims = FactCheckAnalyzer.validateTemporalClaims(temporalClaims);
    
    // 古い年のクレームが検出されることを確認
    const outdatedClaim = validatedClaims.find(claim => 
      claim.text.includes(outdatedYear.toString())
    );
    
    assert(outdatedClaim, 'Should find outdated claim');
    assert(outdatedClaim.isOutdated, 'Claim should be marked as outdated');
    assert(outdatedClaim.yearDifference === 3, 'Year difference should be 3');
    assert(outdatedClaim.suggestedCorrection.includes(currentYear.toString()), 
           'Suggested correction should include current year');
    
    // 現在年のクレームは問題ないことを確認
    const currentClaim = validatedClaims.find(claim => 
      claim.text.includes(currentYear.toString())
    );
    
    assert(currentClaim, 'Should find current year claim');
    assert(!currentClaim.isOutdated, 'Current year claim should not be outdated');
  });

  test('validateTemporalClaims handles recent years', () => {
    const currentYear = new Date().getFullYear();
    const recentYear = currentYear - 1;
    
    const temporalClaims = [
      {
        text: `${recentYear}年の研究結果によると、効果が確認されています`,
        type: 'temporal_year',
        confidence: 0.7,
        extractedData: {
          year: recentYear.toString()
        }
      }
    ];
    
    const validatedClaims = FactCheckAnalyzer.validateTemporalClaims(temporalClaims);
    const recentClaim = validatedClaims[0];
    
    // 1年前のデータは古いとマークされないことを確認
    assert(!recentClaim.isOutdated, 'Last year claim should not be marked as outdated');
    assert(recentClaim.yearDifference === 1, 'Year difference should be calculated for recent years too');
  });

  test('validateTemporalClaims handles multiple year patterns', () => {
    const currentYear = new Date().getFullYear();
    const veryOldYear = currentYear - 5;
    
    const temporalClaims = [
      {
        text: `${veryOldYear}年から${currentYear}年にかけて、技術は進歩しました`,
        type: 'temporal_year',
        confidence: 0.7,
        extractedData: {
          year: veryOldYear.toString()
        }
      }
    ];
    
    const validatedClaims = FactCheckAnalyzer.validateTemporalClaims(temporalClaims);
    const multiYearClaim = validatedClaims[0];
    
    // 複数年を含むクレームで古い年が検出されることを確認
    assert(multiYearClaim.isOutdated, 'Multi-year claim with old year should be outdated');
    assert(multiYearClaim.yearDifference === 5, 'Should detect the oldest year difference');
  });

  test('validateTemporalClaims handles non-temporal claims', () => {
    const nonTemporalClaims = [
      {
        text: 'AIは人工知能の略称です',
        type: 'factual',
        confidence: 0.9
      }
    ];
    
    const validatedClaims = FactCheckAnalyzer.validateTemporalClaims(nonTemporalClaims);
    const nonTemporalClaim = validatedClaims[0];
    
    // 非時間的クレームは変更されないことを確認
    assert(!nonTemporalClaim.isOutdated, 'Non-temporal claims should not be marked as outdated');
    assert(!nonTemporalClaim.yearDifference, 'Non-temporal claims should not have year difference');
    assert(!nonTemporalClaim.suggestedCorrection, 'Non-temporal claims should not have corrections');
  });

  test('extractAdvancedClaims integration with validateTemporalClaims', () => {
    const currentYear = new Date().getFullYear();
    const oldYear = currentYear - 4;
    
    const content = `${oldYear}年のデータによると、AI技術は急速に発展しています。
    また、${currentYear}年の調査では、さらなる進歩が見られます。`;
    
    const claims = FactCheckAnalyzer.extractAdvancedClaims(content);
    
    // 時間的クレームが抽出され、検証されていることを確認
    const temporalClaims = claims.filter(claim => claim.type === 'temporal_year');
    assert(temporalClaims.length > 0, 'Should extract temporal claims');
    
    // 古い年のクレームが適切に検証されていることを確認
    const outdatedClaim = temporalClaims.find(claim => 
      claim.text.includes(oldYear.toString()) && claim.isOutdated
    );
    
    assert(outdatedClaim, 'Should find and validate outdated temporal claim');
    assert(outdatedClaim.yearDifference === 4, 'Should calculate correct year difference');
  });
});