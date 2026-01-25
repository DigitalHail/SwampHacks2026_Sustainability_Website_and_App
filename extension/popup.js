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
  
  chrome.storage.local.get([
    'apiKey',
    'mainAccount',
    'savingsAccount',
    'climatiqKey',
    'carbonBudgetKg',
    'enableIfixit',
    'lastBudgetStatus',
    'lastProductAnalysis',
    'lastPurchaseHistory',
    'lastPurchaseHistoryAt'
  ], (result) => {
    document.getElementById('apiKey').value = result.apiKey || '';
    document.getElementById('mainAccount').value = result.mainAccount || '';
    document.getElementById('savingsAccount').value = result.savingsAccount || '';
    document.getElementById('climatiqKey').value = result.climatiqKey || '';
    document.getElementById('carbonBudget').value = result.carbonBudgetKg || '';
    document.getElementById('enableIfixit').checked = !!result.enableIfixit;

    if (result.lastProductAnalysis) {
      displaySustainabilityImpact(result.lastProductAnalysis);
      displayRepairability(result.lastProductAnalysis.repairability);
      displayBudgetStatus(result.lastProductAnalysis.budgetStatus);
    }

    if (result.lastBudgetStatus) {
      displayBudgetStatus(result.lastBudgetStatus);
    }

    if (result.lastPurchaseHistory) {
      displayPurchaseHistory(result.lastPurchaseHistory, result.lastPurchaseHistoryAt);
    }
  });
  
  // Query the active tab and trigger page scanning
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    console.log("🔵 [WattWise Popup] Found tabs:", tabs.length);
    if (tabs[0]) {
      const tabId = tabs[0].id;
      const tabUrl = tabs[0].url;
      console.log("🔵 [WattWise Popup] Scanning page:", tabUrl, "Tab ID:", tabId);
      
      chrome.tabs.sendMessage(tabId, {type: 'SCAN_PAGE'}, (response) => {
        if (chrome.runtime.lastError) {
          console.log("🟡 [WattWise Popup] Content script not loaded. Error:", chrome.runtime.lastError.message);
          console.log("🟡 [WattWise Popup] This likely means the content script hasn't injected yet");
          document.getElementById('status').textContent = '🔄 Scanning page...';
          return;
        }
        if (response) {
          console.log("🟢 [WattWise Popup] Scan response:", response);
          document.getElementById('status').textContent = response.message || 'Page scanned';
          
          // Always request fresh analysis from storage after a small delay
          // to give content script time to update it
          setTimeout(() => {
            chrome.storage.local.get(['lastProductAnalysis'], (result) => {
              if (result.lastProductAnalysis) {
                console.log("🟢 Retrieved fresh product analysis:", result.lastProductAnalysis);
                displaySustainabilityImpact(result.lastProductAnalysis);
                displayRepairability(result.lastProductAnalysis.repairability);
                displayBudgetStatus(result.lastProductAnalysis.budgetStatus);
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
  const impactEmissions = document.getElementById('impactEmissions');
  
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

  if (data.emissions !== undefined) {
    impactEmissions.textContent = `Estimated emissions: ${data.emissions} kg CO2e`;
  } else {
    impactEmissions.textContent = '';
  }
  
  impactSection.style.display = 'block';
}

function displayRepairability(repairability) {
  const section = document.getElementById('repairabilitySection');
  const scoreEl = document.getElementById('repairabilityScore');
  const summaryEl = document.getElementById('repairabilitySummary');
  const linkEl = document.getElementById('repairabilityLink');

  if (!repairability) {
    section.style.display = 'none';
    return;
  }

  const scoreText = repairability.score !== null && repairability.score !== undefined
    ? `Repairability score: ${repairability.score}`
    : 'Repairability score: Not available';
  scoreEl.textContent = scoreText;
  summaryEl.textContent = repairability.summary || repairability.title || '';

  if (repairability.url) {
    linkEl.href = repairability.url;
    linkEl.style.display = 'inline';
  } else {
    linkEl.style.display = 'none';
  }

  section.style.display = 'block';
}

function displayBudgetStatus(status) {
  const section = document.getElementById('budgetSection');
  if (!status) {
    section.style.display = 'none';
    return;
  }

  document.getElementById('budgetTotal').textContent = status.budgetKg || 0;
  document.getElementById('budgetUsed').textContent = status.emissionsKg || 0;
  document.getElementById('budgetRemaining').textContent = status.remainingKg || 0;
  document.getElementById('budgetPercent').textContent = `Used ${status.percentUsed || 0}% of your monthly budget (${status.monthKey})`;
  section.style.display = 'block';
}

function displayPurchaseHistory(purchases, timestamp) {
  const section = document.getElementById('purchaseHistorySection');
  const list = document.getElementById('purchaseHistoryList');
  const meta = document.getElementById('purchaseHistoryMeta');

  list.innerHTML = '';
  if (!Array.isArray(purchases) || purchases.length === 0) {
    meta.textContent = 'No purchases found.';
    section.style.display = 'block';
    return;
  }

  const shown = purchases.slice(0, 5);
  shown.forEach((purchase) => {
    const item = document.createElement('li');
    const amount = purchase.amount ? `$${purchase.amount.toFixed(2)}` : '$0.00';
    item.textContent = `${purchase.description || 'Purchase'} — ${amount}`;
    list.appendChild(item);
  });

  const metaText = timestamp
    ? `Updated: ${new Date(timestamp).toLocaleString()}`
    : 'Updated: just now';
  meta.textContent = metaText;
  section.style.display = 'block';
}

// Save settings
document.getElementById('saveSettings').addEventListener('click', () => {
  const apiKey = document.getElementById('apiKey').value;
  const mainAccount = document.getElementById('mainAccount').value;
  const savingsAccount = document.getElementById('savingsAccount').value;
  const climatiqKey = document.getElementById('climatiqKey').value;
  const carbonBudgetValue = document.getElementById('carbonBudget').value;
  const enableIfixit = document.getElementById('enableIfixit').checked;
  const carbonBudgetKg = carbonBudgetValue ? Number(carbonBudgetValue) : null;
  
  if (!apiKey || !mainAccount || !savingsAccount) {
    showStatus('Please fill in Nessie settings', 'error');
    return;
  }
  
  chrome.storage.local.set({
    apiKey: apiKey,
    mainAccount: mainAccount,
    savingsAccount: savingsAccount,
    climatiqKey: climatiqKey,
    carbonBudgetKg: carbonBudgetKg,
    enableIfixit: enableIfixit
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

document.getElementById('loadHistory').addEventListener('click', async () => {
  try {
    const data = await chrome.storage.local.get(['apiKey', 'mainAccount']);
    const apiKey = data.apiKey;
    const mainAccountId = data.mainAccount;

    if (!apiKey || !mainAccountId) {
      showStatus('❌ Please configure Nessie settings first', 'error');
      return;
    }

    const response = await chrome.runtime.sendMessage({
      type: 'GET_PURCHASE_HISTORY',
      apiKey: apiKey,
      accountId: mainAccountId
    });

    if (response?.success) {
      displayPurchaseHistory(response.purchases, new Date().toISOString());
      showStatus('✓ Purchase history loaded', 'success');
    } else {
      showStatus('❌ Error: ' + (response?.error || 'Unknown error'), 'error');
    }
  } catch (error) {
    showStatus('❌ Error: ' + error.message, 'error');
  }
});

function showStatus(message, type) {
  const statusDiv = document.getElementById('settingsStatus');
  statusDiv.innerHTML = `
    <span>${message}</span>
    <button class="close-btn">✕</button>
  `;
  statusDiv.className = 'status ' + type;
  
  const closeBtn = statusDiv.querySelector('.close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      statusDiv.textContent = '';
      statusDiv.className = '';
    });
  }
}
