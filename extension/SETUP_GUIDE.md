# WattWise Extension - Complete Setup & Testing

## Step 1: Load Extension in Chrome

1. Open Chrome and go to: `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Navigate to: `/Users/ahnafchowdhury/Projects/SwampHacks XI/SwampHacks2026_Sustainability_Website_and_App/extension`
5. Click **Select Folder**
6. You should see "WattWise" appear in the list

## Step 2: Pin Extension to Toolbar

1. Click the **Extensions** icon in the top right
2. Click the **pin icon** next to WattWise
3. WattWise icon should now appear in your toolbar

## Step 3: Add Your Credentials

1. Click the WattWise extension icon in the toolbar
2. The popup should open
3. Click ⚙️ **Settings** to expand the panel
4. Fill in the fields:

```
Nessie API Key:     99864d500fa931ec644d3a5d865a866c
Main Account ID:    69753af095150878eafea16f
Savings Account ID: 69753af095150878eafea170
```

*(Gemini API Key and Climatiq API Key are optional)*

5. Click **Save Settings** → Should show "✅ Saved!"

## Step 4: Test Everything

### Test 1: Connection Test
- Click **Test Connection** button
- Should show **"✅ Connected!"**

### Test 2: Check Balance
- Click **View Eco-Balance** button
- Should show:
  - Checking: $1000.00
  - Sustainability Savings: $0.00

### Test 3: Product Detection
- Go to: https://www.amazon.com/s?k=plastic+water+bottle
- Click the WattWise icon again
- Should show "✓ Detected: plastic water bottle..."
- Should display Sustainability Impact section with:
  - 🔴 Unsustainable
  - Score: (some number)/100
  - Tax: $0.30 (or similar)

## What Should Happen When It's Working

### In the Popup:
- Status text changes when scanning
- Settings toggle opens/closes with ⚙️ button
- All buttons respond immediately (no hanging)
- Messages appear for 2 seconds then disappear

### On Amazon Product Page:
- After opening popup on a product page
- You should see product name detected
- Sustainability impact shows below
- If unsustainable → Tax should transfer automatically from Checking to Savings

### Browser Console:
- Right-click WattWise icon → "Inspect popup"
- Console tab should show activity (if there are errors)

## If Something Doesn't Work

### Buttons Don't Respond
1. Go to `chrome://extensions/`
2. Find WattWise and click the **refresh** icon
3. Try again

### Settings Won't Save
1. Go to `chrome://extensions/`
2. Click **Details** on WattWise
3. Scroll down and click **Clear data**
4. Try entering settings again

### Balance Shows Error
- Make sure you entered the exact API key and account IDs
- Click **Test Connection** first to verify credentials

### Product Not Detected
- Only works on amazon.com and bestbuy.com
- Refresh the page and try again
- Make sure the product has a clear title on the page

### "Nothing Works" Nuclear Option
1. Go to `chrome://extensions/`
2. Click **Remove** on WattWise
3. Reload the extension:
   - Click **Load unpacked**
   - Select the extension folder again
4. Add credentials again from scratch

## Files That Must Exist

In the `extension/` folder, you need:
- ✅ `manifest.json` - Extension configuration
- ✅ `popup.html` - Popup UI
- ✅ `popup.js` - Popup functionality
- ✅ `content.js` - Page scanning script
- ✅ `background.js` - API handling
- ✅ `icons/icon48.png` - Small icon
- ✅ `icons/icon128.png` - Large icon

If any are missing, extension won't load!

## Success Indicators

✅ **Full Success:**
- Extension loads without errors
- All buttons respond when clicked
- Settings save and persist
- Balance fetches correctly
- Products are detected on Amazon
- Sustainability impact displays

⚠️ **Partial Success:**
- Extension loads but buttons slow
- Settings work but balance doesn't
- Product detection works but no impact shown

❌ **Not Working:**
- Extension won't load at all
- All buttons are unresponsive
- No data shows in popup

---

## API Keys Reference

| Service | Key | Where Used |
|---------|-----|-----------|
| **Nessie** | `99864d500fa931ec644d3a5d865a866c` | Financial API (balance, transfers) |
| **Main Account** | `69753af095150878eafea16f` | Your checking account |
| **Savings Account** | `69753af095150878eafea170` | Sustainability savings account |

These are already set up - just paste them into Settings!
