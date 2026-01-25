var NESSIE_BASE_URL = "http://api.nessieisreal.com";

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  console.log('[WattWise BG] Received:', message.type);
  
  if (message.type === "ANALYZE_PRODUCT") {
    handleAnalysis(message.name, sendResponse);
    return true;
  }
  if (message.type === "GET_ACCOUNT_DETAILS") {
    handleBalanceRequest(sendResponse);
    return true;
  }
});

function handleAnalysis(productName, sendResponse) {
  console.log('[WattWise BG] Analyzing:', productName);
  
  var productLower = productName.toLowerCase();
  var isUnsustainable = productLower.includes('plastic') || productLower.includes('disposable') || productLower.includes('styrofoam');
  
  var result = {
    isUnsustainable: isUnsustainable,
    reason: isUnsustainable ? "Contains unsustainable materials" : "Likely sustainable choice",
    taxAmount: isUnsustainable ? 1.50 : 0,
    score: isUnsustainable ? 20 : 80
  };
  
  chrome.storage.local.set({ lastProductAnalysis: result });
  console.log('[WattWise BG] ✅ Stored:', result);
  sendResponse({ success: true, evaluation: result });
}

function handleBalanceRequest(sendResponse) {
  console.log('[WattWise BG] Fetching balances...');
  chrome.storage.local.get(["nessieApiKey", "mainAccount", "savingsAccount"], function(data) {
    if (!data.nessieApiKey || !data.mainAccount || !data.savingsAccount) {
      console.error('[WattWise BG] Missing credentials');
      sendResponse({ 
        success: false, 
        error: 'Add credentials in Settings',
        mainBalance: 0,
        savingsBalance: 0
      });
      return;
    }
    
    var mainUrl = NESSIE_BASE_URL + '/accounts/' + data.mainAccount + '?key=' + data.nessieApiKey;
    console.log('[WattWise BG] Fetching main account...');
    
    fetch(mainUrl)
      .then(function(res) { return res.json(); })
      .then(function(mainData) {
        var mainBalance = mainData.balance || 0;
        var savingsUrl = NESSIE_BASE_URL + '/accounts/' + data.savingsAccount + '?key=' + data.nessieApiKey;
        return fetch(savingsUrl)
          .then(function(res) { return res.json(); })
          .then(function(savingsData) {
            var savingsBalance = savingsData.balance || 0;
            console.log('[WattWise BG] ✅ Balances:', mainBalance, savingsBalance);
            sendResponse({ success: true, mainBalance: mainBalance, savingsBalance: savingsBalance });
          });
      })
      .catch(function(error) {
        console.error('[WattWise BG] Error:', error.message);
        sendResponse({ 
          success: false, 
          error: error.message,
          mainBalance: 0,
          savingsBalance: 0
        });
      });
  });
}