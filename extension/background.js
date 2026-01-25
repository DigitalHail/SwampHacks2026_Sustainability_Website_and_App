// Base URLs for the APIs
const NESSIE_BASE_URL = "http://api.nessieisreal.com";
const CLIMATIQ_BASE_URL = "https://api.climatiq.io/estimate";

console.log("🟢 WattWise background service worker loaded!");

// Main message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received:", message.type);
  
  // 1. INTELLIGENT PRODUCT ANALYSIS (GEMINI + CLIMATIQ + NESSIE)
  if (message.type === "ANALYZE_PRODUCT") {
    handleProductAnalysis(message, sendResponse);
    return true; // Keep channel open for async response
  }
  
  // 2. TEST API CONNECTION (FROM YOUR ORIGINAL CODE)
  if (message.type === "CHECK_BALANCE") {
    testNessieAPI().then(data => sendResponse({ success: true, ...data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  // 3. GET ACCOUNT DETAILS FOR POPUP DISPLAY
  if (message.type === "GET_ACCOUNT_DETAILS") {
    handleGetAccountDetails(message, sendResponse);
    return true;
  }
});

// Logic for the intelligent analysis pipeline
async function handleProductAnalysis(message, sendResponse) {
  try {
    const data = await chrome.storage.local.get(["apiKey", "climatiqKey", "geminiApiKey", "mainAccount", "savingsAccount"]);
    
    if (!data.apiKey || !data.geminiApiKey) {
      sendResponse({ success: false, error: "Missing Nessie or Gemini API key" });
      return;
    }

    // Step A: Ask Gemini to evaluate the product
    console.log("🌍 Calling Gemini for:", message.name);
    const evaluation = await getGeminiEcoReport(message.name, data.geminiApiKey);
    
    // Step B: If Climatiq key is available, use Gemini's category for real carbon data
    let taxAmount = evaluation.isUnsustainable ? 1.50 : 0;
    if (data.climatiqKey && evaluation.isUnsustainable) {
        try {
            const carbonData = await getClimatiqFootprint(evaluation.category, data.climatiqKey);
            taxAmount = Math.min(5.00, carbonData.co2e * 0.25); // $0.25 per kg CO2e, max $5
        } catch (e) { console.log("Climatiq failed, using default tax."); }
    }

    // Step C: Trigger Nessie Transfer if unsustainable
    if (evaluation.isUnsustainable && taxAmount > 0) {
      await performNessieTransfer(data.apiKey, data.mainAccount, data.savingsAccount, taxAmount);
      
      // Step D: Alert the Arduino Uno R4 hardware bridge
      fetch('http://localhost:5000/alert', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ status: 'TAX_APPLIED' })
      }).catch(() => console.log("Hardware bridge not active."));

      sendResponse({ success: true, message: `Intelligent Tax: $${taxAmount}`, evaluation: {...evaluation, taxAmount} });
    } else {
      sendResponse({ success: true, message: "Product is sustainable!", evaluation: evaluation });
    }
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// Function to call Gemini 1.5 Flash
async function getGeminiEcoReport(productName, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const prompt = `Analyze this product for sustainability: "${productName}". Return ONLY a JSON object: {"isUnsustainable": boolean, "category": "electronics|home|clothing|other", "score": 0-100, "reason": "short explanation"}`;

  const res = await fetch(url, {
    method: 'POST',
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });
  const json = await res.json();
  return JSON.parse(json.candidates[0].content.parts[0].text);
}

// Function to call Climatiq API
async function getClimatiqFootprint(category, apiKey) {
  const res = await fetch(CLIMATIQ_BASE_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      emission_factor: { activity_id: `consumer_goods-type_${category}` },
      parameters: { money: 100, money_unit: "usd" }
    })
  });
  return await res.json();
}

// Function to perform Nessie Transfer
async function performNessieTransfer(key, fromId, toId, amount) {
  const url = `${NESSIE_BASE_URL}/accounts/${fromId}/transfers?key=${key}`;
  const payload = {
    medium: "balance", payee_id: toId, amount: parseFloat(amount),
    transaction_date: new Date().toISOString().split('T')[0],
    description: "WattWise Sustainability Offset"
  };
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error("Transfer failed");
  return await response.json();
}

// (Optional) Test the API connection - from your original code
async function testNessieAPI() {
    const data = await chrome.storage.local.get("apiKey");
    const response = await fetch(`${NESSIE_BASE_URL}/accounts?key=${data.apiKey}`);
    const accounts = await response.json();
    return { accounts: accounts.map(acc => ({ id: acc._id, nickname: acc.nickname, type: acc.type })) };
}

// (Optional) Get account balance - from your original code
async function handleGetAccountDetails(message, sendResponse) {
    try {
        const fetchBal = async (id) => {
            const res = await fetch(`${NESSIE_BASE_URL}/accounts/${id}?key=${message.apiKey}`);
            const data = await res.json();
            return data.balance || 0;
        };
        const main = await fetchBal(message.mainAccountId);
        const savings = await fetchBal(message.savingsAccountId);
        sendResponse({ success: true, mainBalance: main, savingsBalance: savings });
    } catch (e) { sendResponse({ success: false, error: e.message }); }
}