let enableIfixitSetting = false;

// ============================================
// 🚀 MAIN INITIALIZATION FUNCTION
// ============================================
function initPopup() {
  console.log('🔵 [WattWise Popup] initPopup() called, readyState:', document.readyState);
  
  // Toggle settings panel
  const toggleBtn = document.getElementById('toggleSettings');
  const settingsPanel = document.getElementById('settingsPanel');
  
  if (!toggleBtn || !settingsPanel) {
    console.error('🔴 [WattWise Popup] Critical elements not found!');
    return;
  }
  
  const settingsIcon = toggleBtn.querySelector('.settings-icon');
  
  toggleBtn.addEventListener('click', () => {
    settingsPanel.classList.toggle('hidden');
    if (settingsIcon) {
      settingsIcon.textContent = settingsPanel.classList.contains('hidden') ? '▼' : '▲';
    }
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
  
  console.log('🔵 [WattWise Popup] initPopup() complete');
}

// Initialize when DOM is ready - handles case where DOM might already be loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPopup);
} else {
  // DOM already loaded, call immediately
  initPopup();
}

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
    impactPreview.textContent = `No eco-bonus earned - consider a greener alternative!`;
    impactPreview.style.color = '#c62828';
  } else {
    impactSection.classList.add('sustainable');
    impactSection.classList.remove('unsustainable');
    const bonusAmount = data.ecoBonus || 0;
    impactMessage.innerHTML = `
      <strong>✅ Sustainable Product</strong><br>
      <span style="font-size: 12px;">Score: ${data.score || 100}/100</span><br>
      <span style="font-size: 12px;">${data.reason || 'Low environmental impact'}</span>
    `;
    if (bonusAmount > 0) {
      impactPreview.innerHTML = `💰 <strong>+$${bonusAmount.toFixed(2)} Eco-Bonus</strong> deposited to your Rewards Account!`;
      impactPreview.style.color = '#2e7d32';
    } else {
      impactPreview.textContent = `Great sustainable choice! 🌱`;
      impactPreview.style.color = '#2e7d32';
    }
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

// ============================================
// 🔘 BUTTON EVENT LISTENERS
// All listeners wrapped in DOMContentLoaded to ensure elements exist
// ============================================
function initButtonListeners() {
  // Save settings button
  const saveSettingsBtn = document.getElementById('saveSettings');
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', () => {
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
  }

  // Test API button
  const testAPIBtn = document.getElementById('testAPI');
  if (testAPIBtn) {
    testAPIBtn.addEventListener('click', () => {
      console.log('🔵 Test API button clicked');
      chrome.runtime.sendMessage({ type: 'CHECK_BALANCE' }, (response) => {
        console.log('📨 Test API response:', response);
        
        // Check for runtime errors first
        if (chrome.runtime.lastError) {
          console.error('🔴 Chrome runtime error:', chrome.runtime.lastError.message);
          showStatus('❌ Error: ' + chrome.runtime.lastError.message, 'error');
          return;
        }
        
        // Check if response exists
        if (!response) {
          console.error('🔴 No response from background script');
          showStatus('❌ Error: No response from extension (background script may be unresponsive)', 'error');
          return;
        }
        
        if (response?.success) {
          let message = `✓ API Connected! Found ${response.data?.length || response.accounts?.length || 0} accounts`;
          
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
          const errorMsg = response?.error || 'Unknown error - check console logs';
          console.error('🔴 API test failed:', errorMsg);
          showStatus('❌ Error: ' + errorMsg, 'error');
        }
      });
    });
  }

  // Clear iFixit cache button
  const clearCacheBtn = document.getElementById('clearIfixitCache');
  if (clearCacheBtn) {
    clearCacheBtn.addEventListener('click', async () => {
      try {
        await chrome.storage.local.remove(['ifixitCache', 'lastProductAnalysis']);
        showStatus('✓ Repairability cache cleared', 'success');
        triggerPageScan();
      } catch (error) {
        showStatus('❌ Error: ' + error.message, 'error');
      }
    });
  }
  
  console.log('🔘 [WattWise Popup] Button listeners initialized:', {
    saveSettings: !!document.getElementById('saveSettings'),
    testAPI: !!document.getElementById('testAPI'),
    clearCache: !!clearCacheBtn
  });
}

