import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const STATE_PATH = './note-state.json';
const BACKUP_PATH = './note-state-backup.json';

const wait = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Storage state validation utility
 */
class StorageStateValidator {
  static validateStorageState(statePath) {
    try {
      if (!fs.existsSync(statePath)) {
        return { valid: false, reason: 'Storage state file does not exist' };
      }

      const stateData = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      
      if (!stateData.cookies || !Array.isArray(stateData.cookies)) {
        return { valid: false, reason: 'Invalid storage state format: missing cookies' };
      }

      // Check for note.com cookies
      const noteCookies = stateData.cookies.filter(cookie => 
        cookie.domain && cookie.domain.includes('note.com')
      );

      if (noteCookies.length === 0) {
        return { valid: false, reason: 'No note.com cookies found in storage state' };
      }

      // Check cookie expiry
      const now = Date.now();
      const expiredCookies = noteCookies.filter(cookie => 
        cookie.expires && cookie.expires * 1000 < now
      );

      if (expiredCookies.length > 0) {
        return { 
          valid: false, 
          reason: `${expiredCookies.length} cookies have expired`,
          expiredCookies: expiredCookies.map(c => c.name)
        };
      }

      return { valid: true, reason: 'Storage state is valid' };
    } catch (error) {
      return { valid: false, reason: `Error validating storage state: ${error.message}` };
    }
  }

  static async testStorageState(statePath) {
    console.log('🔍 Testing storage state...');
    
    const validation = this.validateStorageState(statePath);
    if (!validation.valid) {
      console.log(`❌ Storage state validation failed: ${validation.reason}`);
      return false;
    }

    console.log('✅ Storage state file validation passed');

    // Test with actual browser
    const browser = await chromium.launch({
      headless: true,
      args: ['--disable-blink-features=AutomationControlled']
    });

    try {
      const context = await browser.newContext({
        storageState: statePath,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });

      const page = await context.newPage();
      await page.goto('https://note.com/', { waitUntil: 'networkidle', timeout: 30000 });

      // Check for login indicators
      const loginSelectors = [
        '[data-testid="header-user-menu"]',
        '.o-headerUserMenu',
        '.p-headerUserMenu',
        'button[aria-label*="ユーザー"]',
        'a[href*="/settings"]',
        '.header-user-menu',
        '[class*="user-menu"]',
        '[class*="UserMenu"]'
      ];

      let loginDetected = false;
      for (const selector of loginSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 2000 });
          console.log(`✅ Login state verified with selector: ${selector}`);
          loginDetected = true;
          break;
        } catch {
          // Try next selector
        }
      }

      if (!loginDetected) {
        console.log('❌ Could not verify login state');
        return false;
      }

      console.log('✅ Storage state test passed - login state is active');
      return true;

    } catch (error) {
      console.log(`❌ Storage state test failed: ${error.message}`);
      return false;
    } finally {
      await browser.close();
    }
  }
}

/**
 * Interactive login detection utility
 */
class LoginDetector {
  static async detectLogin(page, timeout = 300000) {
    console.log('🔍 Monitoring for login completion...');
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        // Method 1: Check URL change (redirect after login)
        const currentUrl = page.url();
        if (currentUrl.match(/note\.com\/?$/) && !currentUrl.includes('/login')) {
          console.log('✅ Login detected via URL change');
          return true;
        }

        // Method 2: Check for user menu elements
        const loginSelectors = [
          '[data-testid="header-user-menu"]',
          '.o-headerUserMenu',
          '.p-headerUserMenu',
          'button[aria-label*="ユーザー"]',
          'a[href*="/settings"]'
        ];

        for (const selector of loginSelectors) {
          try {
            await page.waitForSelector(selector, { timeout: 1000 });
            console.log(`✅ Login detected via selector: ${selector}`);
            return true;
          } catch {
            // Continue checking
          }
        }

        // Method 3: Check for absence of login form
        try {
          const loginForm = await page.$('form[action*="login"]');
          if (!loginForm) {
            // Double check we're not on login page
            if (!page.url().includes('/login')) {
              console.log('✅ Login detected via form absence');
              return true;
            }
          }
        } catch {
          // Continue checking
        }

        await wait(2000); // Check every 2 seconds
      } catch (error) {
        console.log(`Warning: Error during login detection: ${error.message}`);
        await wait(2000);
      }
    }

    return false;
  }
}

