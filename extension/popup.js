document.addEventListener('DOMContentLoaded', () => {
  const settingsKeys = ["nessieApiKey", "geminiApiKey", "climatiqApiKey", "mainAccount", "savingsAccount"];
  
  // Load settings
  chrome.storage.local.get(settingsKeys, (data) => {
    settingsKeys.forEach(key => {
      if (data[key]) document.getElementById(key).value = data[key];
    });
  });

  // Toggle Settings
  document.getElementById('toggleSettings').addEventListener('click', () => {
    document.getElementById('settingsPanel').classList.toggle('hidden');
  });

  // Save Settings
  document.getElementById('saveBtn').addEventListener('click', () => {
    const vals = {};
    settingsKeys.forEach(key => vals[key] = document.getElementById(key).value);
    chrome.storage.local.set(vals, () => {
      document.getElementById('connectionStatus').innerText = "Settings Saved!";
    });
  });

  // Manual Page Scan
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {type: 'SCAN_PAGE'}, (response) => {
        if (response && response.success) {
          document.getElementById('status').innerText = response.message;
          setTimeout(updateImpactUI, 500);
        }
      });
    }
  });
});

function updateImpactUI() {
  chrome.storage.local.get(['lastProductAnalysis'], (data) => {
    if (data.lastProductAnalysis) {
      const section = document.getElementById('impactSection');
      section.style.display = 'block';
      document.getElementById('impactMessage').innerText = data.lastProductAnalysis.reason;
    }
  });
}

document.getElementById('checkBalance').addEventListener('click', () => {
  chrome.runtime.sendMessage({type: 'GET_ACCOUNT_DETAILS'}, (res) => {
    if (res.success) {
      document.getElementById('mainBalance').innerText = res.mainBalance.toFixed(2);
      document.getElementById('savingsBalance').innerText = res.savingsBalance.toFixed(2);
      document.getElementById('balanceSection').style.display = 'block';
    }
  });
});