// Initialize button listeners - handle case where DOM is already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initButtonListeners);
} else {
  initButtonListeners();
}

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

// ============================================
// 🌱 GREEN REWARDS SYSTEM
// ============================================

const TIER_EMOJIS = {
  'SEEDLING': '🌱',
  'SPROUT': '🌿',
  'TREE': '🌳',
  'FOREST': '🌲',
  'GUARDIAN': '🌎'
};

let currentRewardCategory = 'cafe';
let selectedReward = null;

// Initialize rewards on popup load
document.addEventListener('DOMContentLoaded', async () => {
  await initGreenRewards();
});

async function initGreenRewards() {
  try {
    await updatePointsDisplay();
    await updateTierProgress();
    await updateEcoRewardsBalance(); // Load Nessie account balance
    await loadRewardsCatalog(currentRewardCategory);
    setupRewardTabs();
    setupModalHandlers();
  } catch (error) {
    console.error("Error initializing green rewards:", error);
  }
}

// 💰 Fetch and display Eco-Rewards account balance from Nessie API
async function updateEcoRewardsBalance() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_ECO_REWARDS_BALANCE' });
    const accountSection = document.getElementById('ecoRewardsAccount');
    
    if (response?.success && accountSection) {
      accountSection.style.display = 'block';
      
      const balanceEl = document.getElementById('ecoRewardsBalance');
      const nameEl = document.getElementById('ecoAccountName');
      
      if (balanceEl) {
        balanceEl.textContent = `$${response.balance.toFixed(2)}`;
      }
      if (nameEl) {
        nameEl.textContent = response.accountNickname || 'Eco-Rewards Account';
      }
      
      // Also fetch eco-bonus deposit history to show total earned
      const depositsResponse = await chrome.runtime.sendMessage({ type: 'GET_ECO_DEPOSITS_HISTORY' });
      if (depositsResponse?.success) {
        const totalEarnedEl = document.getElementById('ecoTotalEarned');
        if (totalEarnedEl) {
          const totalBonus = depositsResponse.totalEcoBonus || 0;
          totalEarnedEl.textContent = `+$${totalBonus.toFixed(2)} earned from ${depositsResponse.ecoDepositsCount || 0} eco-purchases`;
        }
      }
    } else if (accountSection) {
      // Hide section if not configured
      accountSection.style.display = 'none';
    }
  } catch (error) {
    console.log("Eco-rewards account not configured:", error.message);
    const accountSection = document.getElementById('ecoRewardsAccount');
    if (accountSection) accountSection.style.display = 'none';
  }
}

async function updatePointsDisplay() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_GREEN_POINTS' });
    if (response?.success) {
      const pointsEl = document.getElementById('pointsBalance');
      if (pointsEl) {
        animateNumber(pointsEl, parseInt(pointsEl.textContent) || 0, response.balance, 500);
      }
    }
  } catch (error) {
    console.error("Error updating points display:", error);
  }
}

async function updateTierProgress() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_TIER_PROGRESS' });
    if (response?.success) {
      const tierNameEl = document.getElementById('tierName');
      const tierInfoEl = document.getElementById('tierInfo');
      const tierFillEl = document.getElementById('tierFill');
      
      if (tierNameEl) {
        tierNameEl.textContent = `${TIER_EMOJIS[response.currentTier] || '🌱'} ${response.currentTier}`;
      }
      if (tierInfoEl) {
        tierInfoEl.textContent = response.message;
      }
      if (tierFillEl) {
        tierFillEl.style.width = `${response.progress}%`;
      }
    }
  } catch (error) {
    console.error("Error updating tier progress:", error);
  }
}

