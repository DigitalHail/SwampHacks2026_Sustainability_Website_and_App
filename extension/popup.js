// Load saved settings when popup opens
document.addEventListener('DOMContentLoaded', () => {
  // Toggle settings panel
  const toggleBtn = document.getElementById('toggleSettings');
  const settingsPanel = document.getElementById('settingsPanel');
  const settingsIcon = toggleBtn.querySelector('.settings-icon');
  
  toggleBtn.addEventListener('click', () => {
    settingsPanel.classList.toggle('hidden');
    settingsIcon.textContent = settingsPanel.classList.contains('hidden') ? '▼' : '▲';
  });
  
  chrome.storage.local.get(['apiKey', 'mainAccount', 'savingsAccount', 'climatiqKey'], (result) => {
    document.getElementById('apiKey').value = result.apiKey || '';
    document.getElementById('mainAccount').value = result.mainAccount || '';
    document.getElementById('savingsAccount').value = result.savingsAccount || '';
    document.getElementById('climatiqKey').value = result.climatiqKey || '';
  });
  
  // Query the active tab and trigger page scanning
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0]) {
      const tabId = tabs[0].id;
      const tabUrl = tabs[0].url;
      console.log("🔵 Scanning page:", tabUrl);
      
      chrome.tabs.sendMessage(tabId, {type: 'SCAN_PAGE'}, (response) => {
        if (chrome.runtime.lastError) {
          console.log("🟡 Content script not loaded yet. Error:", chrome.runtime.lastError.message);
          document.getElementById('status').textContent = 'Ready';
          return;
        }
        if (response) {
          console.log("🟢 Scan response:", response);
          document.getElementById('status').textContent = response.message || 'Page scanned';
          
          // Always request fresh analysis from storage after a small delay
          // to give content script time to update it
          setTimeout(() => {
            chrome.storage.local.get(['lastProductAnalysis'], (result) => {
              if (result.lastProductAnalysis) {
                console.log("🟢 Retrieved fresh product analysis:", result.lastProductAnalysis);
                displaySustainabilityImpact(result.lastProductAnalysis);
              }
            });
          }, 500);
        }
      });
    }
  });
});

// Display sustainability impact warning
function displaySustainabilityImpact(data) {
  console.log("📊 Displaying impact for:", data);
  const impactSection = document.getElementById('impactSection');
  const impactMessage = document.getElementById('impactMessage');
  const impactPreview = document.getElementById('impactPreview');
  
  if (data.isUnsustainable) {
    impactSection.classList.remove('sustainable');
    impactSection.classList.add('unsustainable');
    impactMessage.innerHTML = `
      <strong>⚠️ Unsustainable Product</strong><br>
      <span style="font-size: 12px;">Score: ${data.score || 0}/100</span><br>
      <span style="font-size: 12px;">${data.reason || 'High environmental impact'}</span>
    `;
    impactPreview.textContent = `Sustainability Tax: $${data.taxAmount.toFixed(2)} → Goes to your Sustainability Savings`;
  } else {
    impactSection.classList.add('sustainable');
    impactSection.classList.remove('unsustainable');
    impactMessage.innerHTML = `
      <strong>✅ Sustainable Product</strong><br>
      <span style="font-size: 12px;">Score: ${data.score || 100}/100</span><br>
      <span style="font-size: 12px;">${data.reason || 'Low environmental impact'}</span>
    `;
    impactPreview.textContent = `No tax applied - great sustainable choice!`;
  }
  
  impactSection.style.display = 'block';
}

// Save settings
document.getElementById('saveSettings').addEventListener('click', () => {
  const apiKey = document.getElementById('apiKey').value;
  const mainAccount = document.getElementById('mainAccount').value;
  const savingsAccount = document.getElementById('savingsAccount').value;
  const climatiqKey = document.getElementById('climatiqKey').value;
  
  if (!apiKey || !mainAccount || !savingsAccount) {
    showStatus('Please fill in Nessie settings', 'error');
    return;
  }
  
  chrome.storage.local.set({
    apiKey: apiKey,
    mainAccount: mainAccount,
    savingsAccount: savingsAccount,
    climatiqKey: climatiqKey
  }, () => {
    showStatus('✓ Settings saved successfully!', 'success');
  });
});

// Test API button
document.getElementById('testAPI').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'CHECK_BALANCE' }, (response) => {
    if (response?.success) {
      let message = `✓ API Connected! Found ${response.data?.length || 0} accounts`;
      
      // If accounts found, display them
      if (response.accounts && response.accounts.length > 0) {
        message += '\n\nAvailable Accounts:\n';
        response.accounts.forEach((acc, idx) => {
          message += `${idx + 1}. ${acc.nickname} (${acc.type})\n   ID: ${acc.id}\n`;
        });
        
        // Auto-populate if there are at least 2 accounts
        if (response.accounts.length >= 2) {
          document.getElementById('mainAccount').value = response.accounts[0].id;
          document.getElementById('savingsAccount').value = response.accounts[1].id;
          message += '\n✓ Auto-filled account IDs (first 2 accounts)';
        }
      }
      
      showStatus(message, 'success');
    } else {
      showStatus('❌ Error: ' + (response?.error || 'Unknown error'), 'error');
    }
  });
});

// Check balance button
document.getElementById('checkBalance').addEventListener('click', async () => {
  try {
    const balanceSection = document.getElementById('balanceSection');
    
    // Toggle: if already showing, hide it
    if (balanceSection.style.display === 'block') {
      balanceSection.style.display = 'none';
      return;
    }
    
    // Get stored account IDs
    const data = await chrome.storage.local.get(['apiKey', 'mainAccount', 'savingsAccount']);
    const apiKey = data.apiKey;
    const mainAccountId = data.mainAccount;
    const savingsAccountId = data.savingsAccount;
    
    if (!apiKey || !mainAccountId || !savingsAccountId) {
      showStatus('❌ Please configure accounts in settings first', 'error');
      return;
    }
    
    // Fetch account details from background script
    const response = await chrome.runtime.sendMessage({
      type: 'GET_ACCOUNT_DETAILS',
      apiKey: apiKey,
      mainAccountId: mainAccountId,
      savingsAccountId: savingsAccountId
    });
    
    if (response?.success) {
      // Display balances
      document.getElementById('mainBalance').textContent = (response.mainBalance || 0).toFixed(2);
      document.getElementById('savingsBalance').textContent = (response.savingsBalance || 0).toFixed(2);
      document.getElementById('lastUpdated').textContent = new Date().toLocaleTimeString();
      balanceSection.style.display = 'block';
      showStatus('✓ Balances updated!', 'success');
    } else {
      showStatus('❌ Error: ' + (response?.error || 'Unknown error'), 'error');
    }
  } catch (error) {
    showStatus('❌ Error: ' + error.message, 'error');
  }
});

function showStatus(message, type) {
  const statusDiv = document.getElementById('settingsStatus');
  statusDiv.textContent = message;
  statusDiv.className = 'status ' + type;
  setTimeout(() => {
    statusDiv.textContent = '';
    statusDiv.className = '';
  }, 3000);
}
