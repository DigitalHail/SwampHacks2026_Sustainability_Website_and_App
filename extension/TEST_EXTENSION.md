# WattWise Extension Testing Guide

## ✅ All Buttons Should Now Work!

### Fixed Issues:
1. **Save Settings** - Now works and shows "✅ Settings Saved!" for 3 seconds
2. **Test Connection** - Now works and tests your Nessie API key
3. **View Eco-Balance** - Shows your checking and savings account balances
4. **Toggle Settings** - Opens/closes the settings panel with ⚙️ button

---

## Quick Start

### 1. **Add Your Credentials**
- Click the extension popup
- Click ⚙️ Settings to expand
- Enter:
  ```
  Nessie API Key:     99864d500fa931ec644d3a5d865a866c
  Main Account ID:    69753af095150878eafea16f
  Savings Account ID: 69753af095150878eafea170
  ```
- Click **Save Settings** → Should show "✅ Settings Saved!"

### 2. **Test the Connection**
- Click **Test Connection** → Should show "✅ APIs connected!"

### 3. **Check Your Balance**
- Click **View Eco-Balance** → Should show:
  - Checking: $1000.00
  - Sustainability Savings: $0.00

### 4. **Try a Product Scan**
- Go to Amazon: https://www.amazon.com/s?k=plastic+water+bottle
- Open the extension popup
- Should see product detection and sustainability impact

---

## What Each Button Does

| Button | Purpose | Expected Result |
|--------|---------|-----------------|
| **⚙️ Settings** | Show/hide settings panel | Arrow shows ▼ or ▲ |
| **Save Settings** | Save API keys to storage | "✅ Settings Saved!" message |
| **Test Connection** | Verify Nessie API works | "✅ APIs connected!" message |
| **View Eco-Balance** | Fetch account balances | Shows checking & savings balance |

---

## Understanding the Extension Flow

1. **You open a product page** (Amazon/Best Buy)
2. **Popup loads** → Status shows "⏳ Ready"
3. **Settings buttons work immediately** (no blocking)
4. **Page scan runs in background** → Detects product title
5. **Analysis runs** (Gemini optional, falls back to keywords)
6. **Sustainability impact displays** with score and tax
7. **If unsustainable** → Tax transfers automatically

---

## Gemini API Status

- **Without Gemini API key**: Uses simple keyword matching
  - Detects: "plastic", "disposable", "styrofoam"
  - Still works perfectly!
- **With Gemini API key**: Uses AI to categorize products
  - More accurate sustainability scoring
  - Optional - not required for basic functionality

---

## Browser Console Debugging

**To see logs:**

1. Right-click extension icon
2. Click "Inspect popup"
3. Look for logs starting with:
   - `[WattWise Popup]` - UI events
   - `[WattWise BG]` - Background API calls

**Sample logs:**
```
[WattWise Popup] DOM ready
[WattWise Popup] Save clicked
[WattWise Popup] Saving to storage: {hasN: true, hasG: false}
[WattWise Popup] Settings saved to storage
[WattWise BG] Analyzing product: plastic water bottle
[WattWise BG] ✅ Gemini analysis complete: {isUnsustainable: true, ...}
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Buttons don't respond | Reload extension from chrome://extensions |
| Balance shows error | Verify API key and account IDs are correct |
| Settings won't save | Check chrome.storage.local in DevTools |
| Product not detected | Make sure you're on Amazon or Best Buy |
| "Not on Amazon/Best Buy" | Extension only works on those sites |

---

## Test Checklist

- [ ] Save Settings works (shows green checkmark)
- [ ] Test Connection works (shows green checkmark)
- [ ] View Eco-Balance shows account balances
- [ ] ⚙️ Settings toggle expands/collapses
- [ ] Product detection works on Amazon
- [ ] Sustainability impact displays with score
- [ ] Console logs show `[WattWise]` messages

All 7 items checked = Everything working! 🎉