async function loadRewardsCatalog(category = 'cafe') {
  try {
    const response = await chrome.runtime.sendMessage({ 
      type: 'GET_REWARDS_CATALOG',
      category: category
    });
    
    if (response?.success) {
      const pointsResponse = await chrome.runtime.sendMessage({ type: 'GET_GREEN_POINTS' });
      const userBalance = pointsResponse?.balance || 0;
      
      const container = document.getElementById('rewardsList');
      if (container) {
        container.innerHTML = response.rewards.map(reward => 
          createRewardCard(reward, userBalance)
        ).join('');
        
        // Attach click handlers
        container.querySelectorAll('.reward-card').forEach(card => {
          card.addEventListener('click', () => {
            const rewardId = card.dataset.rewardId;
            const canAfford = card.dataset.canAfford === 'true';
            if (canAfford) {
              openRedeemModal(rewardId, response.rewards.find(r => r.id === rewardId));
            } else {
              showPointsNeeded(card.dataset.pointsNeeded);
            }
          });
        });
      }
    }
  } catch (error) {
    console.error("Error loading rewards catalog:", error);
  }
}

function createRewardCard(reward, userBalance) {
  const canAfford = userBalance >= reward.pointsCost;
  const pointsNeeded = reward.pointsCost - userBalance;
  
  // Capital One branded colors
  return `
    <div class="reward-card" 
         data-reward-id="${reward.id}" 
         data-can-afford="${canAfford}"
         data-points-needed="${pointsNeeded}"
         style="display: flex; align-items: center; gap: 8px; padding: 8px; background: white; border: 1px solid ${canAfford ? '#004977' : '#e0e8ef'}; border-radius: 6px; cursor: ${canAfford ? 'pointer' : 'not-allowed'}; opacity: ${canAfford ? '1' : '0.7'}; margin-bottom: 6px; transition: all 0.2s;">
      <div style="font-size: 20px; width: 32px; text-align: center;">${reward.icon}</div>
      <div style="flex: 1; min-width: 0;">
        <div style="font-weight: 600; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${reward.name}</div>
        <div style="font-size: 10px; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${reward.description}</div>
      </div>
      <div style="text-align: right;">
        <div style="font-weight: bold; color: ${canAfford ? '#004977' : '#999'}; font-size: 13px;">${reward.pointsCost.toLocaleString()}</div>
        <div style="font-size: 9px; color: #888;">pts</div>
      </div>
      <div style="padding: 4px 8px; background: ${canAfford ? '#004977' : '#ccc'}; color: white; border-radius: 4px; font-size: 10px; font-weight: bold;">
        ${canAfford ? 'GET' : '🔒'}
      </div>
    </div>
  `;
}

function setupRewardTabs() {
  document.querySelectorAll('.reward-tab').forEach(tab => {
    tab.addEventListener('click', async () => {
      // Update active state - Capital One branding colors
      document.querySelectorAll('.reward-tab').forEach(t => {
        t.style.background = '#e8f0f5';
        t.style.color = '#004977';
      });
      tab.style.background = '#004977';
      tab.style.color = 'white';
      
      currentRewardCategory = tab.dataset.category;
      await loadRewardsCatalog(currentRewardCategory);
    });
  });
}

function setupModalHandlers() {
  // Redeem modal
  document.getElementById('modalCancel')?.addEventListener('click', closeRedeemModal);
  document.getElementById('modalConfirm')?.addEventListener('click', confirmRedemption);
  
  // Success modal
  document.getElementById('successClose')?.addEventListener('click', closeSuccessModal);
  
  // Close modals on overlay click
  document.getElementById('redeemModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'redeemModal') closeRedeemModal();
  });
  document.getElementById('successModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'successModal') closeSuccessModal();
  });
}

function openRedeemModal(rewardId, reward) {
  selectedReward = reward;
  
  document.getElementById('modalIcon').textContent = reward.icon;
  document.getElementById('modalRewardName').textContent = reward.name;
  document.getElementById('modalRewardDesc').textContent = reward.description;
  document.getElementById('modalCost').textContent = reward.pointsCost.toLocaleString();
  
  document.getElementById('redeemModal').style.display = 'flex';
}

