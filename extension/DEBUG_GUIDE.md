# WattWise Extension Debug Guide

## What's Been Added

### 1. Content Script (content.js) - COMPREHENSIVE DEBUGGING
✅ Detailed console logs with colored emoji prefixes:
- 🔴 Script loading
- 🔍 Title detection starting
- ✗ Selector not found
- ✓ Selector found
- 🟢 Title selected
- 📬 Message received
- 🟢 Sending response
- 📤 Sending to background
- 📥 Background response received

**Key Debug Points:**
- Logs when script loads
- Logs every selector tested
- Logs when title is found (or not found)
- Logs all messages received from popup
- Logs when sending to background

### 2. Popup Script (popup.js) - DEBUGGING ENABLED
✅ Enhanced logging for message flow:
- 🔵 Number of tabs found
- 🔵 Specific tab URL and ID being scanned
- 🟡 Content script not loaded (with detailed error)
- 🟢 Scan response received
- Better context for debugging

### 3. Background Script (background.js) - DEBUGGING ENABLED
✅ Comprehensive message handling logs:
- 🔴 Service worker loading
- 🟢 Service worker loaded
- 🔑 API keys being loaded
- 📬 Messages received with sender info
- 📋 Full message content logged
- 🔍 Product analysis starting
- 📊 Storage data retrieved
- 🌱 Sustainability evaluation starting
- ✅ Evaluation complete
- ❌ Errors with context

## How to Use for Debugging

### Step 1: Reload the Extension
1. Go to chrome://extensions/
2. Click the refresh button on WattWise

### Step 2: Open Console Logs
**For Content Script:**
- Right-click on Amazon page → Inspect
- Go to Console tab
- Look for logs with [WattWise Content] prefix
- Should see: "Script loading", "Starting title detection", etc.

**For Popup:**
- Click extension icon to open popup
- Right-click popup → Inspect (or click ≡ menu → More tools → Developer tools → Sources tab)
- Go to Console
- Look for logs with [WattWise Popup] prefix

**For Background Service Worker:**
- Go to chrome://extensions/
- Click on WattWise
- Click "Service Worker" link at the bottom
- Console will open with background script logs
- Look for logs with [WattWise Background] prefix

### Step 3: Common Issues to Look For

**Issue: "Script loading" never appears**
→ Content script isn't injecting
→ Check manifest.json content_scripts configuration

**Issue: "Starting title detection..." but selectors not found**
→ Amazon page structure changed
→ New selectors needed
→ Check what elements actually exist on page

**Issue: "No product title found"**
→ Selector strategy not working
→ May need manual DOM inspection on the page

**Issue: "Content script not loaded" error**
→ Content script didn't inject in time
→ Extension being used on non-matching URL
→ Try refreshing page

**Issue: Message never reaches background**
→ Check if response is being sent properly
→ Check for errors in message sending

## Console Log Format
Every log includes:
- Emoji prefix for quick visual scanning
- [Context] like [WattWise Content] or [WattWise Background]
- Specific action being performed
- Relevant data (when appropriate)

## Files Modified
1. `/extension/content.js` - Complete rewrite with debugging
2. `/extension/popup.js` - Added logging to scan section
3. `/extension/background.js` - Added logging to message handling

## Next Steps
1. Reload extension
2. Open Amazon page or search result
3. Click extension icon
4. Check console logs on each layer (content, popup, background)
5. Follow the emoji trail to see where things break
6. Report the specific log messages that are missing/failing
