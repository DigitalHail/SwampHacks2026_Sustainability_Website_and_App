console.log("🔴 [WattWise Background] Service worker loading...");

// Store API keys in Chrome storage instead of hardcoding
let NESSIE_API_KEY = "99864d500fa931ec644d3a5d865a866c";
// Nessie API uses HTTP, not HTTPS
const NESSIE_BASE_URL = "http://api.nessieisreal.com";

// Climatiq API for sustainability scoring
const CLIMATIQ_BASE_URL = "https://api.climatiq.io/estimate";
// You can get a free API key at https://climatiq.io/
let CLIMATIQ_API_KEY = "40D52DBM4D1BVC4E7M1GTAEKDR";

// Gemini API for AI-powered insights
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
let GEMINI_API_KEY = "";

// iFixit API for repairability scores (optional)
const IFIXIT_BASE_URL = "https://www.ifixit.com/api/2.0";
const IFIXIT_SCORE_CSV_URL = "https://docs.google.com/spreadsheets/d/1R_egXm7iwR0isCt_UxcGtheFEwLj9SNhxC5DWnAqKIc/export?format=csv";
const IFIXIT_SCORE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// ============================================
// 🌱 GREEN POINTS SYSTEM - Capital One Rewards
// ============================================

const POINT_RULES = {
  // Purchase-based points
  PRODUCT_ANALYZED: 10,
  ECO_MERCHANT_PURCHASE: 50,
  SECONDHAND_PURCHASE: 100,
  HIGH_REPAIRABILITY_PURCHASE: 75,  // iFixit score 8+
  GOOD_SUSTAINABILITY_SCORE: 50,    // Sustainability score 70+
  
  // Behavior-based points
  NO_RUSH_SHIPPING: 25,
  REUSABLE_CUP: 25,
  MONTHLY_CARBON_REDUCTION: 200,
  
  // Engagement points
  COMPLETE_ECO_CHALLENGE: 150,
  REFER_FRIEND: 500,
  WEEKLY_CHECK_IN: 50,
  
  // Penalties (negative points for high-impact purchases)
  HIGH_CARBON_PURCHASE: -25,
  FAST_FASHION_PURCHASE: -50
};

const TIER_THRESHOLDS = {
  SEEDLING: 0,
  SPROUT: 1000,
  TREE: 5000,
  FOREST: 10000,
  GUARDIAN: 25000
};

const REWARDS_CATALOG = [
  // Capital One Café Rewards
  { id: 'cafe_drink', name: 'Free Café Drink', pointsCost: 500, icon: '☕', category: 'cafe', description: 'Any drink, any size at Capital One Café' },
  { id: 'cafe_combo', name: 'Drink + Pastry Combo', pointsCost: 1000, icon: '🥐', category: 'cafe', description: 'Any drink plus any pastry' },
  { id: 'cafe_credit', name: '$10 Café Credit', pointsCost: 2000, icon: '🎁', category: 'cafe', description: 'Use on anything at the café' },
  
  // Cash Back Rewards
  { id: 'cashback_5', name: '$5 Cash Back', pointsCost: 5000, icon: '💰', category: 'cashback', cashValue: 5, description: 'Deposited to your account' },
  { id: 'cashback_10', name: '$10 Cash Back', pointsCost: 10000, icon: '💵', category: 'cashback', cashValue: 10, description: 'Deposited to your account' },
  
  // Charity Donations
  { id: 'plant_trees', name: 'Plant 5 Trees', pointsCost: 500, icon: '🌳', category: 'charity', charityPartner: 'One Tree Planted', donationValue: 5, description: 'via One Tree Planted' },
  { id: 'ocean_cleanup', name: 'Ocean Cleanup', pointsCost: 1000, icon: '🐋', category: 'charity', charityPartner: 'Ocean Conservancy', donationValue: 10, description: 'Remove 5 lbs of ocean plastic' },
  { id: 'renewable_fund', name: 'Renewable Energy Fund', pointsCost: 2000, icon: '⚡', category: 'charity', charityPartner: 'Clean Energy Fund', donationValue: 20, description: 'Support solar/wind projects' }
];

