console.log("🔴 [WattWise Background] Service worker loading...");

// Store API keys in Chrome storage instead of hardcoding
let NESSIE_API_KEY = "99864d500fa931ec644d3a5d865a866c";
// Nessie API uses HTTP, not HTTPS
const NESSIE_BASE_URL = "http://api.nessieisreal.com";

// Climatiq API for sustainability scoring
const CLIMATIQ_BASE_URL = "https://api.climatiq.io/estimate";
// You can get a free API key at https://climatiq.io/
let CLIMATIQ_API_KEY = "40D52DBM4D1BVC4E7M1GTAEKDR";

// iFixit API for repairability scores (optional)
const IFIXIT_BASE_URL = "https://www.ifixit.com/api/2.0";
const IFIXIT_SCORE_CSV_URL = "https://docs.google.com/spreadsheets/d/1R_egXm7iwR0isCt_UxcGtheFEwLj9SNhxC5DWnAqKIc/export?format=csv";
const IFIXIT_SCORE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

console.log("🟢 [WattWise Background] Service worker loaded!");
console.log("🔑 [WattWise Background] API Key initialized:", NESSIE_API_KEY.substring(0, 10) + "...");

// Load API keys from Chrome storage on startup
chrome.storage.sync.get(['nessieApiKey', 'climatiqApiKey'], (result) => {
  if (result.nessieApiKey) {
    NESSIE_API_KEY = result.nessieApiKey;
    console.log("🔑 [WattWise Background] Nessie key loaded from sync");
  }
  if (result.climatiqApiKey) {
    CLIMATIQ_API_KEY = result.climatiqApiKey;
    console.log("🔑 [WattWise Background] Climatiq key loaded from sync");
  }
});

