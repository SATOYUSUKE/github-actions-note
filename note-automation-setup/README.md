# Note.com Login Setup Tools

This directory contains tools for setting up note.com authentication for the automated article publishing system.

## Overview

The note.com automation system requires authenticated access to publish articles. These tools help you:

1. **Generate storage state** - Capture your login session for automation
2. **Validate storage state** - Verify that your saved login is still valid
3. **Debug login issues** - Troubleshoot authentication problems

## Files

### Core Scripts

- **`login-note.mjs`** - Interactive login script with automatic detection
- **`validate-storage-state.mjs`** - Standalone validation tool
- **`debug-login.mjs`** - Detailed debugging and troubleshooting tool

### Generated Files

- **`note-state.json`** - Your saved login session (created by login-note.mjs)
- **`note-state-backup.json`** - Backup of previous login session
- **`debug-*.png`** - Screenshots for debugging (created by debug-login.mjs)

## Quick Start

### 1. Install Dependencies

```bash
cd note-automation-setup
npm install
```

### 2. Generate Login State

```bash
node login-note.mjs
```

This will:
- Open a browser window
- Navigate to note.com login page
- Wait for you to login manually
- Automatically detect when login is complete
- Save your login session to `note-state.json`
- Validate the saved session

### 3. Validate Login State

```bash
node validate-storage-state.mjs
```

This will:
- Check if `note-state.json` exists and is valid
- Test the login session with note.com
- Provide detailed status information

### 4. Debug Issues (if needed)

```bash
node debug-login.mjs
```

This will:
- Perform comprehensive validation
- Take screenshots for manual inspection
- Test article creation access
- Keep browser open for 10 seconds for inspection

## Usage Instructions

### Initial Setup

1. **Run the login script**:
   ```bash
   node login-note.mjs
   ```

2. **Login manually** in the browser window that opens:
   - Use your email/password
   - Or use social login (Google, Twitter, etc.)
   - The script will automatically detect completion

3. **Verify success**:
   - The script will validate and test your login
   - You should see "🎉 Login setup completed successfully!"

4. **Copy to GitHub**:
   - Copy the content of `note-state.json`
   - Add it as `NOTE_STORAGE_STATE` secret in your GitHub repository

### Maintenance

**Check login status regularly**:
```bash
node validate-storage-state.mjs
```

**If validation fails**:
1. Run `node login-note.mjs` again to refresh
2. Update the GitHub secret with new content

**For troubleshooting**:
```bash
node debug-login.mjs
```

## Script Details

### login-note.mjs

**Features**:
- ✅ Automatic login detection (multiple methods)
- ✅ Storage state validation
- ✅ Live testing of saved session
- ✅ Backup of previous sessions
- ✅ Anti-detection measures
- ✅ Comprehensive error handling

**Detection Methods**:
1. URL change detection (redirect after login)
2. User menu element detection
3. Login form absence detection

**Validation**:
- File format validation
- Cookie expiry checking
- Live authentication testing
- Article creation access testing

### validate-storage-state.mjs

**Checks**:
- ✅ File existence and format
- ✅ Cookie validity and expiry
- ✅ Live authentication test
- ✅ Detailed status reporting

**Output**:
- File information (size, creation date)
- Cookie statistics
- Expiry warnings
- Setup instructions

### debug-login.mjs

**Features**:
- ✅ Step-by-step validation
- ✅ Screenshot capture
- ✅ Detailed element inspection
- ✅ Article creation testing
- ✅ Extended browser inspection time

**Screenshots**:
- `debug-homepage.png` - Homepage after login
- `debug-login-failed.png` - If login detection fails
- `debug-article-creation.png` - Article creation page
- `debug-article-creation-failed.png` - If article creation fails

## Troubleshooting

### Common Issues

**"Storage state validation failed"**
- Run `node login-note.mjs` to refresh your login
- Make sure you're fully logged in before pressing Enter

**"Login detected but article creation failed"**
- Your account might have restrictions
- Try logging in manually and creating an article
- Check if your account is verified

**"Browser shows security warning"**
- Click "Advanced" → "Proceed to unsafe site"
- This is normal for automation browsers

**"Automatic detection timed out"**
- Press Enter manually after completing login
- The script will still save your session

### Debug Steps

1. **Run debug script**:
   ```bash
   node debug-login.mjs
   ```

2. **Check screenshots** in the directory for visual confirmation

3. **Look for specific error messages** in the console output

4. **Try refreshing login**:
   ```bash
   node login-note.mjs
   ```

### GitHub Actions Issues

**"Authentication failed in workflow"**
- Validate your local storage state: `node validate-storage-state.mjs`
- If valid locally but failing in GitHub, update the secret:
  1. Copy content of `note-state.json`
  2. Update `NOTE_STORAGE_STATE` secret in GitHub
  3. Re-run the workflow

**"Storage state expired"**
- Note.com sessions expire periodically
- Refresh your login and update the GitHub secret
- Consider setting up a reminder to refresh monthly

## Security Notes

- **Never commit `note-state.json`** to version control
- **Keep your GitHub secrets secure**
- **Regenerate login state if compromised**
- **Use a dedicated note.com account** for automation if possible

## Advanced Usage

### Custom Browser Settings

You can modify the browser launch options in `login-note.mjs`:

```javascript
const browser = await chromium.launch({ 
  headless: false,  // Set to true for headless mode
  args: [
    '--disable-blink-features=AutomationControlled',
    '--disable-web-security',
    // Add custom args here
  ]
});
```

### Custom Validation

The `StorageStateValidator` class can be imported and used in your own scripts:

```javascript
import { StorageStateValidator } from './login-note.mjs';

const validation = StorageStateValidator.validateStorageState('./note-state.json');
if (validation.valid) {
  console.log('Storage state is valid');
} else {
  console.log('Validation failed:', validation.reason);
}
```

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Run the debug script for detailed information
3. Check the GitHub Actions logs for specific error messages
4. Ensure your note.com account has article creation permissions

## Version History

- **v1.0** - Initial interactive login script
- **v2.0** - Added automatic detection and validation
- **v3.0** - Added comprehensive debugging and error handling