// Green Points Storage Manager
const greenPointsStorage = {
  async getBalance() {
    return new Promise(resolve => {
      chrome.storage.local.get(['greenPoints'], res => resolve(res.greenPoints || 0));
    });
  },
  
  async addPoints(points, reason) {
    const current = await this.getBalance();
    const newBalance = Math.max(0, current + points); // Never go below 0
    await chrome.storage.local.set({ greenPoints: newBalance });
    await this._logTransaction(points, reason, points > 0 ? 'earn' : 'penalty');
    console.log(`🌱 ${points > 0 ? '+' : ''}${points} Green Points (${reason}). Balance: ${newBalance}`);
    
    // Check for tier upgrade
    const tierChange = this._checkTierChange(current, newBalance);
    if (tierChange) {
      console.log(`🎉 Tier upgrade: ${tierChange.from} → ${tierChange.to}`);
    }
    
    return { previousBalance: current, pointsAdded: points, newBalance, reason, tierChange };
  },
  
  async deductPoints(points, reason) {
    const current = await this.getBalance();
    if (current < points) {
      throw new Error(`Insufficient points. Have: ${current}, Need: ${points}`);
    }
    const newBalance = current - points;
    await chrome.storage.local.set({ greenPoints: newBalance });
    await this._logTransaction(-points, reason, 'redeem');
    console.log(`🌱 -${points} Green Points (${reason}). Balance: ${newBalance}`);
    return { previousBalance: current, pointsDeducted: points, newBalance, reason };
  },
  
  getTierForPoints(points) {
    if (points >= TIER_THRESHOLDS.GUARDIAN) return 'GUARDIAN';
    if (points >= TIER_THRESHOLDS.FOREST) return 'FOREST';
    if (points >= TIER_THRESHOLDS.TREE) return 'TREE';
    if (points >= TIER_THRESHOLDS.SPROUT) return 'SPROUT';
    return 'SEEDLING';
  },
  
  async getTierProgress() {
    const balance = await this.getBalance();
    const currentTier = this.getTierForPoints(balance);
    const tiers = ['SEEDLING', 'SPROUT', 'TREE', 'FOREST', 'GUARDIAN'];
    const currentIndex = tiers.indexOf(currentTier);
    const nextTier = currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;
    
    if (!nextTier) {
      return {
        currentTier,
        nextTier: null,
        progress: 100,
        pointsToNext: 0,
        currentPoints: balance,
        message: "🎉 Max tier reached!"
      };
    }
    
    const currentThreshold = TIER_THRESHOLDS[currentTier];
    const nextThreshold = TIER_THRESHOLDS[nextTier];
    const pointsInTier = balance - currentThreshold;
    const tierRange = nextThreshold - currentThreshold;
    const progress = Math.round((pointsInTier / tierRange) * 100);
    
    return {
      currentTier,
      nextTier,
      progress,
      pointsToNext: nextThreshold - balance,
      currentPoints: balance,
      message: `${nextThreshold - balance} points to ${nextTier}`
    };
  },
  
  _checkTierChange(oldBalance, newBalance) {
    const oldTier = this.getTierForPoints(oldBalance);
    const newTier = this.getTierForPoints(newBalance);
    if (oldTier !== newTier) {
      return { upgraded: newBalance > oldBalance, from: oldTier, to: newTier };
    }
    return null;
  },
  
  async _logTransaction(points, reason, type) {
    const history = await new Promise(resolve => {
      chrome.storage.local.get(['greenPointsHistory'], res => resolve(res.greenPointsHistory || []));
    });
    history.push({ points, reason, type, timestamp: new Date().toISOString() });
    // Keep last 100 transactions
    await chrome.storage.local.set({ greenPointsHistory: history.slice(-100) });
  },
  
  async getHistory() {
    return new Promise(resolve => {
      chrome.storage.local.get(['greenPointsHistory'], res => resolve(res.greenPointsHistory || []));
    });
  }
};

// Calculate points for a product analysis
function calculateProductPoints(productName, sustainabilityScore, repairability) {
  let points = POINT_RULES.PRODUCT_ANALYZED; // Base points for using WattWise
  const breakdown = [{ reason: 'Product analyzed with WattWise', points: POINT_RULES.PRODUCT_ANALYZED }];
  
  // Good sustainability score bonus
  if (sustainabilityScore >= 70) {
    points += POINT_RULES.GOOD_SUSTAINABILITY_SCORE;
    breakdown.push({ reason: 'Good sustainability score (70+)', points: POINT_RULES.GOOD_SUSTAINABILITY_SCORE });
  }
  
  // High repairability bonus (iFixit score 8+)
  if (repairability && repairability.score >= 8) {
    points += POINT_RULES.HIGH_REPAIRABILITY_PURCHASE;
    breakdown.push({ reason: 'High repairability (iFixit 8+)', points: POINT_RULES.HIGH_REPAIRABILITY_PURCHASE });
  }
  
  // Check for secondhand/refurbished keywords
  const lowerName = productName.toLowerCase();
  if (lowerName.includes('refurbished') || lowerName.includes('renewed') || lowerName.includes('used') || lowerName.includes('pre-owned')) {
    points += POINT_RULES.SECONDHAND_PURCHASE;
    breakdown.push({ reason: 'Secondhand/refurbished product', points: POINT_RULES.SECONDHAND_PURCHASE });
  }
  
  // Fast fashion penalty
  const fastFashionBrands = ['shein', 'fashion nova', 'romwe', 'zaful'];
  if (fastFashionBrands.some(brand => lowerName.includes(brand))) {
    points += POINT_RULES.FAST_FASHION_PURCHASE;
    breakdown.push({ reason: 'Fast fashion brand', points: POINT_RULES.FAST_FASHION_PURCHASE });
  }
  
  return { totalPoints: Math.max(0, points), breakdown };
}