function closeRedeemModal() {
  document.getElementById('redeemModal').style.display = 'none';
  selectedReward = null;
}

async function confirmRedemption() {
  if (!selectedReward) return;
  
  closeRedeemModal();
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'REDEEM_REWARD',
      rewardId: selectedReward.id
    });
    
    if (response?.success) {
      showSuccessModal(response.result);
      await updatePointsDisplay();
      await updateTierProgress();
      await loadRewardsCatalog(currentRewardCategory);
    } else {
      alert('Redemption failed: ' + (response?.error || 'Unknown error'));
    }
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

function showSuccessModal(result) {
  const contentEl = document.getElementById('successContent');
  
  if (result.type === 'cafe') {
    contentEl.innerHTML = `
      <div style="background: #f5f5f5; border: 2px dashed #4CAF50; border-radius: 8px; padding: 16px; margin: 12px 0;">
        <div style="font-family: monospace; font-size: 16px; font-weight: bold; color: #4CAF50; letter-spacing: 2px;">${result.code}</div>
      </div>
      <div style="text-align: left; font-size: 12px; color: #666;">
        ${result.instructions.map(i => `<p style="margin: 4px 0;">✓ ${i}</p>`).join('')}
      </div>
    `;
  } else if (result.type === 'cashback') {
    contentEl.innerHTML = `
      <div style="font-size: 32px; margin: 12px 0;">💰</div>
      <p style="font-size: 16px; color: #2e7d32; font-weight: bold;">${result.message}</p>
      ${result.transactionId ? `<p style="font-size: 10px; color: #999;">Transaction: ${result.transactionId}</p>` : ''}
    `;
  } else if (result.type === 'charity') {
    contentEl.innerHTML = `
      <div style="border: 2px double #4CAF50; padding: 12px; margin: 12px 0; border-radius: 8px;">
        <p style="font-size: 10px; color: #666; margin: 0;">Certificate of Donation</p>
        <p style="font-size: 14px; font-weight: bold; margin: 8px 0;">${result.charityPartner}</p>
        <p style="font-size: 18px; color: #4CAF50; font-weight: bold; margin: 4px 0;">$${result.donationValue.toFixed(2)}</p>
        <p style="font-size: 11px; color: #555; font-style: italic; margin: 8px 0 0 0;">${result.certificate?.impactMessage || ''}</p>
      </div>
      <p style="font-size: 9px; color: #999;">ID: ${result.donationId}</p>
    `;
  }
  
  document.getElementById('successModal').style.display = 'flex';
}

function closeSuccessModal() {
  document.getElementById('successModal').style.display = 'none';
}

function showPointsNeeded(pointsNeeded) {
  const toast = document.getElementById('pointsToast');
  if (toast) {
    document.getElementById('pointsToastValue').textContent = pointsNeeded;
    toast.textContent = `Need ${parseInt(pointsNeeded).toLocaleString()} more points!`;
    toast.style.background = '#ff9800';
    toast.style.display = 'block';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 2000);
  }
}

function showPointsEarned(points) {
  const toast = document.getElementById('pointsToast');
  if (toast && points > 0) {
    document.getElementById('pointsToastValue').textContent = points;
    toast.innerHTML = `🌱 +${points} Green Points!`;
    toast.style.background = '#4CAF50';
    toast.style.display = 'block';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 3000);
  }
}

function animateNumber(element, start, end, duration) {
  const startTime = performance.now();
  
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.floor(start + (end - start) * eased);
    element.textContent = value.toLocaleString();
    
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }
  
  requestAnimationFrame(update);
}

// Listen for points awarded during product analysis
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.lastProductAnalysis) {
    const analysis = changes.lastProductAnalysis.newValue;
    if (analysis?.pointsAwarded?.totalPoints > 0) {
      showPointsEarned(analysis.pointsAwarded.totalPoints);
      updatePointsDisplay();
      updateTierProgress();
    }
  }
});