// Also check local storage for recently saved keys
chrome.storage.local.get(['climatiqKey'], (result) => {
  if (result.climatiqKey) {
    CLIMATIQ_API_KEY = result.climatiqKey;
    console.log("🔑 [WattWise Background] Climatiq key loaded from local");
  }
});

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  console.log("📬 [WattWise Background] Message received:", message.type, "from", sender);
  console.log("📋 [WattWise Background] Full message:", message);
  
  if (message.type === "ANALYZE_PRODUCT") {
    console.log("🔍 [WattWise Background] Analyzing product:", message.name);
    const data = await chrome.storage.local.get([
      "apiKey",
      "mainAccount",
      "savingsAccount",
      "climatiqKey",
      "enableIfixit",
      "carbonBudgetKg",
      "carbonMonthKey",
      "carbonEmissionsKg",
      "ifixitCache"
    ]);
    console.log("📊 [WattWise Background] Storage data:", data);

    if (data.apiKey) {
      NESSIE_API_KEY = data.apiKey;
    }
    if (data.climatiqKey) {
      CLIMATIQ_API_KEY = data.climatiqKey;
    }

    try {
      // Evaluate sustainability using Climatiq (with fallback to keywords)
      console.log("🌱 [WattWise Background] Evaluating sustainability...");
      const evaluation = await evaluateSustainability(message.name);
      console.log("✅ [WattWise Background] Sustainability evaluation:", evaluation);
      
      const repairability = await getRepairabilityScore(
        message.name,
        data.enableIfixit,
        data.ifixitCache || {}
      );

      const budgetStatus = await updateMonthlyBudget(
        evaluation.emissions || 0,
        data.carbonBudgetKg,
        data.carbonMonthKey,
        data.carbonEmissionsKg
      );

      const analysis = {
        name: message.name,
        isUnsustainable: evaluation.isUnsustainable,
        score: evaluation.score,
        emissions: evaluation.emissions || 0,
        reason: evaluation.reason,
        taxAmount: evaluation.taxAmount || 0,
        repairability: repairability.data,
        budgetStatus: budgetStatus,
        analyzedAt: new Date().toISOString()
      };

      await chrome.storage.local.set({
        lastProductAnalysis: analysis,
        lastBudgetStatus: budgetStatus,
        ifixitCache: repairability.cache
      });

      console.log("✅ Stored product analysis and budget status");

      sendResponse({
        success: true,
        message: `Product analyzed (Score: ${analysis.score}/100)`,
        evaluation: analysis
      });
    } catch (error) {
      console.error("Product analysis error:", error);
      sendResponse({ success: false, error: error.message });
    }
    return true; // Keep listener alive for async response
  }
  
  if (message.type === "CHECK_BALANCE") {
    console.log("CHECK_BALANCE requested");
    try {
      const stored = await chrome.storage.local.get(["apiKey"]);
      const key = stored.apiKey || NESSIE_API_KEY;
      const data = await testNessieAPI(key);
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

  if (message.type === "GET_PURCHASE_HISTORY") {
    console.log("GET_PURCHASE_HISTORY requested");
    try {
      const purchases = await getPurchaseHistory(message.apiKey, message.accountId);
      await chrome.storage.local.set({
        lastPurchaseHistory: purchases,
        lastPurchaseHistoryAt: new Date().toISOString()
      });
      sendResponse({ success: true, purchases: purchases });
    } catch (error) {
      console.error("GET_PURCHASE_HISTORY error:", error.message);
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
      const emissions = isUnsustainable ? 8 : 2;
      return {
        isUnsustainable: isUnsustainable,
        score: isUnsustainable ? 25 : 75,
        emissions: emissions,
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
    const emissions = isUnsustainable ? 8 : 2;
    return {
      isUnsustainable: isUnsustainable,
      score: isUnsustainable ? 25 : 75,
      emissions: emissions,
      reason: "Using fallback sustainability assessment",
      taxAmount: isUnsustainable ? 1.50 : 0
    };
  }
}

function getMonthKey(date) {
  const value = date || new Date();
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function roundToTwo(value) {
  return Math.round(value * 100) / 100;
}

async function updateMonthlyBudget(emissionsKg, budgetKg, storedMonthKey, storedEmissionsKg) {
  const monthKey = getMonthKey();
  const normalizedBudget = Number.isFinite(budgetKg) && budgetKg > 0 ? budgetKg : 50;
  let currentEmissions = 0;

  if (storedMonthKey === monthKey) {
    currentEmissions = Number(storedEmissionsKg) || 0;
  }

  currentEmissions += Number(emissionsKg) || 0;
  const remaining = normalizedBudget - currentEmissions;
  const percentUsed = normalizedBudget > 0 ? (currentEmissions / normalizedBudget) * 100 : 0;

  const status = {
    monthKey: monthKey,
    budgetKg: roundToTwo(normalizedBudget),
    emissionsKg: roundToTwo(currentEmissions),
    remainingKg: roundToTwo(Math.max(0, remaining)),
    percentUsed: roundToTwo(Math.max(0, percentUsed))
  };

  await chrome.storage.local.set({
    carbonMonthKey: monthKey,
    carbonEmissionsKg: currentEmissions,
    carbonBudgetKg: normalizedBudget
  });

  return status;
}

function normalizeCacheKey(productName) {
  return productName.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizeDeviceName(name) {
  return name
    .toLowerCase()
    .replace(/\b(refurbished|renewed|used|preowned|pre-owned|amazon|certified|unlocked|locked)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCsvRows(csvText) {
  const rows = [];
  let currentRow = [];
  let currentValue = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i += 1) {
    const char = csvText[i];
    const next = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentValue += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentValue.trim());
      currentValue = "";
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        i += 1;
      }
      currentRow.push(currentValue.trim());
      if (currentRow.some((value) => value.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentValue = "";
      continue;
    }

    currentValue += char;
  }

  if (currentValue.length || currentRow.length) {
    currentRow.push(currentValue.trim());
    if (currentRow.some((value) => value.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

async function getRepairabilityScoreTable(cache) {
  const cachedTable = cache.__scoreTable;
  if (cachedTable && cachedTable.fetchedAt && cachedTable.entries) {
    const age = Date.now() - cachedTable.fetchedAt;
    if (age < IFIXIT_SCORE_CACHE_TTL_MS) {
      return { entries: cachedTable.entries, cacheMeta: cachedTable };
    }
  }

  const response = await fetch(IFIXIT_SCORE_CSV_URL);
  if (!response.ok) {
    throw new Error(`Repairability list returned ${response.status}`);
  }
  const csv = await response.text();
  const rows = parseCsvRows(csv);
  if (rows.length < 2) {
    throw new Error("Repairability list is empty");
  }

  const header = rows[0];
  const deviceIndex = header.indexOf("Device");
  const scoreIndex = header.indexOf("Score");
  const oemIndex = header.indexOf("OEM");
  const dateIndex = header.indexOf("Date");

  if (deviceIndex === -1 || scoreIndex === -1) {
    throw new Error("Repairability list is missing required columns");
  }

  const entries = rows.slice(1).reduce((acc, cols) => {
    const device = cols[deviceIndex];
    const score = cols[scoreIndex];
    if (!device || !score) {
      return acc;
    }
    const normalized = normalizeDeviceName(device);
    if (!normalized) {
      return acc;
    }
    acc.push({
      device: device,
      normalized: normalized,
      score: Number(score),
      oem: oemIndex >= 0 ? cols[oemIndex] : null,
      year: dateIndex >= 0 ? cols[dateIndex] : null,
      url: `https://www.ifixit.com/Device/${encodeURIComponent(device.replace(/\s+/g, "_"))}`
    });
    return acc;
  }, []);

  const cacheMeta = {
    fetchedAt: Date.now(),
    entries: entries
  };

  return { entries: entries, cacheMeta: cacheMeta };
}

function findBestRepairabilityMatch(productName, entries) {
  const normalizedProduct = normalizeDeviceName(productName);
  if (!normalizedProduct || !entries || entries.length === 0) {
    return null;
  }

  let best = null;
  entries.forEach((entry) => {
    if (!entry.normalized) {
      return;
    }
    const isMatch =
      normalizedProduct.includes(entry.normalized) ||
      entry.normalized.includes(normalizedProduct);
    if (!isMatch) {
      return;
    }
    if (!best || entry.normalized.length > best.normalized.length) {
      best = entry;
    }
  });

  return best;
}

async function getRepairabilityScore(productName, enableIfixit, cache) {
  if (!enableIfixit) {
    return { data: null, cache: cache };
  }

  const cacheKey = normalizeCacheKey(productName);
  const cached = cache[cacheKey];
  if (cached && cached.cachedAt) {
    const cachedAt = new Date(cached.cachedAt);
    const ageDays = (Date.now() - cachedAt.getTime()) / (1000 * 60 * 60 * 24);
    const isCurrentSource = cached.source === "iFixit Repairability Scores";
    if (ageDays <= 30 && isCurrentSource) {
      return { data: cached, cache: cache };
    }
  }

  try {
    const table = await getRepairabilityScoreTable(cache);
    const match = findBestRepairabilityMatch(productName, table.entries);
    const score = match ? match.score : null;
    const deviceTitle = match ? match.device : productName;
    const deviceUrl = match ? match.url : null;

    const entry = {
      score: score !== null ? Number(score) : null,
      title: deviceTitle,
      url: deviceUrl,
      summary: match
        ? `Score from iFixit's smartphone repairability list (Year ${match.year}).`
        : "No repairability score found in the iFixit list for this device.",
      source: "iFixit Repairability Scores",
      status: match ? "ok" : "not_found",
      cachedAt: new Date().toISOString()
    };

    const nextCache = { ...cache, [cacheKey]: entry, __scoreTable: table.cacheMeta };
    return { data: entry, cache: nextCache };
  } catch (error) {
    console.warn("⚠️ iFixit lookup failed:", error.message);
    const entry = {
      score: null,
      title: productName,
      url: null,
      summary: "Repairability lookup failed. Try again later.",
      source: "iFixit",
      status: "error",
      cachedAt: new Date().toISOString()
    };
    const nextCache = { ...cache, [cacheKey]: entry };
    return { data: entry, cache: nextCache };
  }
}

// Test the API connection
async function testNessieAPI(key) {
  try {
    const safeKey = key ? key.substring(0, 10) + "..." : "(missing)";
    console.log("Testing API with key:", safeKey);
    console.log("Base URL:", NESSIE_BASE_URL);
    
    // Build URL carefully
    const accountsUrl = NESSIE_BASE_URL + "/accounts?key=" + key;
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

async function getPurchaseHistory(key, accountId) {
  if (!key || !accountId) {
    throw new Error("Missing Nessie API key or account ID");
  }

  const url = `${NESSIE_BASE_URL}/accounts/${accountId}/purchases?key=${key}`;
  console.log("Fetching purchase history for:", accountId);

  const response = await fetch(url);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(`API returned ${response.status}: ${errorData.message || response.statusText}`);
  }

  const purchases = await response.json();
  return Array.isArray(purchases) ? purchases : [];
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