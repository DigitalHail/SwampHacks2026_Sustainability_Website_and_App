# WattWise MVP Implementation - Code Examples

## 1. Simplified Sustainability Scoring (No External APIs)

```javascript
// sustainability-scorer.js - Local-first approach

const PRODUCT_KEYWORDS = {
  unsustainable: [
    'plastic', 'disposable', 'styrofoam', 'single-use',
    'fast fashion', 'polyester', 'acrylic', 'synthetic'
  ],
  sustainable: [
    'organic', 'sustainable', 'eco-friendly', 'recycled',
    'biodegradable', 'bamboo', 'linen', 'cotton'
  ]
};

const CATEGORY_DEFAULTS = {
  'electronics': { score: 3, co2e: 15, reason: 'High manufacturing impact' },
  'clothing': { score: 5, co2e: 3, reason: 'Moderate environmental cost' },
  'furniture': { score: 6, co2e: 8, reason: 'Durable goods reduce future waste' },
  'food': { score: 7, co2e: 2, reason: 'Single purchase impact' },
  'default': { score: 5, co2e: 5, reason: 'Unknown category' }
};

function analyzeProduct(productName, price = null) {
  const name = productName.toLowerCase();
  
  // 1. Check for explicit keywords
  const unsustainableMatches = PRODUCT_KEYWORDS.unsustainable.filter(
    keyword => name.includes(keyword)
  );
  const sustainableMatches = PRODUCT_KEYWORDS.sustainable.filter(
    keyword => name.includes(keyword)
  );
  
  if (unsustainableMatches.length > 0) {
    return {
      score: 2,
      co2e: 10,
      reason: `Contains: ${unsustainableMatches[0]}`,
      dataSource: 'keyword-match'
    };
  }
  
  if (sustainableMatches.length > 0) {
    return {
      score: 8,
      co2e: 2,
      reason: `Marketed as: ${sustainableMatches[0]}`,
      dataSource: 'keyword-match'
    };
  }
  
  // 2. Guess category from keywords
  let category = 'default';
  if (name.includes('phone') || name.includes('laptop') || name.includes('tablet')) {
    category = 'electronics';
  } else if (name.includes('shirt') || name.includes('pants') || name.includes('jacket')) {
    category = 'clothing';
  } else if (name.includes('chair') || name.includes('desk') || name.includes('table')) {
    category = 'furniture';
  }
  
  // 3. Apply category defaults
  const defaults = CATEGORY_DEFAULTS[category];
  return {
    score: defaults.score,
    co2e: defaults.co2e,
    reason: defaults.reason,
    dataSource: 'category-default',
    priceEstimate: price ? (defaults.co2e * 0.5).toFixed(2) : null // $0.50 per kg CO2e
  };
}

// Export for use in content.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { analyzeProduct };
}
```

---

## 2. Enhanced Content Script with Local Scoring

```javascript
// content.js - Updated with sustainability scoring

// Include the scorer
const PRODUCT_KEYWORDS = {
  unsustainable: ['plastic', 'disposable', 'styrofoam', 'single-use'],
  sustainable: ['organic', 'sustainable', 'eco-friendly', 'recycled']
};

const CATEGORY_DEFAULTS = {
  'electronics': { score: 3, co2e: 15 },
  'clothing': { score: 5, co2e: 3 },
  'furniture': { score: 6, co2e: 8 },
  'default': { score: 5, co2e: 5 }
};

function analyzeProduct(productName) {
  const name = productName.toLowerCase();
  
  // Check keywords
  const hasUnsustainable = PRODUCT_KEYWORDS.unsustainable.some(kw => name.includes(kw));
  if (hasUnsustainable) return { score: 2, co2e: 10, reason: 'Contains unsustainable materials' };
  
  const hasSustainable = PRODUCT_KEYWORDS.sustainable.some(kw => name.includes(kw));
  if (hasSustainable) return { score: 8, co2e: 2, reason: 'Eco-friendly choice' };
  
  // Default to category
  return { score: 5, co2e: 5, reason: 'Standard product' };
}

console.log("🟢 [WattWise Content] Script ready with local scoring");

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log("📬 Message from popup:", request.type);
  
  if (request.type === 'SCAN_PAGE') {
    // [Same as before - detect product]
    var title = getProductTitle();
    
    if (title) {
      // NEW: Analyze sustainability locally
      const analysis = analyzeProduct(title);
      console.log("🌱 Analysis:", analysis);
      
      // Store for popup to display
      chrome.storage.local.set({ 
        lastProductAnalysis: analysis,
        productTitle: title 
      });
      
      sendResponse({ 
        success: true, 
        message: '✓ Detected: ' + title.substring(0, 30),
        analysis: analysis 
      });
    } else {
      sendResponse({ success: false, message: 'No product' });
    }
  }
  return true;
});
```

