#!/usr/bin/env node

import { StorageStateValidator } from './login-note.mjs';
import fs from 'fs';
import path from 'path';

const STATE_PATH = './note-state.json';

/**
 * Standalone storage state validation script
 */
async function main() {
  console.log('🔍 Note.com Storage State Validator');
  console.log('===================================');

  // Check if storage state file exists
  if (!fs.existsSync(STATE_PATH)) {
    console.log('❌ Storage state file not found: note-state.json');
    console.log('💡 Run login-note.mjs first to generate the storage state');
    process.exit(1);
  }

  console.log(`📁 Found storage state file: ${path.resolve(STATE_PATH)}`);
  
  // File validation
  console.log('\n📋 Step 1: File Format Validation');
  const validation = StorageStateValidator.validateStorageState(STATE_PATH);
  
  if (!validation.valid) {
    console.log(`❌ Validation failed: ${validation.reason}`);
    if (validation.expiredCookies) {
      console.log(`🍪 Expired cookies: ${validation.expiredCookies.join(', ')}`);
    }
    console.log('💡 Please run login-note.mjs again to refresh the storage state');
    process.exit(1);
  }

  console.log('✅ File format validation passed');

  // Live test
  console.log('\n🌐 Step 2: Live Authentication Test');
  const testResult = await StorageStateValidator.testStorageState(STATE_PATH);
  
  if (!testResult) {
    console.log('❌ Live authentication test failed');
    console.log('💡 The storage state may have expired. Please run login-note.mjs again');
    process.exit(1);
  }

  console.log('✅ Live authentication test passed');
  
  // File info
  const stats = fs.statSync(STATE_PATH);
  const stateData = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  
  console.log('\n📊 Storage State Information:');
  console.log(`📅 Created: ${stats.mtime.toLocaleString()}`);
  console.log(`📏 File size: ${stats.size} bytes`);
  console.log(`🍪 Total cookies: ${stateData.cookies?.length || 0}`);
  
  const noteCookies = stateData.cookies?.filter(cookie => 
    cookie.domain && cookie.domain.includes('note.com')
  ) || [];
  console.log(`🏠 Note.com cookies: ${noteCookies.length}`);
  
  // Show cookie expiry info
  if (noteCookies.length > 0) {
    const now = Date.now();
    const expiringCookies = noteCookies.filter(cookie => 
      cookie.expires && (cookie.expires * 1000 - now) < 7 * 24 * 60 * 60 * 1000 // 7 days
    );
    
    if (expiringCookies.length > 0) {
      console.log(`⚠️  ${expiringCookies.length} cookies will expire within 7 days`);
    }
  }

  console.log('\n🎉 Storage state is valid and ready to use!');
  console.log('\n📋 Next steps for GitHub Actions setup:');
  console.log('1. Copy the content of note-state.json');
  console.log('2. Go to your GitHub repository → Settings → Secrets and variables → Actions');
  console.log('3. Create a new secret named "NOTE_STORAGE_STATE"');
  console.log('4. Paste the JSON content as the secret value');
  console.log('5. Your automation workflow is ready to use!');
}

// Handle script execution
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Validation failed:', error.message);
    process.exit(1);
  });
}