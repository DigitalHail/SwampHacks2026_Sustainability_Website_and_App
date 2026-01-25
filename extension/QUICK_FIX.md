# WattWise Extension - Quick Fix Guide

## If Nothing Works - Do These Steps:

### 1. **Reload the Extension**
- Go to: `chrome://extensions/`
- Find "WattWise" in the list
- Click the **refresh icon** on the bottom right of the card
- Wait 2-3 seconds

### 2. **Clear Extension Cache**
- In `chrome://extensions/`
- Toggle **Developer mode** ON (top right)
- Click **Clear data** on the WattWise card
- Reload the extension

### 3. **Re-add Credentials**
After reloading:
- Open extension popup
- Click ⚙️ Settings
- Re-enter:
  - Nessie API Key: `99864d500fa931ec644d3a5d865a866c`
  - Main Account ID: `69753af095150878eafea16f`
  - Savings Account ID: `69753af095150878eafea170`
- Click **Save Settings**

### 4. **Check Browser Console**
- Right-click extension icon
- Click "Inspect popup"
- Look at the **Console** tab
- You should see:
  ```
  [WattWise Popup] Script loading...
  [WattWise Popup] DOM ready
  [WattWise Popup] Got stored settings
  ```

### 5. **Test Each Button**
- Click ⚙️ Settings → Panel should expand/collapse ✅
- Click Save Settings → Should show "✅ Settings Saved!" ✅
- Click Test Connection → Should show "✅ APIs connected!" ✅
- Click View Eco-Balance → Should show balances ✅

---

## If Still Not Working:

### Check Extension Loading
1. Go to `chrome://extensions/`
2. Make sure WattWise shows as **enabled** (blue toggle)
3. Check if there's a **red error message** under the extension

### Check File Presence
The `extension/` folder must have:
- ✅ `manifest.json`
- ✅ `popup.html`
- ✅ `popup.js`
- ✅ `content.js`
- ✅ `background.js`
- ✅ `icons/` folder with `icon48.png` and `icon128.png`

### Common Issues

| Issue | Fix |
|-------|-----|
| "This extension cannot be loaded" | Reload from chrome://extensions |
| Buttons don't respond | Check console for errors |
| Settings don't save | Clear data and try again |
| Balance shows 0 | Check API key is correct |
| "Not on Amazon/Best Buy" | Extension only works on those sites |

---

## Nuclear Option - Full Reset

If nothing works, do this:

1. **Unload extension**:
   - Go to `chrome://extensions/`
   - Click **Remove** on WattWise

2. **Re-add extension**:
   - Click **Load unpacked**
   - Navigate to `/Users/ahnafchowdhury/Projects/SwampHacks XI/SwampHacks2026_Sustainability_Website_and_App/extension`
   - Click **Select Folder**

3. **Add credentials again** and test each button

4. **Check console** for any error messages

---

## Most Common Fix

**99% of the time, just need to reload:**

1. Go to `chrome://extensions/`
2. Click the refresh icon on WattWise
3. Go back and try again

This usually fixes mysterious "nothing works" issues!