/**
 * Main login script
 */
async function main() {
  console.log('🚀 Note.com Login Script Starting...');
  console.log('=====================================');

  // Check if existing storage state exists and is valid
  if (fs.existsSync(STATE_PATH)) {
    console.log('📁 Found existing storage state file');
    const isValid = await StorageStateValidator.testStorageState(STATE_PATH);
    
    if (isValid) {
      console.log('✅ Existing storage state is valid and working!');
      console.log('No need to login again. Use the existing note-state.json file.');
      return;
    } else {
      console.log('⚠️  Existing storage state is invalid or expired');
      // Backup the old state
      if (fs.existsSync(STATE_PATH)) {
        fs.copyFileSync(STATE_PATH, BACKUP_PATH);
        console.log('📋 Backed up old storage state to note-state-backup.json');
      }
    }
  }

  const browser = await chromium.launch({ 
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--no-first-run',
      '--disable-default-apps'
    ]
  });
  
  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 },
      extraHTTPHeaders: {
        'Accept-Language': 'ja-JP,ja;q=0.9,en;q=0.8'
      }
    });
    
    // Anti-detection measures
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
      
      // Remove playwright traces
      delete window.__playwright;
      delete window.__pw_manual;
      delete window.__PW_inspect;
    });
    
    const page = await context.newPage();

    console.log('🌐 Navigating to note.com...');
    await page.goto('https://note.com/', { waitUntil: 'networkidle' });
    await wait(2000);
    
    console.log('🔐 Navigating to login page...');
    await page.goto('https://note.com/login', { waitUntil: 'networkidle' });
    await wait(3000);

    console.log('');
    console.log('👤 Please login manually in the browser window');
    console.log('📱 You can use email/password or social login (Google, Twitter, etc.)');
    console.log('⏱️  The script will automatically detect when login is complete');
    console.log('⚠️  If browser shows security warning, click "Advanced" → "Proceed to unsafe site"');
    console.log('');
    
    // Automatic login detection with fallback
    const loginDetected = await LoginDetector.detectLogin(page, 300000); // 5 minutes
    
    if (!loginDetected) {
      console.log('⏰ Automatic detection timed out');
      console.log('🔄 Please press Enter after completing login manually...');
      await new Promise(resolve => {
        process.stdin.once('data', () => {
          resolve();
        });
      });
    }

    console.log('💾 Saving login state...');
    await context.storageState({ path: STATE_PATH });
    
    // Validate the saved state
    console.log('🔍 Validating saved storage state...');
    const validation = StorageStateValidator.validateStorageState(STATE_PATH);
    
    if (validation.valid) {
      console.log('✅ Storage state saved and validated successfully!');
      console.log(`📁 File saved to: ${path.resolve(STATE_PATH)}`);
      
      // Test the saved state
      const testResult = await StorageStateValidator.testStorageState(STATE_PATH);
      if (testResult) {
        console.log('🎉 Login setup completed successfully!');
        console.log('');
        console.log('Next steps:');
        console.log('1. Copy note-state.json to your GitHub repository');
        console.log('2. Add the content as NOTE_STORAGE_STATE secret in GitHub');
        console.log('3. Run the automation workflow');
      } else {
        console.log('⚠️  Storage state saved but test failed. You may need to try again.');
      }
    } else {
      console.log(`❌ Storage state validation failed: ${validation.reason}`);
      console.log('Please try running the script again.');
    }

  } catch (error) {
    console.error('❌ Error during login process:', error.message);
    throw error;
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
}

// Handle script execution
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  });
}

export { StorageStateValidator, LoginDetector };