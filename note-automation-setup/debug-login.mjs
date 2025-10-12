import { chromium } from "playwright";
import { StorageStateValidator } from "./login-note.mjs";

const STATE_PATH = "./note-state.json";

/**
 * Debug script for testing storage state with detailed logging
 */
async function debugLogin() {
  // eslint-disable-next-line no-console
  console.log("🔍 Debug Login Test Starting...");
  // eslint-disable-next-line no-console
  console.log("================================");

  // First validate the storage state file
  // eslint-disable-next-line no-console
  console.log("📋 Step 1: Validating storage state file...");
  const validation = StorageStateValidator.validateStorageState(STATE_PATH);

  if (!validation.valid) {
    // eslint-disable-next-line no-console
    console.log(`❌ Storage state validation failed: ${validation.reason}`);
    if (validation.expiredCookies) {
      // eslint-disable-next-line no-console
      console.log(`🍪 Expired cookies: ${validation.expiredCookies.join(", ")}`);
    }
    // eslint-disable-next-line no-console
    console.log("💡 Please run login-note.mjs to refresh the storage state");
    return;
  }

  // eslint-disable-next-line no-console
  console.log("✅ Storage state file validation passed");

  // Launch browser for detailed testing
  // eslint-disable-next-line no-console
  console.log("\n🌐 Step 2: Testing with browser...");
  const browser = await chromium.launch({
    headless: false,
    args: ["--disable-blink-features=AutomationControlled", "--disable-web-security"],
  });

  try {
    const context = await browser.newContext({
      storageState: STATE_PATH,
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 720 },
    });

    const page = await context.newPage();

    // eslint-disable-next-line no-console
    console.log("🏠 Navigating to note.com homepage...");
    await page.goto("https://note.com/", { waitUntil: "networkidle" });

    // Take screenshot for debugging
    await page.screenshot({ path: "debug-homepage.png" });
    // eslint-disable-next-line no-console
    console.log("📸 Homepage screenshot saved: debug-homepage.png");

    // Check login status with multiple methods
    // eslint-disable-next-line no-console
    console.log("\n🔍 Checking login status...");

    const loginSelectors = [
      '[data-testid="header-user-menu"]',
      ".o-headerUserMenu",
      ".p-headerUserMenu",
      'button[aria-label*="ユーザー"]',
      'a[href*="/settings"]',
      ".header-user-menu",
      '[class*="user-menu"]',
      '[class*="UserMenu"]',
    ];

    let loginDetected = false;
    let detectedSelector = null;

    for (const selector of loginSelectors) {
      try {
        const element = await page.waitForSelector(selector, { timeout: 2000 });
        if (element) {
          // eslint-disable-next-line no-console
          console.log(`✅ Login detected with selector: ${selector}`);
          loginDetected = true;
          detectedSelector = selector;

          // Get element info for debugging
          const elementInfo = await element.evaluate((el) => ({
            tagName: el.tagName,
            className: el.className,
            textContent: el.textContent?.substring(0, 50),
            href: el.href,
          }));
          // eslint-disable-next-line no-console
          console.log("📋 Element info:", elementInfo);
          break;
        }
      } catch {
        // eslint-disable-next-line no-console
        console.log(`❌ Selector not found: ${selector}`);
      }
    }

    if (!loginDetected) {
      // eslint-disable-next-line no-console
      console.log("\n⚠️  No login indicators found with selectors");

      // Additional debugging
      const currentUrl = page.url();
      // eslint-disable-next-line no-console
      console.log(`🌐 Current URL: ${currentUrl}`);

      // Check for login/signup buttons (indicates not logged in)
      try {
        const loginButton = await page.$('a[href*="/login"], button:has-text("ログイン")');
        if (loginButton) {
          // eslint-disable-next-line no-console
          console.log("❌ Found login button - user is NOT logged in");
        } else {
          // eslint-disable-next-line no-console
          console.log("✅ No login button found - might be logged in");
        }
      } catch {
        // eslint-disable-next-line no-console
        console.log("🤷 Could not determine login button status");
      }

      // Take screenshot for manual inspection
      await page.screenshot({ path: "debug-login-failed.png" });
      // eslint-disable-next-line no-console
      console.log("📸 Debug screenshot saved: debug-login-failed.png");
    }

    // Test article creation access
    if (loginDetected) {
      // eslint-disable-next-line no-console
      console.log("\n📝 Testing article creation access...");
      try {
        await page.goto("https://note.com/new", { waitUntil: "networkidle" });

        // Look for title input field
        const titleInput = await page.waitForSelector('input[placeholder*="タイトル"], input[placeholder*="title"]', { timeout: 10000 });

        if (titleInput) {
          // eslint-disable-next-line no-console
          console.log("✅ Article creation page accessible!");
          await page.screenshot({ path: "debug-article-creation.png" });
          // eslint-disable-next-line no-console
          console.log("📸 Article creation screenshot saved: debug-article-creation.png");
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.log(`❌ Article creation test failed: ${error.message}`);
        await page.screenshot({ path: "debug-article-creation-failed.png" });
        // eslint-disable-next-line no-console
        console.log("📸 Failed article creation screenshot saved: debug-article-creation-failed.png");
      }
    }

    // eslint-disable-next-line no-console
    console.log("\n📊 Debug Summary:");
    // eslint-disable-next-line no-console
    console.log(`🔐 Login Status: ${loginDetected ? "LOGGED IN" : "NOT LOGGED IN"}`);
    if (detectedSelector) {
      // eslint-disable-next-line no-console
      console.log(`🎯 Detection Method: ${detectedSelector}`);
    }
    // eslint-disable-next-line no-console
    console.log(`🌐 Final URL: ${page.url()}`);

    // eslint-disable-next-line no-console
    console.log("\n⏱️  Keeping browser open for 10 seconds for manual inspection...");
    await new Promise((resolve) => setTimeout(resolve, 10000));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(`❌ Debug test failed: ${error.message}`);
    // eslint-disable-next-line no-console
    console.log("💡 This might indicate the storage state has expired");
  } finally {
    await browser.close();
    // eslint-disable-next-line no-console
    console.log("🔒 Browser closed");
  }
}

// Handle script execution
if (import.meta.url === `file://${process.argv[1]}`) {
  debugLogin().catch((error) => {
    // eslint-disable-next-line no-console
    console.error("💥 Debug script failed:", error.message);
    process.exit(1);
  });
}
