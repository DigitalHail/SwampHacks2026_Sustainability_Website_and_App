// Store API keys in Chrome storage instead of hardcoding
let NESSIE_API_KEY = "99864d500fa931ec644d3a5d865a866c";
// Nessie API uses HTTP, not HTTPS
const NESSIE_BASE_URL = "http://api.nessieisreal.com";

// Climatiq API for sustainability scoring
const CLIMATIQ_BASE_URL = "https://api.climatiq.io/estimate";
// You can get a free API key at https://climatiq.io/
let CLIMATIQ_API_KEY = "40D52DBM4D1BVC4E7M1GTAEKDR";

console.log("🟢 WattWise background service worker loaded!");
console.log("API Key initialized:", NESSIE_API_KEY.substring(0, 10) + "...");

// Load API keys from Chrome storage on startup
chrome.storage.sync.get(['nessieApiKey', 'climatiqApiKey'], (result) => {
  if (result.nessieApiKey) {
    NESSIE_API_KEY = result.nessieApiKey;
  }
  if (result.climatiqApiKey) {
    CLIMATIQ_API_KEY = result.climatiqApiKey;
  }
  console.log("✅ API keys loaded from sync storage");
});

// Also check local storage for recently saved keys
chrome.storage.local.get(['climatiqKey'], (result) => {
  if (result.climatiqKey) {
    CLIMATIQ_API_KEY = result.climatiqKey;
    console.log("✅ Climatiq key loaded from local storage");
  }
});

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  console.log("Message received:", message.type);
  console.log("Full message:", message);
  
  if (message.type === "ANALYZE_PRODUCT") {
    console.log("Analyzing product:", message.name);
    const data = await chrome.storage.local.get(["apiKey", "mainAccount", "savingsAccount"]);
    
    if (!data.apiKey || !data.mainAccount) {
      console.log("Missing API key or account info");
      sendResponse({ success: false, error: "Missing API configuration" });
      return;
    }

    try {
      // Evaluate sustainability using Climatiq (with fallback to keywords)
      const evaluation = await evaluateSustainability(message.name);
      console.log("🌍 Sustainability evaluation:", evaluation);
      
      if (evaluation.isUnsustainable && evaluation.taxAmount > 0) {
        console.log(`🟠 Unsustainable product detected (score: ${evaluation.score}). Triggering Sustainability Tax ($${evaluation.taxAmount})...`);
        try {
          const result = await performNessieTransfer(data.apiKey, data.mainAccount, data.savingsAccount, evaluation.taxAmount);
          sendResponse({ 
            success: true, 
            message: `Sustainability tax applied: $${evaluation.taxAmount}`,
            evaluation: evaluation,
            result 
          });
        } catch (error) {
          console.error("Transfer failed:", error);
          sendResponse({ success: false, error: error.message });
        }
      } else {
        console.log(`✅ Sustainable product (score: ${evaluation.score}). No tax applied.`);
        sendResponse({ 
          success: true, 
          message: `Product is sustainable! (Score: ${evaluation.score}/100)`,
          evaluation: evaluation
        });
      }
    } catch (error) {
      console.error("Product analysis error:", error);
      sendResponse({ success: false, error: error.message });
    }
    return true; // Keep listener alive for async response
  }
  
  if (message.type === "CHECK_BALANCE") {
    console.log("CHECK_BALANCE requested");
    try {
      const data = await testNessieAPI();
      console.log("testNessieAPI success:", data);
      sendResponse({ success: true, ...data });
    } catch (error) {
      console.error("testNessieAPI error:", error.message);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
  
  if (message.type === "GET_ACCOUNT_DETAILS") {
    console.log("GET_ACCOUNT_DETAILS requested");
    try {
      const mainBalance = await getAccountBalance(message.apiKey, message.mainAccountId);
      const savingsBalance = await getAccountBalance(message.apiKey, message.savingsAccountId);
      
      sendResponse({ 
        success: true, 
        mainBalance: mainBalance,
        savingsBalance: savingsBalance
      });
    } catch (error) {
      console.error("GET_ACCOUNT_DETAILS error:", error.message);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
});

/**
 * Evaluate product sustainability using Climatiq API
 * @param {string} productName - Name of the product
 * @returns {Promise<object>} Sustainability score and tax amount
 */
async function evaluateSustainability(productName) {
  try {
    // If no Climatiq key, fall back to keyword matching
    if (!CLIMATIQ_API_KEY) {
      console.log("⚠️ No Climatiq API key - using fallback keyword matching");
      const isUnsustainable = productName.toLowerCase().includes("plastic") || 
                              productName.toLowerCase().includes("disposable");
      return {
        isUnsustainable: isUnsustainable,
        score: isUnsustainable ? 25 : 75,
        reason: isUnsustainable ? "Contains plastic or disposable materials" : "Sustainable product",
        taxAmount: isUnsustainable ? 1.50 : 0
      };
    }

    console.log("🌍 Evaluating sustainability via Climatiq for:", productName);
    
    // Call Climatiq API to evaluate product
    const response = await fetch(CLIMATIQ_BASE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLIMATIQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // Climatiq expects activity data
        // Using a generic "goods" category with the product name
        emission_factor: {
          activity_id: "product:generic",
          source: "IPCC"
        },
        parameters: {
          weight_kg: 1,
          description: productName
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Climatiq API returned ${response.status}`);
    }

    const data = await response.json();
    console.log("🌍 Climatiq response:", data);

    // Score based on carbon emissions
    // Lower emissions = higher score (more sustainable)
    const emissions = data.co2e || 0;
    let score = 100 - (emissions * 10); // Simple scoring
    score = Math.max(0, Math.min(100, score)); // Clamp 0-100

    // Tax based on carbon footprint
    // Higher emissions = higher tax (incentivizes sustainable choices)
    const taxAmount = Math.min(5.00, (emissions / 10) || 1.50); // Max $5 tax

    return {
      isUnsustainable: score < 50,
      score: Math.round(score),
      emissions: emissions,
      reason: score < 50 ? `High carbon footprint: ${emissions.toFixed(2)}kg CO2e` : `Low carbon footprint: ${emissions.toFixed(2)}kg CO2e`,
      taxAmount: Math.round(taxAmount * 100) / 100 // Round to cents
    };
  } catch (error) {
    console.error("🔴 Climatiq evaluation error:", error.message);
    // Fallback to keyword matching on error
    const isUnsustainable = productName.toLowerCase().includes("plastic") || 
                            productName.toLowerCase().includes("disposable");
    return {
      isUnsustainable: isUnsustainable,
      score: isUnsustainable ? 25 : 75,
      reason: "Using fallback sustainability assessment",
      taxAmount: isUnsustainable ? 1.50 : 0
    };
  }
}

// Test the API connection
async function testNessieAPI() {
  try {
    console.log("Testing API with key:", NESSIE_API_KEY.substring(0, 10) + "...");
    console.log("Base URL:", NESSIE_BASE_URL);
    
    // Build URL carefully
    const accountsUrl = NESSIE_BASE_URL + "/accounts?key=" + NESSIE_API_KEY;
    console.log("Full URL:", accountsUrl.substring(0, 50) + "...");
    
    const response = await fetch(accountsUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    console.log("Response status:", response.status);
    console.log("Response ok:", response.ok);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`API returned ${response.status}: ${errorData.message || response.statusText}`);
    }
    
    const accounts = await response.json();
    console.log("Nessie API returned accounts:", accounts);

    // Format accounts for display
    let accountList = [];
    if (Array.isArray(accounts)) {
      accountList = accounts.map(acc => ({
        id: acc._id,
        type: acc.type,
        nickname: acc.nickname || 'Unnamed',
        balance: acc.balance
      }));
    }

    return { 
      message: `✓ API Connected! Found ${accountList.length} accounts`,
      accounts: accountList,
      data: accounts
    };
    
  } catch (error) {
    console.error("API Error:", error.message);
    console.error("Error stack:", error.stack);
    throw error;
  }
}

/**
 * Gets the balance of a specific account
 * @param {string} key - Nessie API key
 * @param {string} accountId - Account ID
 * @returns {Promise<number>} Account balance
 */
async function getAccountBalance(key, accountId) {
  try {
    const url = NESSIE_BASE_URL + "/accounts/" + accountId + "?key=" + key;
    console.log("Fetching account balance for:", accountId);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`API returned ${response.status}: ${errorData.message || response.statusText}`);
    }
    
    const account = await response.json();
    console.log("Account details:", account);
    
    return account.balance || 0;
  } catch (error) {
    console.error("Error fetching account balance:", error.message);
    throw error;
  }
}

/**
 * Performs a transfer from main account to savings account
 * This is the "Sustainability Tax" functionality
 * @param {string} key - Nessie API key
 * @param {string} fromId - Main account ID
 * @param {string} toId - Savings/Sustainability account ID
 * @param {number} amount - Amount to transfer
 * @returns {Promise} Transfer result
 */
async function performNessieTransfer(key, fromId, toId, amount) {
  const url = `${NESSIE_BASE_URL}/accounts/${fromId}/transfers?key=${key}`;
  
  const payload = {
    medium: "balance",
    payee_id: toId,
    amount: amount,
    transaction_date: new Date().toISOString().split('T')[0],
    description: "WattWise Sustainability Offset"
  };
  
  console.log("Initiating transfer:", payload);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(`Transfer failed: ${error.message}`);
  }

  const result = await response.json();
  console.log(`✓ Successfully transferred $${amount} to Sustainability Savings!`);
  return result;
}

async function fetchNessieData(productName) {
  // First, get list of customers
  const url = `${NESSIE_BASE_URL}/customers?key=${NESSIE_API_KEY}`;
  
  try {
    const response = await fetch(url);
    const customers = await response.json();
    console.log("Available Customers:", customers);
    
    // If customers exist, use the first one's ID to get accounts
    if (customers && customers.length > 0) {
      const customerId = customers[0]._id;
      const accountsUrl = `${NESSIE_BASE_URL}/customers/${customerId}/accounts?key=${NESSIE_API_KEY}`;
      const accountsResponse = await fetch(accountsUrl);
      const accounts = await accountsResponse.json();
      console.log("User Accounts:", accounts);
      return accounts;
    }
    
    return customers;
  } catch (error) {
    console.error("Nessie API Error:", error);
    throw error;
  }
}