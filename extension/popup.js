let enableIfixitSetting = false;

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
    'geminiKey',
    'carbonBudgetKg',
    'enableIfixit',
    'lastBudgetStatus',
    'lastProductAnalysis',
    'lastGreenAlternatives'
  ], (result) => {
    document.getElementById('apiKey').value = result.apiKey || '';
    document.getElementById('mainAccount').value = result.mainAccount || '';
    document.getElementById('savingsAccount').value = result.savingsAccount || '';
    document.getElementById('climatiqKey').value = result.climatiqKey || '';
    document.getElementById('geminiKey').value = result.geminiKey || '';
    document.getElementById('carbonBudget').value = result.carbonBudgetKg || '';
  enableIfixitSetting = !!result.enableIfixit;
  document.getElementById('enableIfixit').checked = enableIfixitSetting;

    if (result.lastProductAnalysis) {
      displaySustainabilityImpact(result.lastProductAnalysis);
  displayRepairability(result.lastProductAnalysis.repairability, enableIfixitSetting);
      displayBudgetStatus(result.lastProductAnalysis.budgetStatus);
    }

    if (result.lastBudgetStatus) {
      displayBudgetStatus(result.lastBudgetStatus);
    }

    if (result.lastGreenAlternatives) {
      displayGreenAlternatives(result.lastGreenAlternatives);
    }
  });
  
  // Query the active tab and trigger page scanning
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    console.log("🔵 [WattWise Popup] Found tabs:", tabs.length);
    if (tabs[0]) {
      const tabId = tabs[0].id;
      const tabUrl = tabs[0].url;
      console.log("🔵 [WattWise Popup] Scanning page:", tabUrl, "Tab ID:", tabId);
      document.getElementById('status').textContent = '🔄 Scanning page...';
      let didRespond = false;
      const scanTimeout = setTimeout(() => {
        if (!didRespond) {
          console.log("🟡 [WattWise Popup] Scan timed out");
          document.getElementById('status').textContent = '⚠️ Could not scan page';
          hideAnalysisSections();
        }
      }, 2000);
      
      chrome.tabs.sendMessage(tabId, {type: 'SCAN_PAGE'}, (response) => {
        didRespond = true;
        clearTimeout(scanTimeout);
        if (chrome.runtime.lastError) {
          console.log("🟡 [WattWise Popup] Content script not loaded. Error:", chrome.runtime.lastError.message);
          console.log("🟡 [WattWise Popup] This likely means the content script hasn't injected yet");
          document.getElementById('status').textContent = '⚠️ Page not supported';
          hideAnalysisSections();
          return;
        }
        if (!response) {
          console.log("� [WattWise Popup] No response from content script");
          document.getElementById('status').textContent = '⚠️ Unable to detect product';
          hideAnalysisSections();
          return;
        }

        console.log("�🟢 [WattWise Popup] Scan response:", response);
        document.getElementById('status').textContent = response.message || 'Page scanned';
        if (!response.success) {
          hideAnalysisSections();
          return;
        }
        
        // Always request fresh analysis from storage after a small delay
        // to give content script time to update it
        setTimeout(() => {
          chrome.storage.local.get(['lastProductAnalysis', 'lastGreenAlternatives'], (result) => {
            if (result.lastProductAnalysis) {
              console.log("🟢 Retrieved fresh product analysis:", result.lastProductAnalysis);
              displaySustainabilityImpact(result.lastProductAnalysis);
              displayRepairability(result.lastProductAnalysis.repairability, enableIfixitSetting);
              displayBudgetStatus(result.lastProductAnalysis.budgetStatus);
            }
            if (result.lastGreenAlternatives) {
              displayGreenAlternatives(result.lastGreenAlternatives);
            }
          });
        }, 500);
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

  // Show Gemini context if available
  if (data.geminiContext) {
    const contextDiv = document.createElement('div');
    contextDiv.style.cssText = 'margin-top: 10px; padding: 8px; background: rgba(255,255,255,0.5); border-radius: 4px; font-size: 12px; line-height: 1.4;';
    contextDiv.innerHTML = `<strong>🤖 AI Insight:</strong><br>${data.geminiContext}`;
    impactMessage.appendChild(contextDiv);
  }

  if (data.emissions !== undefined) {
    impactEmissions.textContent = `Estimated emissions: ${data.emissions} kg CO2e`;
  } else {
    impactEmissions.textContent = '';
  }
  
  impactSection.style.display = 'block';
}

function hideAnalysisSections() {
  const impactSection = document.getElementById('impactSection');
  const repairSection = document.getElementById('repairabilitySection');
  const budgetSection = document.getElementById('budgetSection');
  const alternativesSection = document.getElementById('greenAlternativesSection');

  if (impactSection) {
    impactSection.style.display = 'none';
  }
  if (repairSection) {
    repairSection.style.display = 'none';
  }
  if (budgetSection) {
    budgetSection.style.display = 'none';
  }
  if (alternativesSection) {
    alternativesSection.style.display = 'none';
  }
}

function displayRepairability(repairability, enableIfixit) {
  const section = document.getElementById('repairabilitySection');
  const scoreEl = document.getElementById('repairabilityScore');
  const summaryEl = document.getElementById('repairabilitySummary');
  const linkEl = document.getElementById('repairabilityLink');

  if (!repairability) {
    if (enableIfixit) {
      scoreEl.textContent = 'Repairability score: Checking iFixit...';
      summaryEl.textContent = 'We have not received repairability data yet.';
      linkEl.style.display = 'none';
      section.style.display = 'block';
      return;
    }
    section.style.display = 'none';
    return;
  }

  let scoreText = 'Repairability score: Not available';
  if (repairability.score !== null && repairability.score !== undefined) {
    scoreText = `Repairability score: ${repairability.score}`;
  } else if (repairability.status === 'not_found') {
    scoreText = 'Repairability score: Not found';
  } else if (repairability.status === 'error') {
    scoreText = 'Repairability score: Lookup failed';
  }
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

function displayGreenAlternatives(alternativesData) {
  const section = document.getElementById('greenAlternativesSection');
  const loading = document.getElementById('alternativesLoading');
  const list = document.getElementById('alternativesList');
  const note = document.getElementById('alternativesNote');

  if (!alternativesData) {
    section.style.display = 'none';
    return;
  }

  if (alternativesData.loading) {
    loading.style.display = 'block';
    list.innerHTML = '';
    note.style.display = 'none';
    section.style.display = 'block';
    return;
  }

  loading.style.display = 'none';
  list.innerHTML = '';

  if (alternativesData.error) {
    list.innerHTML = `<p style="color: #c62828; font-size: 12px;">${alternativesData.error}</p>`;
    section.style.display = 'block';
    return;
  }

  if (!alternativesData.alternatives || alternativesData.alternatives.length === 0) {
    list.innerHTML = '<p style="font-size: 12px; color: #666;">No green alternatives found for this product.</p>';
    section.style.display = 'block';
    return;
  }

  alternativesData.alternatives.forEach((alt, index) => {
    const altDiv = document.createElement('div');
    altDiv.style.cssText = 'padding: 8px; margin: 6px 0; background: rgba(255,255,255,0.7); border-radius: 4px; border-left: 3px solid #2e7d32;';
    
    let html = `<strong style="font-size: 13px;">${index + 1}. ${alt.name || 'Alternative'}</strong>`;
    
    if (alt.type) {
      const typeColors = {
        'refurbished': '#ff9800',
        'used': '#795548',
        'sustainable': '#4caf50',
        'repairable': '#2196f3'
      };
      const color = typeColors[alt.type.toLowerCase()] || '#666';
      html += ` <span style="font-size: 10px; background: ${color}; color: white; padding: 2px 6px; border-radius: 10px;">${alt.type}</span>`;
    }
    
    if (alt.reason) {
      html += `<p style="font-size: 11px; margin: 4px 0 0 0; color: #555;">${alt.reason}</p>`;
    }
    
    if (alt.repairabilityScore !== undefined && alt.repairabilityScore !== null) {
      html += `<p style="font-size: 11px; margin: 2px 0 0 0; color: #1976d2;">🛠️ iFixit Score: ${alt.repairabilityScore}/10</p>`;
    }
    
    if (alt.searchUrl) {
      html += `<a href="${alt.searchUrl}" target="_blank" style="font-size: 11px; color: #1565c0;">Search for this →</a>`;
    }
    
    altDiv.innerHTML = html;
    list.appendChild(altDiv);
  });

  note.style.display = 'block';
  section.style.display = 'block';
}

// Save settings
document.getElementById('saveSettings').addEventListener('click', () => {
  const apiKey = document.getElementById('apiKey').value;
  const mainAccount = document.getElementById('mainAccount').value;
  const savingsAccount = document.getElementById('savingsAccount').value;
  const climatiqKey = document.getElementById('climatiqKey').value;
  const geminiKey = document.getElementById('geminiKey').value;
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
    geminiKey: geminiKey,
    carbonBudgetKg: carbonBudgetKg,
    enableIfixit: enableIfixit
  }, () => {
    enableIfixitSetting = enableIfixit;
    showStatus('✓ Settings saved successfully!', 'success');
    triggerPageScan();
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

document.getElementById('clearIfixitCache').addEventListener('click', async () => {
  try {
    await chrome.storage.local.remove(['ifixitCache', 'lastProductAnalysis']);
    showStatus('✓ Repairability cache cleared', 'success');
    triggerPageScan();
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

function triggerPageScan() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || !tabs[0]) {
      return;
    }
    chrome.tabs.sendMessage(tabs[0].id, { type: 'SCAN_PAGE' }, () => {
      if (chrome.runtime.lastError) {
        console.log("🟡 [WattWise Popup] Scan after save failed:", chrome.runtime.lastError.message);
      }
    });
  });
}