// Redemption service
async function redeemReward(rewardId, accountId) {
  const reward = REWARDS_CATALOG.find(r => r.id === rewardId);
  if (!reward) {
    throw new Error(`Unknown reward: ${rewardId}`);
  }
  
  const balance = await greenPointsStorage.getBalance();
  if (balance < reward.pointsCost) {
    throw new Error(`Insufficient points. Have: ${balance}, Need: ${reward.pointsCost}`);
  }
  
  // Deduct points first
  await greenPointsStorage.deductPoints(reward.pointsCost, `Redeemed: ${reward.name}`);
  
  let result;
  
  // Process based on reward category
  if (reward.category === 'cafe') {
    // Generate QR/redemption code for café
    const code = 'WW' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
    result = {
      type: 'cafe',
      code: code,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      instructions: [
        '1. Visit any Capital One Café',
        '2. Show this code to the barista',
        '3. Enjoy your reward!',
        `Valid for 24 hours`
      ]
    };
  } else if (reward.category === 'cashback') {
    // Deposit to Nessie account
    if (accountId && NESSIE_API_KEY) {
      try {
        const depositUrl = `${NESSIE_BASE_URL}/accounts/${accountId}/deposits?key=${NESSIE_API_KEY}`;
        const response = await fetch(depositUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            medium: 'balance',
            amount: reward.cashValue,
            transaction_date: new Date().toISOString().split('T')[0],
            description: `WattWise Green Rewards: ${reward.name}`
          })
        });
        
        if (response.ok) {
          const depositResult = await response.json();
          result = {
            type: 'cashback',
            amount: reward.cashValue,
            transactionId: depositResult.objectCreated?._id,
            message: `$${reward.cashValue.toFixed(2)} deposited to your account!`
          };
        } else {
          // Refund points if deposit failed
          await greenPointsStorage.addPoints(reward.pointsCost, `Refund: ${reward.name} deposit failed`);
          throw new Error('Deposit to account failed');
        }
      } catch (error) {
        // Refund points if deposit failed
        await greenPointsStorage.addPoints(reward.pointsCost, `Refund: ${reward.name} deposit failed`);
        throw error;
      }
    } else {
      // No account configured - refund and error
      await greenPointsStorage.addPoints(reward.pointsCost, `Refund: No account configured`);
      throw new Error('No Nessie account configured for cash back');
    }
  } else if (reward.category === 'charity') {
    // Generate donation certificate
    const donationId = 'DON' + Date.now().toString(36).toUpperCase();
    result = {
      type: 'charity',
      charityPartner: reward.charityPartner,
      donationValue: reward.donationValue,
      donationId: donationId,
      certificate: {
        title: 'Certificate of Environmental Impact',
        donor: 'WattWise User',
        amount: `$${reward.donationValue.toFixed(2)}`,
        recipient: reward.charityPartner,
        date: new Date().toISOString(),
        impactMessage: getCharityImpactMessage(reward.id)
      }
    };
  }
  
  // Save redemption to history
  await saveRedemptionHistory(reward, result);
  
  return { success: true, reward, result, newBalance: await greenPointsStorage.getBalance() };
}

function getCharityImpactMessage(rewardId) {
  const messages = {
    'plant_trees': '🌳 Your donation will plant 5 trees, absorbing ~0.5 tons of CO2 over their lifetime!',
    'ocean_cleanup': '🌊 Your donation will remove approximately 5 lbs of plastic from the ocean!',
    'renewable_fund': '⚡ Your donation supports clean energy projects that offset ~100 kg of CO2!'
  };
  return messages[rewardId] || 'Thank you for your environmental contribution!';
}

async function saveRedemptionHistory(reward, result) {
  const history = await new Promise(resolve => {
    chrome.storage.local.get(['redemptionHistory'], res => resolve(res.redemptionHistory || []));
  });
  history.push({ reward, result, timestamp: new Date().toISOString() });
  await chrome.storage.local.set({ redemptionHistory: history.slice(-50) });
}

async function getRedemptionHistory() {
  return new Promise(resolve => {
    chrome.storage.local.get(['redemptionHistory'], res => resolve(res.redemptionHistory || []));
  });
}

console.log("🟢 [WattWise Background] Service worker loaded!");
console.log("🔑 [WattWise Background] API Key initialized:", NESSIE_API_KEY.substring(0, 10) + "...");