---

## 3. Nessie Integration - Balance Display Only

```javascript
// nessie-integration.js - Minimal, read-only approach

const NESSIE_BASE_URL = "http://api.nessieisreal.com";

function getNessieBalance(accountId, apiKey) {
  console.log("📊 Fetching balance from Nessie for account:", accountId);
  
  return fetch(`${NESSIE_BASE_URL}/accounts/${accountId}?key=${apiKey}`)
    .then(res => res.json())
    .then(data => {
      console.log("✅ Balance retrieved:", data.balance);
      return {
        success: true,
        balance: data.balance,
        nickname: data.nickname
      };
    })
    .catch(error => {
      console.error("❌ Nessie API error:", error);
      return {
        success: false,
        error: error.message
      };
    });
}

function listNessieAccounts(apiKey) {
  console.log("📋 Listing Nessie accounts");
  
  return fetch(`${NESSIE_BASE_URL}/accounts?key=${apiKey}`)
    .then(res => res.json())
    .then(data => {
      console.log("✅ Found accounts:", data.map(a => a.nickname));
      return {
        success: true,
        accounts: data.map(a => ({
          id: a._id,
          nickname: a.nickname,
          type: a.type,
          balance: a.balance
        }))
      };
    })
    .catch(error => {
      console.error("❌ Error listing accounts:", error);
      return {
        success: false,
        error: error.message
      };
    });
}

// For Phase 2: Manual transfers (not auto)
function initiateTransfer(fromAccountId, toAccountId, amount, apiKey, description) {
  console.log(`💸 Initiating transfer: $${amount} from ${fromAccountId}`);
  
  if (amount <= 0) {
    return Promise.resolve({
      success: false,
      error: "Amount must be positive"
    });
  }
  
  const payload = {
    medium: "balance",
    payee_id: toAccountId,
    amount: amount,
    description: description,
    transaction_date: new Date().toISOString().split('T')[0]
  };
  
  return fetch(`${NESSIE_BASE_URL}/accounts/${fromAccountId}/transfers?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(res => res.json())
    .then(data => {
      console.log("✅ Transfer successful:", data);
      return { success: true, data };
    })
    .catch(error => {
      console.error("❌ Transfer failed:", error);
      return { success: false, error: error.message };
    });
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getNessieBalance, listNessieAccounts, initiateTransfer };
}
```

---

## 4. Popup UI - Simplified with Local Scoring

```html
<!-- popup.html - Updated -->

<div id="productAnalysis">
  <h3>Product Sustainability</h3>
  
  <div id="scoreDisplay" style="text-align: center;">
    <div id="scoreCircle" style="
      width: 100px;
      height: 100px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 36px;
      font-weight: bold;
      margin: 10px auto;
      background: #f0f0f0;
    ">
      <span id="score">-</span>/10
    </div>
    
    <p id="reason" style="font-size: 12px; color: #666;"></p>
    <p id="impact" style="font-size: 14px; color: #d32f2f;"></p>
  </div>
  
  <button id="offsetButton" style="
    width: 100%;
    padding: 12px;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    margin-top: 10px;
  ">
    💚 Save to Carbon Offset Fund
  </button>
</div>
```

```javascript
// popup.js - Display local analysis