function requestScan(tabId, url, reason) {
  if (!tabId || !url || !(url.startsWith("http://") || url.startsWith("https://"))) {
    return;
  }
  console.log(`🔄 [WattWise Background] Requesting scan (${reason}):`, url);
  chrome.tabs.sendMessage(tabId, { type: "SCAN_PAGE" }, () => {
    if (chrome.runtime.lastError) {
      console.log("🟡 [WattWise Background] Scan message failed:", chrome.runtime.lastError.message);
    }
  });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") {
    return;
  }
  requestScan(tabId, tab && tab.url, "navigation");
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    requestScan(activeInfo.tabId, tab && tab.url, "activation");
  });
});

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
chrome.storage.local.get(['climatiqKey', 'geminiKey'], (result) => {
  if (result.climatiqKey) {
    CLIMATIQ_API_KEY = result.climatiqKey;
    console.log("🔑 [WattWise Background] Climatiq key loaded from local");
  }
  if (result.geminiKey) {
    GEMINI_API_KEY = result.geminiKey;
    console.log("🔑 [WattWise Background] Gemini key loaded from local");
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
      "geminiKey",
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
    if (data.geminiKey) {
      GEMINI_API_KEY = data.geminiKey;
    }

    try {
      // Get repairability score first so we can use it in sustainability evaluation
      const repairability = await getRepairabilityScore(
        message.name,
        data.enableIfixit,
        data.ifixitCache || {}
      );

      // Evaluate sustainability using Climatiq + Gemini (with fallback to keywords)
      console.log("🌱 [WattWise Background] Evaluating sustainability...");
      const evaluation = await evaluateSustainability(message.name, repairability.data);
      console.log("✅ [WattWise Background] Sustainability evaluation:", evaluation);

      const budgetStatus = await updateMonthlyBudget(
        evaluation.emissions || 0,
        data.carbonBudgetKg,
        data.carbonMonthKey,
        data.carbonEmissionsKg
      );

      // Get Gemini context for sustainability impact
      let geminiContext = null;
      if (GEMINI_API_KEY) {
        geminiContext = await getGeminiSustainabilityContext(
          message.name,
          evaluation,
          repairability.data
        );
      }

      const analysis = {
        name: message.name,
        isUnsustainable: evaluation.isUnsustainable,
        score: evaluation.score,
        emissions: evaluation.emissions || 0,
        reason: evaluation.reason,
        ecoBonus: evaluation.ecoBonus || 0,
        geminiContext: geminiContext,
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

      // 🌱 Award Green Points for product analysis
      try {
        const pointsResult = calculateProductPoints(
          message.name, 
          evaluation.score, 
          repairability.data
        );
        if (pointsResult.totalPoints > 0) {
          const pointsAwarded = await greenPointsStorage.addPoints(
            pointsResult.totalPoints, 
            `Analyzed: ${message.name.substring(0, 30)}${message.name.length > 30 ? '...' : ''}`
          );
          analysis.pointsAwarded = pointsResult;
          analysis.newPointsBalance = pointsAwarded.newBalance;
          analysis.tierChange = pointsAwarded.tierChange;
          console.log(`🌱 Awarded ${pointsResult.totalPoints} Green Points!`);
        }
      } catch (pointsError) {
        console.warn("Points award failed:", pointsError.message);
      }

      // 💰 Deposit Eco-Bonus for sustainable products (using Nessie API)
      if (evaluation.ecoBonus > 0 && !evaluation.isUnsustainable) {
        try {
          const settings = await chrome.storage.local.get(['apiKey', 'savingsAccount']);
          const nessieKey = settings.apiKey || NESSIE_API_KEY;
          const rewardsAccountId = settings.savingsAccount;
          
          if (nessieKey && rewardsAccountId) {
            const depositResult = await depositEcoBonus(
              nessieKey, 
              rewardsAccountId, 
              evaluation.ecoBonus, 
              message.name
            );
            analysis.ecoBonusDeposited = true;
            analysis.ecoBonusAmount = evaluation.ecoBonus;
            analysis.depositTransactionId = depositResult.objectCreated?._id;
            console.log(`💰 Eco-Bonus $${evaluation.ecoBonus.toFixed(2)} deposited to Rewards Account!`);
          } else {
            console.log("⚠️ Eco-Bonus earned but no Nessie account configured");
            analysis.ecoBonusDeposited = false;
            analysis.ecoBonusMessage = "Configure Nessie account to receive eco-bonus deposits";
          }
        } catch (depositError) {
          console.warn("💰 Eco-bonus deposit failed:", depositError.message);
          analysis.ecoBonusDeposited = false;
          analysis.ecoBonusError = depositError.message;
        }
      }

      // Get Green Alternatives asynchronously
      if (GEMINI_API_KEY) {
        getGreenAlternatives(message.name, repairability.cache).then((alternatives) => {
          chrome.storage.local.set({ lastGreenAlternatives: alternatives });
        }).catch((err) => {
          console.warn("Green alternatives failed:", err.message);
          chrome.storage.local.set({ 
            lastGreenAlternatives: { error: "Could not load alternatives" }
          });
        });
      }

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
      
      // Validate API key exists
      if (!key) {
        console.error("❌ No API key found - neither in storage nor in environment");
        sendResponse({ success: false, error: "No API key configured. Please enter your Nessie API key in Settings." });
        return true;
      }
      
      console.log("✓ API key found, testing connection...");
      const data = await testNessieAPI(key);
      console.log("testNessieAPI success:", data);
      sendResponse({ success: true, ...data });
    } catch (error) {
      console.error("testNessieAPI error:", error.message, error);
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

  // ============================================
  // 🌱 GREEN POINTS MESSAGE HANDLERS
  // ============================================
  
  if (message.type === "GET_GREEN_POINTS") {
    console.log("🌱 GET_GREEN_POINTS requested");
    try {
      const balance = await greenPointsStorage.getBalance();
      sendResponse({ success: true, balance: balance });
    } catch (error) {
      console.error("GET_GREEN_POINTS error:", error.message);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
  
  if (message.type === "ADD_GREEN_POINTS") {
    console.log("🌱 ADD_GREEN_POINTS requested:", message.points, message.reason);
    try {
      const result = await greenPointsStorage.addPoints(message.points, message.reason);
      sendResponse({ success: true, ...result });
    } catch (error) {
      console.error("ADD_GREEN_POINTS error:", error.message);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
  
  if (message.type === "GET_TIER_PROGRESS") {
    console.log("🌱 GET_TIER_PROGRESS requested");
    try {
      const progress = await greenPointsStorage.getTierProgress();
      sendResponse({ success: true, ...progress });
    } catch (error) {
      console.error("GET_TIER_PROGRESS error:", error.message);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
  
  if (message.type === "GET_REWARDS_CATALOG") {
    console.log("🌱 GET_REWARDS_CATALOG requested, category:", message.category);
    try {
      const category = message.category;
      const filtered = category && category !== 'all' 
        ? REWARDS_CATALOG.filter(r => r.category === category)
        : REWARDS_CATALOG;
      sendResponse({ success: true, rewards: filtered });
    } catch (error) {
      console.error("GET_REWARDS_CATALOG error:", error.message);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
  
  if (message.type === "REDEEM_REWARD") {
    console.log("🌱 REDEEM_REWARD requested:", message.rewardId);
    try {
      const data = await chrome.storage.local.get(['mainAccount']);
      const result = await redeemReward(message.rewardId, data.mainAccount);
      sendResponse({ success: true, ...result });
    } catch (error) {
      console.error("REDEEM_REWARD error:", error.message);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
  
  if (message.type === "GET_POINTS_HISTORY") {
    console.log("🌱 GET_POINTS_HISTORY requested");
    try {
      const history = await greenPointsStorage.getHistory();
      sendResponse({ success: true, history: history });
    } catch (error) {
      console.error("GET_POINTS_HISTORY error:", error.message);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
  
  if (message.type === "GET_REDEMPTION_HISTORY") {
    console.log("🌱 GET_REDEMPTION_HISTORY requested");
    try {
      const history = await getRedemptionHistory();
      sendResponse({ success: true, history: history });
    } catch (error) {
      console.error("GET_REDEMPTION_HISTORY error:", error.message);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }

  // ============================================
  // 💰 NESSIE ECO-REWARDS ACCOUNT HANDLERS
  // ============================================
  
  if (message.type === "GET_ECO_REWARDS_BALANCE") {
    console.log("💰 GET_ECO_REWARDS_BALANCE requested");
    try {
      const settings = await chrome.storage.local.get(['apiKey', 'savingsAccount']);
      const nessieKey = settings.apiKey || NESSIE_API_KEY;
      const rewardsAccountId = settings.savingsAccount;
      
      if (!nessieKey || !rewardsAccountId) {
        sendResponse({ success: false, error: "Nessie account not configured" });
        return true;
      }
      
      const url = `${NESSIE_BASE_URL}/accounts/${rewardsAccountId}?key=${nessieKey}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch account: ${response.status}`);
      }
      
      const accountData = await response.json();
      sendResponse({ 
        success: true, 
        balance: accountData.balance,
        accountId: rewardsAccountId,
        accountNickname: accountData.nickname || 'Eco-Rewards Account',
        accountType: accountData.type
      });
    } catch (error) {
      console.error("GET_ECO_REWARDS_BALANCE error:", error.message);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
  
  if (message.type === "GET_ECO_DEPOSITS_HISTORY") {
    console.log("💰 GET_ECO_DEPOSITS_HISTORY requested");
    try {
      const settings = await chrome.storage.local.get(['apiKey', 'savingsAccount']);
      const nessieKey = settings.apiKey || NESSIE_API_KEY;
      const rewardsAccountId = settings.savingsAccount;
      
      if (!nessieKey || !rewardsAccountId) {
        sendResponse({ success: false, error: "Nessie account not configured" });
        return true;
      }
      
      const url = `${NESSIE_BASE_URL}/accounts/${rewardsAccountId}/deposits?key=${nessieKey}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch deposits: ${response.status}`);
      }
      
      const deposits = await response.json();
      // Filter for eco-bonus deposits
      const ecoDeposits = deposits.filter(d => 
        d.description && d.description.includes('Eco-Bonus')
      );
      
      sendResponse({ 
        success: true, 
        deposits: ecoDeposits,
        totalDeposits: deposits.length,
        ecoDepositsCount: ecoDeposits.length,
        totalEcoBonus: ecoDeposits.reduce((sum, d) => sum + d.amount, 0)
      });
    } catch (error) {
      console.error("GET_ECO_DEPOSITS_HISTORY error:", error.message);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
});

/**
 * Evaluate product sustainability using Climatiq API + Gemini for intelligent scoring
 * @param {string} productName - Name of the product
 * @param {object} repairability - Optional repairability data from iFixit
 * @returns {Promise<object>} Sustainability score and eco-bonus amount
 */
async function evaluateSustainability(productName, repairability = null) {
  try {
    // If no Climatiq key, fall back to keyword matching
    if (!CLIMATIQ_API_KEY) {
      console.log("⚠️ No Climatiq API key - using fallback keyword matching");
      const isSustainable = !productName.toLowerCase().includes("plastic") && 
                            !productName.toLowerCase().includes("disposable");
      const emissions = isSustainable ? 2 : 8;
      return {
        isUnsustainable: !isSustainable,
        score: isSustainable ? 75 : 25,
        emissions: emissions,
        reason: isSustainable ? "Sustainable product choice" : "Contains plastic or disposable materials",
        ecoBonus: isSustainable ? 0.50 : 0 // Reward sustainable purchases
      };
    }

    console.log("🌍 Evaluating sustainability via Climatiq for:", productName);
    
    try {
      // Call Climatiq API to evaluate product
      // Using a simple electronics/goods estimate
      const response = await fetch(CLIMATIQ_BASE_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CLIMATIQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          emission_factor: {
            activity_id: "consumer_goods-type_electronics",
            source: "IPCC",
            region: "US",
            data_version: "30.30"
          },
          parameters: {
            weight_kg: 0.5
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.warn("🌍 Climatiq API error:", response.status, errorData);
        throw new Error(`Climatiq API returned ${response.status}`);
      }

      const data = await response.json();
      console.log("🌍 Climatiq response:", data);

      const emissions = data.co2e || 2; // Default to 2 if not available
    } catch (climatiqError) {
      console.warn("🌍 Climatiq API failed, using keyword-based estimate:", climatiqError.message);
      // Fallback to keyword-based estimation
      const isKeywordUnsustainable = productName.toLowerCase().includes("plastic") || 
                                     productName.toLowerCase().includes("disposable") ||
                                     productName.toLowerCase().includes("single-use");
      const emissions = isKeywordUnsustainable ? 5 : 1.5;
      
      // Calculate score based on keywords
      let score = 100 - (emissions * 15);
      score = Math.max(0, Math.min(100, score));
      
      // Eco-bonus for sustainable products (score >= 50)
      const ecoBonus = score >= 50 ? calculateEcoBonus(score) : 0;
      return {
        isUnsustainable: score < 50,
        score: Math.round(score),
        emissions: emissions,
        reason: "Estimate based on product category",
        ecoBonus: Math.round(ecoBonus * 100) / 100
      };
    }
    
    // If we get here, we have emissions from Climatiq
    const emissions = data.co2e || 1.5;
    
    // Use Gemini to calculate intelligent sustainability score
    if (GEMINI_API_KEY && repairability && repairability.score !== null) {
      console.log("🤖 Using Gemini to calculate intelligent sustainability score...");
      const score = await calculateGeminiSustainabilityScore(productName, emissions, repairability);
      
      if (score !== null) {
        const ecoBonus = score >= 50 ? calculateEcoBonus(score) : 0;
        return {
          isUnsustainable: score < 50,
          score: Math.round(score),
          emissions: emissions,
          reason: score < 50 ? `Sustainability score: ${Math.round(score)}/100 (considering carbon footprint and repairability)` : `Sustainability score: ${Math.round(score)}/100 (good environmental choice)`,
          ecoBonus: Math.round(ecoBonus * 100) / 100,
          usedGemini: true
        };
      }
    }

    // Fallback: Score based on carbon emissions alone
    console.log("📊 Falling back to emissions-based scoring");
    let score = 100 - (emissions * 10); // Simple scoring
    score = Math.max(0, Math.min(100, score)); // Clamp 0-100

    // Eco-bonus reward for sustainable products
    const ecoBonus = score >= 50 ? calculateEcoBonus(score) : 0;

    return {
      isUnsustainable: score < 50,
      score: Math.round(score),
      emissions: emissions,
      reason: score < 50 ? `High carbon footprint: ${emissions.toFixed(2)}kg CO2e` : `Low carbon footprint: ${emissions.toFixed(2)}kg CO2e`,
      ecoBonus: Math.round(ecoBonus * 100) / 100 // Round to cents
    };
  } catch (error) {
    console.error("🔴 Climatiq evaluation error:", error.message);
    // Fallback to keyword matching on error
    const isSustainable = !productName.toLowerCase().includes("plastic") && 
                          !productName.toLowerCase().includes("disposable");
    const emissions = isSustainable ? 2 : 8;
    return {
      isUnsustainable: !isSustainable,
      score: isSustainable ? 75 : 25,
      emissions: emissions,
      reason: "Using fallback sustainability assessment",
      ecoBonus: isSustainable ? 0.50 : 0
    };
  }
}

/**
 * Calculate eco-bonus reward based on sustainability score
 * Higher scores = higher rewards (incentivize sustainable shopping)
 * @param {number} score - Sustainability score (0-100)
 * @returns {number} Bonus amount in dollars
 */
function calculateEcoBonus(score) {
  // Tiered bonus system:
  // Score 90-100: $1.00 bonus (excellent choice)
  // Score 75-89: $0.75 bonus (great choice)
  // Score 60-74: $0.50 bonus (good choice)
  // Score 50-59: $0.25 bonus (decent choice)
  // Score <50: $0.00 (no bonus for unsustainable)
  if (score >= 90) return 1.00;
  if (score >= 75) return 0.75;
  if (score >= 60) return 0.50;
  if (score >= 50) return 0.25;
  return 0;
}

/**
 * Use Gemini to calculate an intelligent sustainability score
 * Combines emissions data with repairability score
 */
async function calculateGeminiSustainabilityScore(productName, emissions, repairability) {
  if (!GEMINI_API_KEY) {
    return null;
  }

  try {
    const repairScore = repairability.score || 0;
    const repairContext = repairability.score 
      ? `This product has a repairability score of ${repairability.score}/10 from iFixit, meaning ${repairability.score >= 7 ? 'it is very easy to repair and maintain' : repairability.score >= 4 ? 'it is moderately repairable' : 'it is difficult to repair'}.`
      : "No repairability data available for this product.";

    const prompt = `You are a sustainability expert. Calculate a sustainability score (0-100) for this product based on both its carbon footprint AND repairability.

Product: ${productName}
Carbon Footprint: ${emissions} kg CO2e
${repairContext}

Consider:
- Lower carbon footprint = higher score (up to 60% weight)
- Higher repairability = higher score (up to 40% weight)
- Repairable products last longer, reducing overall lifecycle emissions

Return ONLY a JSON object with this exact format:
{"score": <number 0-100>, "reasoning": "<brief explanation>"}`;

    console.log("🤖 Calling Gemini for sustainability score calculation...");
    const requestUrl = `${GEMINI_BASE_URL}?key=${GEMINI_API_KEY}`;
    
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          maxOutputTokens: 100,
          temperature: 0.5
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn("🤖 Gemini score calculation error:", response.status);
      return null;
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      console.warn("🤖 No response from Gemini");
      return null;
    }

    // Parse JSON response
    let cleanedText = text.trim();
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText.slice(7);
    } else if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.slice(3);
    }
    if (cleanedText.endsWith("```")) {
      cleanedText = cleanedText.slice(0, -3);
    }
    cleanedText = cleanedText.trim();

    try {
      const result = JSON.parse(cleanedText);
      const score = Math.max(0, Math.min(100, Number(result.score) || 50));
      console.log("🤖 Gemini calculated score:", score, "Reasoning:", result.reasoning);
      return score;
    } catch (parseError) {
      console.warn("🤖 Could not parse Gemini score response:", cleanedText);
      return null;
    }
  } catch (error) {
    console.warn("🤖 Gemini score calculation failed:", error.message);
    return null;
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
  // Use a hash-like key that preserves model/version info
  // This prevents iPhone 13 from colliding with iPhone 14
  const cleaned = productName
    .toLowerCase()
    .replace(/\b(renewed|amazon|certified)\b/g, "")  // Remove less important words
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  
  // Use a simple hash for consistency
  let hash = 0;
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Return both the cleaned name and hash to reduce collisions
  return Math.abs(hash).toString(36) + "_" + cleaned.substring(0, 20);
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
    
    // Build iFixit Device page URL with underscores replacing spaces
    // Example: "iPhone 15 Pro Max" → "https://www.ifixit.com/Device/iPhone_15_Pro_Max"
    const deviceSlug = device.trim().replace(/\s+/g, "_");
    const deviceUrl = `https://www.ifixit.com/Device/${deviceSlug}`;
    
    acc.push({
      device: device,
      normalized: normalized,
      score: Number(score),
      oem: oemIndex >= 0 ? cols[oemIndex] : null,
      year: dateIndex >= 0 ? cols[dateIndex] : null,
      url: deviceUrl
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
    console.warn("🛠️ No match found - normalized product:", normalizedProduct, "entries available:", entries.length);
    return null;
  }

  // Minimum length requirement to avoid single-character matches
  const MIN_MATCH_LENGTH = 3;
  
  // Try exact match first
  let exactMatch = null;
  let partialMatches = [];
  
  entries.forEach((entry) => {
    if (!entry.normalized || entry.normalized.length < MIN_MATCH_LENGTH) {
      return;
    }
    
    // Exact match: normalized product equals normalized entry
    if (normalizedProduct === entry.normalized) {
      exactMatch = entry;
      return;
    }
    
    // Partial match: one contains the other (but require min 3 chars)
    const isPartialMatch =
      (normalizedProduct.includes(entry.normalized) && entry.normalized.length >= MIN_MATCH_LENGTH) ||
      (entry.normalized.includes(normalizedProduct) && normalizedProduct.length >= MIN_MATCH_LENGTH);
    
    if (isPartialMatch) {
      // Prefer longer matches (more specific)
      partialMatches.push(entry);
    }
  });

  // Return best match in priority order
  if (exactMatch) {
    console.log("🛠️ Found exact match:", exactMatch.device);
    return exactMatch;
  }
  
  if (partialMatches.length > 0) {
    // Sort by normalized length (most specific first)
    partialMatches.sort((a, b) => b.normalized.length - a.normalized.length);
    console.log("🛠️ Found partial match:", partialMatches[0].device, "normalized:", partialMatches[0].normalized);
    return partialMatches[0];
  }

  console.warn("🛠️ No repairability match found for:", productName, "(normalized:", normalizedProduct + ")");
  return null;
}

async function getRepairabilityScore(productName, enableIfixit, cache) {
  if (!enableIfixit) {
    return { data: null, cache: cache };
  }

  const cacheKey = normalizeCacheKey(productName);
  const cached = cache[cacheKey];
  
  // Check if we have valid cached data
  if (cached && cached.cachedAt && cached.source === "iFixit Repairability Scores") {
    const cachedAt = new Date(cached.cachedAt);
    const ageMinutes = (Date.now() - cachedAt.getTime()) / (1000 * 60);
    
    // Keep cache for 24 hours (1440 minutes)
    if (ageMinutes < 1440) {
      console.log("🛠️ Using cached repairability data for:", productName, "- Score:", cached.score);
      return { data: cached, cache: cache };
    } else {
      console.log("🛠️ Cache expired for:", productName, "- Refreshing...");
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
    // Validate key
    if (!key || typeof key !== 'string' || key.length < 10) {
      throw new Error('Invalid API key format - must be at least 10 characters');
    }
    
    const safeKey = key.substring(0, 10) + "...";
    console.log("🧪 Testing API with key:", safeKey);
    console.log("🧪 Base URL:", NESSIE_BASE_URL);
    
    if (!NESSIE_BASE_URL) {
      throw new Error('NESSIE_BASE_URL not configured');
    }
    
    // Build URL carefully
    const accountsUrl = NESSIE_BASE_URL + "/accounts?key=" + encodeURIComponent(key);
    console.log("🧪 Full URL:", accountsUrl.substring(0, 50) + "...");
    
    const response = await fetch(accountsUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    console.log("🧪 Response status:", response.status);
    console.log("🧪 Response ok:", response.ok);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`API returned ${response.status}: ${errorData.message || response.statusText}`);
    }
    
    const accounts = await response.json();
    console.log("🧪 Nessie API returned accounts:", accounts.length || 0, 'accounts');

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
    console.error("🔴 API Test Error:", error.message);
    console.error("🔴 Error stack:", error.stack);
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
 * Deposits eco-bonus reward money into the user's savings account
 * This is the "Eco-Bonus Reward" functionality - rewards for sustainable choices
 * Uses Nessie API's account deposit endpoint
 * @param {string} key - Nessie API key
 * @param {string} accountId - Savings/Rewards account ID to deposit into
 * @param {number} amount - Bonus amount to deposit
 * @param {string} productName - Product that earned the bonus (for description)
 * @returns {Promise} Deposit result
 */
async function depositEcoBonus(key, accountId, amount, productName = "Sustainable Purchase") {
  const url = `${NESSIE_BASE_URL}/accounts/${accountId}/deposits?key=${key}`;
  
  const payload = {
    medium: "balance",
    amount: amount,
    transaction_date: new Date().toISOString().split('T')[0],
    description: `🌱 Eco-Bonus: ${productName.substring(0, 30)}`
  };
  
  console.log("💚 Depositing eco-bonus reward:", payload);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(`Eco-bonus deposit failed: ${error.message}`);
  }

  const result = await response.json();
  console.log(`✅ Successfully deposited $${amount.toFixed(2)} eco-bonus to Rewards account!`);
  return result;
}

/**
 * Legacy transfer function (still available for other uses)
 * @param {string} key - Nessie API key
 * @param {string} fromId - Source account ID
 * @param {string} toId - Destination account ID
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
    description: "WattWise Account Transfer"
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
  console.log(`✓ Successfully transferred $${amount} between accounts!`);
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

/**
 * Get Gemini AI context for sustainability impact
 * Contextualizes Climatiq emissions data and iFixit repairability score
 */
async function getGeminiSustainabilityContext(productName, evaluation, repairability) {
  if (!GEMINI_API_KEY) {
    console.log("🤖 No Gemini API key configured");
    return null;
  }

  try {
    console.log("🤖 Calling Gemini for sustainability context...");
    
    const emissionsInfo = evaluation.emissions 
      ? `Estimated carbon footprint: ${evaluation.emissions} kg CO2e.` 
      : "Carbon footprint data unavailable.";
    
    const repairInfo = repairability && repairability.score !== null
      ? `iFixit repairability score: ${repairability.score}/10 (${repairability.summary || 'No details'})`
      : "No repairability score available for this product.";

    const prompt = `You are a sustainability expert. Briefly analyze this product's environmental impact in 2-3 sentences.

Product: ${productName}
Sustainability Score: ${evaluation.score}/100
${emissionsInfo}
${repairInfo}

Provide actionable context about what this means for the environment and the consumer. Be concise and helpful.`;

    const requestUrl = `${GEMINI_BASE_URL}?key=${GEMINI_API_KEY}`;
    console.log("🤖 Gemini URL:", GEMINI_BASE_URL);
    
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          maxOutputTokens: 150,
          temperature: 0.7
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("🤖 Gemini API error:", response.status, errorText);
      
      // More graceful error handling
      if (response.status === 429) {
        console.warn("🤖 Gemini quota exceeded - will retry with fallback");
        return "Unable to generate AI context at this time (API quota exceeded). Please check your Gemini API plan.";
      }
      return null;
    }

    const data = await response.json();
    console.log("🤖 Gemini response:", data);
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || null;
  } catch (error) {
    console.error("🤖 Gemini context error:", error.message);
    return null;
  }
}

/**
 * Get green alternatives for a product using Gemini AI
 * Suggests refurbished, used, or sustainably produced alternatives
 */
async function getGreenAlternatives(productName, ifixitCache) {
  if (!GEMINI_API_KEY) {
    console.log("🌱 No Gemini API key for alternatives");
    return { error: "Gemini API key not configured" };
  }

  try {
    console.log("🌱 Getting green alternatives for:", productName);
    
    // Get the iFixit score table for reference
    let repairableDevices = [];
    try {
      const table = await getRepairabilityScoreTable(ifixitCache || {});
      // Get top 10 most repairable devices
      repairableDevices = table.entries
        .filter(e => e.score >= 7)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map(e => `${e.device} (Score: ${e.score}/10)`);
    } catch (e) {
      console.warn("Could not load iFixit data for alternatives:", e.message);
    }

    const ifixitContext = repairableDevices.length > 0
      ? `Here are some highly repairable devices from iFixit's database: ${repairableDevices.join(", ")}.`
      : "";

    const prompt = `You are an eco-conscious shopping assistant. Suggest 3-4 greener alternatives to this product.

Product being viewed: ${productName}

${ifixitContext}

For each alternative, provide:
1. A specific product name
2. Type: "refurbished", "used", "sustainable", or "repairable"
3. A brief reason why it's more eco-friendly (1 sentence)

Focus on:
- Refurbished or certified renewed versions of the same/similar product
- Used options that extend product lifecycle
- More repairable alternatives (if applicable, reference iFixit scores)
- Products from brands known for sustainability

Return JSON array format:
[{"name": "Product Name", "type": "refurbished|used|sustainable|repairable", "reason": "Why it's greener", "repairabilityScore": null or number}]`;

    console.log("🌱 Calling Gemini for alternatives...");
    const requestUrl = `${GEMINI_BASE_URL}?key=${GEMINI_API_KEY}`;
    
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.7
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("🌱 Gemini alternatives API error:", response.status, errText);
      
      if (response.status === 429) {
        console.warn("🌱 Gemini quota exceeded for alternatives");
        return { 
          error: "API quota exceeded",
          alternatives: [{
            name: "Check your Gemini API plan",
            type: "sustainable",
            reason: "The alternative suggestions feature temporarily unavailable due to API quota limits."
          }]
        };
      }
      
      return { error: "Could not generate alternatives" };
    }

    const data = await response.json();
    console.log("🌱 Gemini alternatives response:", data);
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      return { error: "No alternatives found" };
    }

    // Parse JSON from response (handle markdown code blocks)
    let cleanedText = text.trim();
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText.slice(7);
    } else if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.slice(3);
    }
    if (cleanedText.endsWith("```")) {
      cleanedText = cleanedText.slice(0, -3);
    }
    cleanedText = cleanedText.trim();

    try {
      const alternatives = JSON.parse(cleanedText);
      
      // Add search URLs for each alternative
      alternatives.forEach(alt => {
        const searchQuery = encodeURIComponent(alt.name + " " + (alt.type || ""));
        alt.searchUrl = `https://www.google.com/search?q=${searchQuery}`;
      });

      console.log("🌱 Parsed alternatives:", alternatives);
      return { alternatives: alternatives };
    } catch (parseError) {
      console.warn("Could not parse Gemini alternatives JSON:", parseError.message, cleanedText);
      // Return as raw text fallback
      return { 
        alternatives: [{
          name: "See AI suggestions",
          type: "sustainable",
          reason: text.substring(0, 200)
        }]
      };
    }
  } catch (error) {
    console.error("Green alternatives error:", error.message);
    return { error: error.message };
  }
}