function displayAnalysis() {
  chrome.storage.local.get(['lastProductAnalysis', 'productTitle'], (result) => {
    if (result.lastProductAnalysis) {
      const analysis = result.lastProductAnalysis;
      
      // Update UI
      document.getElementById('score').textContent = analysis.score;
      document.getElementById('reason').textContent = analysis.reason;
      document.getElementById('impact').textContent = `
        ~${analysis.co2e} kg CO2e (${Math.round(analysis.co2e * 0.5)} $ carbon cost)
      `;
      
      // Color code the score
      const scoreCircle = document.getElementById('scoreCircle');
      if (analysis.score <= 3) {
        scoreCircle.style.background = '#ffebee'; // Red
      } else if (analysis.score <= 6) {
        scoreCircle.style.background = '#fff3e0'; // Orange
      } else {
        scoreCircle.style.background = '#f0f8f0'; // Green
      }
    }
  });
}

// Call on popup open
document.addEventListener('DOMContentLoaded', displayAnalysis);

// Offset button - Phase 2 feature
document.getElementById('offsetButton').addEventListener('click', () => {
  chrome.storage.local.get(['productTitle'], (result) => {
    // Store for Phase 2: actual transfer logic
    chrome.storage.local.get(['offsetFund'], (current) => {
      const fund = current.offsetFund || 0;
      const analysis = result.lastAnalysis;
      const offsetAmount = Math.round(analysis.co2e * 0.5 * 100) / 100;
      
      chrome.storage.local.set({
        offsetFund: fund + offsetAmount,
        lastOffsetProduct: result.productTitle,
        lastOffsetAmount: offsetAmount,
        lastOffsetTime: new Date().toISOString()
      });
      
      console.log(`💚 Added $${offsetAmount} to offset fund`);
      alert(`Added $${offsetAmount} to your carbon offset fund!\n\nTotal saved: $${(fund + offsetAmount).toFixed(2)}`);
    });
  });
});
```

---

## 5. Data Storage Model (Minimal)

```javascript
// storage-schema.js - What to store in chrome.storage.local

const schema = {
  // User settings
  settings: {
    nessieApiKey: "string",
    mainAccountId: "string",
    savingsAccountId: "string",
    climatiqApiKey: "string (optional)"
  },
  
  // Current product analysis
  lastProductAnalysis: {
    score: 1-10,
    co2e: number,
    reason: string,
    dataSource: "keyword-match | category-default | climatiq",
    timestamp: ISO8601
  },
  
  // User manual offsets (Phase 2)
  offsetFund: {
    totalAmount: number, // dollars
    entries: [
      {
        productName: string,
        amount: number,
        timestamp: ISO8601
      }
    ]
  },
  
  // Analytics (opt-in)
  analytics: {
    productsScanned: number,
    averageScore: number,
    lastSync: ISO8601
  }
};
```

---

## 6. Migration Path: Keyword → Climatiq (Optional Phase 2)

```javascript
// climatiq-integration.js - Optional, use only if needed

const CLIMATIQ_BASE_URL = "https://api.climatiq.io/estimate";

async function getClimatiqEstimate(productName, category, apiKey) {
  if (!apiKey) {
    console.log("ℹ️ Climatiq API key not configured, using local estimate");
    return null;
  }
  
  // Map category to Climatiq format
  const climatiqCategories = {
    'electronics': 'consumer_goods-type_electronics',
    'clothing': 'consumer_goods-type_apparel',
    'furniture': 'consumer_goods-type_furniture',
    'default': 'consumer_goods-type_generic'
  };
  
  const activityId = climatiqCategories[category] || climatiqCategories.default;
  
  try {
    const response = await fetch(CLIMATIQ_BASE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        emission_factor: { activity_id: activityId },
        parameters: { money: 100, money_unit: "usd" }
      })
    });
    
    const data = await response.json();
    console.log("✅ Climatiq estimate:", data);
    
    return {
      co2e: data.co2e || null,
      source: 'climatiq'
    };
  } catch (error) {
    console.error("❌ Climatiq error (falling back to local):", error);
    return null;
  }
}
```

---

## Implementation Priority

1. **Week 1:** Local scoring (no APIs)
2. **Week 2:** Nessie balance display (read-only)
3. **Week 3:** Offset fund tracking (manual, no transfers)
4. **Week 4+:** Optional Climatiq integration, then transfers

This approach keeps the MVP simple while building toward the full vision.
