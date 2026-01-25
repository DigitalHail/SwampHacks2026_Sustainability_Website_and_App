# 🏦 Capital One Green Rewards - Implementation Framework

## Overview

This document provides a technical implementation framework for the Capital One Café rewards integration with WattWise. Since we're using the Nessie sandbox API, some features will be simulated, while others can be fully functional.

---

## 📁 File Structure

```
extension/
├── services/
│   ├── nessie/
│   │   ├── index.js              # Main Nessie client
│   │   ├── accounts.js           # Account operations
│   │   ├── purchases.js          # Purchase tracking
│   │   ├── deposits.js           # Deposit operations (for cashback)
│   │   ├── branches.js           # Branch/Café finder
│   │   └── rewards.js            # Rewards point management
│   └── greenRewards/
│       ├── pointsEngine.js       # Points calculation logic
│       ├── redemption.js         # Reward redemption handler
│       ├── tiers.js              # User tier management
│       └── challenges.js         # Eco-challenges system
├── components/
│   ├── RewardsStore.js           # Rewards store UI
│   ├── CafeFinder.js             # Café locator
│   ├── TierProgress.js           # Tier status display
│   └── RedemptionModal.js        # Redemption flow
├── data/
│   ├── rewards-catalog.json      # Available rewards
│   ├── point-rules.json          # Earning rules
│   └── cafe-locations.json       # Café data (fallback)
└── background.js                 # Service worker (enhanced)
```

---

## 🔧 Core Services Implementation

### 1. Points Engine (`services/greenRewards/pointsEngine.js`)

```javascript
/**
 * Green Points Engine
 * Calculates and manages eco-points based on user behavior
 */

const POINT_RULES = {
  // Purchase-based points
  ECO_MERCHANT_PURCHASE: 50,
  SECONDHAND_PURCHASE: 100,
  HIGH_REPAIRABILITY_PURCHASE: 75,  // iFixit score 8+
  REFURBISHED_PURCHASE: 100,
  
  // Behavior-based points
  NO_RUSH_SHIPPING: 25,
  REUSABLE_CUP: 25,
  MONTHLY_CARBON_REDUCTION: 200,
  
  // Engagement points
  COMPLETE_ECO_CHALLENGE: 150,
  REFER_FRIEND: 500,
  WEEKLY_CHECK_IN: 50,
  
  // Penalty (negative points for high-impact purchases)
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

class GreenPointsEngine {
  constructor(storageKey = 'greenPoints') {
    this.storageKey = storageKey;
  }

  /**
   * Get current points balance from storage
   */
  async getBalance() {
    return new Promise((resolve) => {
      chrome.storage.local.get([this.storageKey], (result) => {
        resolve(result[this.storageKey] || 0);
      });
    });
  }

  /**
   * Add points to balance
   */
  async addPoints(points, reason) {
    const current = await this.getBalance();
    const newBalance = current + points;
    
    await this._saveBalance(newBalance);
    await this._logTransaction(points, reason, 'earn');
    
    // Check for tier upgrade
    const tierChange = this._checkTierChange(current, newBalance);
    
    return {
      previousBalance: current,
      pointsAdded: points,
      newBalance: newBalance,
      reason: reason,
      tierChange: tierChange
    };
  }

  /**
   * Deduct points (for redemption)
   */
  async deductPoints(points, reason) {
    const current = await this.getBalance();
    
    if (current < points) {
      throw new Error(`Insufficient points. Have: ${current}, Need: ${points}`);
    }
    
    const newBalance = current - points;
    await this._saveBalance(newBalance);
    await this._logTransaction(-points, reason, 'redeem');
    
    return {
      previousBalance: current,
      pointsDeducted: points,
      newBalance: newBalance,
      reason: reason
    };
  }

  /**
   * Calculate points for a purchase
   */
  calculatePurchasePoints(purchase, sustainabilityData) {
    let points = 0;
    const breakdown = [];

    // Base points for any tracked purchase
    points += 10;
    breakdown.push({ reason: 'Purchase tracked', points: 10 });

    // Eco-merchant bonus
    if (sustainabilityData.isEcoMerchant) {
      points += POINT_RULES.ECO_MERCHANT_PURCHASE;
      breakdown.push({ reason: 'Eco-friendly merchant', points: POINT_RULES.ECO_MERCHANT_PURCHASE });
    }

    // Secondhand/refurbished bonus
    if (sustainabilityData.isSecondhand) {
      points += POINT_RULES.SECONDHAND_PURCHASE;
      breakdown.push({ reason: 'Secondhand purchase', points: POINT_RULES.SECONDHAND_PURCHASE });
    }

    // High repairability bonus (iFixit score 8+)
    if (sustainabilityData.repairabilityScore >= 8) {
      points += POINT_RULES.HIGH_REPAIRABILITY_PURCHASE;
      breakdown.push({ reason: 'High repairability (8+)', points: POINT_RULES.HIGH_REPAIRABILITY_PURCHASE });
    }

    // Carbon penalty for high-impact purchases
    if (sustainabilityData.carbonKg > 20) {
      points += POINT_RULES.HIGH_CARBON_PURCHASE;
      breakdown.push({ reason: 'High carbon impact', points: POINT_RULES.HIGH_CARBON_PURCHASE });
    }

    // Fast fashion penalty
    if (sustainabilityData.category === 'fast_fashion') {
      points += POINT_RULES.FAST_FASHION_PURCHASE;
      breakdown.push({ reason: 'Fast fashion purchase', points: POINT_RULES.FAST_FASHION_PURCHASE });
    }

    return {
      totalPoints: Math.max(0, points), // Never go negative from single purchase
      breakdown: breakdown
    };
  }

  /**
   * Get user's current tier
   */
  async getCurrentTier() {
    const balance = await this.getBalance();
    return this._getTierForPoints(balance);
  }

  /**
   * Get progress to next tier
   */
  async getTierProgress() {
    const balance = await this.getBalance();
    const currentTier = this._getTierForPoints(balance);
    const nextTier = this._getNextTier(currentTier);
    
    if (!nextTier) {
      return {
        currentTier: currentTier,
        nextTier: null,
        progress: 100,
        pointsToNext: 0,
        message: "🎉 You've reached the highest tier!"
      };
    }

    const currentThreshold = TIER_THRESHOLDS[currentTier];
    const nextThreshold = TIER_THRESHOLDS[nextTier];
    const pointsInTier = balance - currentThreshold;
    const tierRange = nextThreshold - currentThreshold;
    const progress = Math.round((pointsInTier / tierRange) * 100);

    return {
      currentTier: currentTier,
      nextTier: nextTier,
      progress: progress,
      pointsToNext: nextThreshold - balance,
      currentPoints: balance,
      message: `${nextThreshold - balance} points to ${nextTier}`
    };
  }

  // Private methods
  async _saveBalance(balance) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [this.storageKey]: balance }, resolve);
    });
  }

  async _logTransaction(points, reason, type) {
    const historyKey = 'greenPointsHistory';
    const history = await new Promise((resolve) => {
      chrome.storage.local.get([historyKey], (result) => {
        resolve(result[historyKey] || []);
      });
    });

    history.push({
      points: points,
      reason: reason,
      type: type,
      timestamp: new Date().toISOString()
    });

    // Keep last 100 transactions
    const trimmedHistory = history.slice(-100);
    
    return new Promise((resolve) => {
      chrome.storage.local.set({ [historyKey]: trimmedHistory }, resolve);
    });
  }

  _getTierForPoints(points) {
    if (points >= TIER_THRESHOLDS.GUARDIAN) return 'GUARDIAN';
    if (points >= TIER_THRESHOLDS.FOREST) return 'FOREST';
    if (points >= TIER_THRESHOLDS.TREE) return 'TREE';
    if (points >= TIER_THRESHOLDS.SPROUT) return 'SPROUT';
    return 'SEEDLING';
  }

  _getNextTier(currentTier) {
    const tiers = ['SEEDLING', 'SPROUT', 'TREE', 'FOREST', 'GUARDIAN'];
    const currentIndex = tiers.indexOf(currentTier);
    return currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;
  }

  _checkTierChange(oldBalance, newBalance) {
    const oldTier = this._getTierForPoints(oldBalance);
    const newTier = this._getTierForPoints(newBalance);
    
    if (oldTier !== newTier) {
      return {
        upgraded: true,
        from: oldTier,
        to: newTier,
        message: `🎉 Congratulations! You've reached ${newTier} tier!`
      };
    }
    return null;
  }
}

// Export singleton instance
const greenPointsEngine = new GreenPointsEngine();
export default greenPointsEngine;
```

---

### 2. Rewards Redemption (`services/greenRewards/redemption.js`)

```javascript
/**
 * Rewards Redemption Service
 * Handles converting Green Points to Capital One rewards
 */

import greenPointsEngine from './pointsEngine.js';

const REWARDS_CATALOG = {
  // Capital One Café Rewards
  CAFE_DRINK: {
    id: 'cafe_drink',
    name: 'Free Drink at Capital One Café',
    description: 'Any drink, any size',
    pointsCost: 500,
    category: 'cafe',
    icon: '☕',
    redemptionType: 'qr_code'
  },
  CAFE_COMBO: {
    id: 'cafe_combo',
    name: 'Drink + Pastry Combo',
    description: 'Any drink plus any pastry',
    pointsCost: 1000,
    category: 'cafe',
    icon: '🥐',
    redemptionType: 'qr_code'
  },
  CAFE_CREDIT: {
    id: 'cafe_credit',
    name: '$10 Café Credit',
    description: 'Use on anything at the café',
    pointsCost: 2000,
    category: 'cafe',
    icon: '🎁',
    redemptionType: 'qr_code'
  },
  
  // Cash Back Rewards
  CASHBACK_5: {
    id: 'cashback_5',
    name: '$5 Cash Back',
    description: 'Deposited directly to your account',
    pointsCost: 5000,
    category: 'cashback',
    icon: '💰',
    redemptionType: 'nessie_deposit',
    cashValue: 5.00
  },
  CASHBACK_10: {
    id: 'cashback_10',
    name: '$10 Cash Back',
    description: 'Deposited directly to your account',
    pointsCost: 10000,
    category: 'cashback',
    icon: '💵',
    redemptionType: 'nessie_deposit',
    cashValue: 10.00
  },
  
  // Charity Donations
  PLANT_TREES: {
    id: 'plant_trees',
    name: 'Plant 5 Trees',
    description: 'via One Tree Planted',
    pointsCost: 500,
    category: 'charity',
    icon: '🌳',
    redemptionType: 'charity',
    charityPartner: 'One Tree Planted',
    donationValue: 5.00
  },
  OCEAN_CLEANUP: {
    id: 'ocean_cleanup',
    name: 'Ocean Cleanup Donation',
    description: 'Remove 5 lbs of ocean plastic',
    pointsCost: 1000,
    category: 'charity',
    icon: '🐋',
    redemptionType: 'charity',
    charityPartner: 'Ocean Conservancy',
    donationValue: 10.00
  },
  RENEWABLE_FUND: {
    id: 'renewable_fund',
    name: 'Renewable Energy Fund',
    description: 'Support solar/wind projects',
    pointsCost: 2000,
    category: 'charity',
    icon: '⚡',
    redemptionType: 'charity',
    charityPartner: 'Renewable Energy Fund',
    donationValue: 20.00
  }
};

class RedemptionService {
  constructor(nessieApiKey, nessieBaseUrl) {
    this.apiKey = nessieApiKey;
    this.baseUrl = nessieBaseUrl;
  }

  /**
   * Get all available rewards
   */
  getAvailableRewards() {
    return Object.values(REWARDS_CATALOG);
  }

  /**
   * Get rewards user can afford
   */
  async getAffordableRewards() {
    const balance = await greenPointsEngine.getBalance();
    return Object.values(REWARDS_CATALOG).filter(r => r.pointsCost <= balance);
  }

  /**
   * Redeem a reward
   */
  async redeemReward(rewardId, accountId) {
    const reward = REWARDS_CATALOG[rewardId.toUpperCase()];
    
    if (!reward) {
      throw new Error(`Unknown reward: ${rewardId}`);
    }

    // Check if user has enough points
    const balance = await greenPointsEngine.getBalance();
    if (balance < reward.pointsCost) {
      throw new Error(`Insufficient points. Have: ${balance}, Need: ${reward.pointsCost}`);
    }

    // Process based on redemption type
    let result;
    switch (reward.redemptionType) {
      case 'qr_code':
        result = await this._processCafeRedemption(reward);
        break;
      case 'nessie_deposit':
        result = await this._processNessieDeposit(reward, accountId);
        break;
      case 'charity':
        result = await this._processCharityDonation(reward);
        break;
      default:
        throw new Error(`Unknown redemption type: ${reward.redemptionType}`);
    }

    // Deduct points
    await greenPointsEngine.deductPoints(reward.pointsCost, `Redeemed: ${reward.name}`);

    // Save redemption history
    await this._saveRedemptionHistory(reward, result);

    return {
      success: true,
      reward: reward,
      result: result,
      newBalance: await greenPointsEngine.getBalance()
    };
  }

  /**
   * Generate QR code for café redemption
   */
  async _processCafeRedemption(reward) {
    // Generate unique redemption code
    const code = this._generateRedemptionCode();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    return {
      type: 'cafe',
      code: code,
      qrData: `WATTWIRE:CAFE:${reward.id}:${code}`,
      expiresAt: expiresAt.toISOString(),
      instructions: [
        '1. Visit any Capital One Café',
        '2. Show this QR code to the barista',
        '3. Enjoy your reward!',
        `Valid until: ${expiresAt.toLocaleDateString()}`
      ]
    };
  }

  /**
   * Deposit cash back to Nessie account
   */
  async _processNessieDeposit(reward, accountId) {
    if (!accountId) {
      throw new Error('Account ID required for cash back redemption');
    }

    const url = `${this.baseUrl}/accounts/${accountId}/deposits?key=${this.apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        medium: 'balance',
        amount: reward.cashValue,
        transaction_date: new Date().toISOString().split('T')[0],
        description: `WattWise Green Rewards: ${reward.name}`
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Deposit failed: ${error.message}`);
    }

    const result = await response.json();

    return {
      type: 'cashback',
      amount: reward.cashValue,
      transactionId: result.objectCreated?._id,
      message: `$${reward.cashValue.toFixed(2)} deposited to your account!`
    };
  }

  /**
   * Process charity donation (simulated)
   */
  async _processCharityDonation(reward) {
    // In production, this would integrate with actual charity APIs
    const donationId = this._generateRedemptionCode();

    return {
      type: 'charity',
      charityPartner: reward.charityPartner,
      donationValue: reward.donationValue,
      donationId: donationId,
      certificate: {
        title: 'Certificate of Donation',
        donor: 'WattWise User',
        amount: `$${reward.donationValue.toFixed(2)}`,
        recipient: reward.charityPartner,
        date: new Date().toISOString(),
        message: `Thank you for supporting ${reward.charityPartner}!`
      },
      impactMessage: this._getImpactMessage(reward)
    };
  }

  _generateRedemptionCode() {
    return 'WW' + Date.now().toString(36).toUpperCase() + 
           Math.random().toString(36).substring(2, 6).toUpperCase();
  }

  _getImpactMessage(reward) {
    const messages = {
      'plant_trees': '🌳 Your donation will plant 5 trees, absorbing ~0.5 tons of CO2 over their lifetime!',
      'ocean_cleanup': '🌊 Your donation will remove approximately 5 lbs of plastic from the ocean!',
      'renewable_fund': '⚡ Your donation supports clean energy projects that offset ~100 kg of CO2!'
    };
    return messages[reward.id] || 'Thank you for your environmental contribution!';
  }

  async _saveRedemptionHistory(reward, result) {
    const historyKey = 'redemptionHistory';
    const history = await new Promise((resolve) => {
      chrome.storage.local.get([historyKey], (res) => resolve(res[historyKey] || []));
    });

    history.push({
      reward: reward,
      result: result,
      timestamp: new Date().toISOString()
    });

    return new Promise((resolve) => {
      chrome.storage.local.set({ [historyKey]: history.slice(-50) }, resolve);
    });
  }
}

export default RedemptionService;
```

---

### 3. Café Finder (`services/nessie/branches.js`)

```javascript
/**
 * Capital One Café/Branch Finder
 * Uses Nessie Branch API + fallback data
 */

const NESSIE_BASE_URL = 'http://api.nessieisreal.com';

// Fallback café data (real Capital One Café locations)
const CAPITAL_ONE_CAFES = [
  {
    id: 'cafe_boston',
    name: 'Capital One Café - Boston',
    address: { street: '65 Seaport Boulevard', city: 'Boston', state: 'MA', zip: '02210' },
    geocode: { lat: 42.3519, lng: -71.0436 },
    hours: ['Mon-Fri: 7AM-7PM', 'Sat-Sun: 8AM-6PM'],
    features: ['free_wifi', 'atm', 'coaching']
  },
  {
    id: 'cafe_chicago',
    name: 'Capital One Café - Chicago',
    address: { street: '700 N Michigan Ave', city: 'Chicago', state: 'IL', zip: '60611' },
    geocode: { lat: 41.8951, lng: -87.6244 },
    hours: ['Mon-Fri: 7AM-8PM', 'Sat-Sun: 8AM-7PM'],
    features: ['free_wifi', 'atm', 'coaching', 'meeting_rooms']
  },
  {
    id: 'cafe_denver',
    name: 'Capital One Café - Denver',
    address: { street: '1550 Wewatta St', city: 'Denver', state: 'CO', zip: '80202' },
    geocode: { lat: 39.7530, lng: -105.0008 },
    hours: ['Mon-Fri: 7AM-7PM', 'Sat-Sun: 8AM-6PM'],
    features: ['free_wifi', 'atm', 'coaching']
  },
  {
    id: 'cafe_miami',
    name: 'Capital One Café - Miami',
    address: { street: '701 S Miami Ave', city: 'Miami', state: 'FL', zip: '33130' },
    geocode: { lat: 25.7639, lng: -80.1936 },
    hours: ['Mon-Fri: 7AM-8PM', 'Sat-Sun: 8AM-7PM'],
    features: ['free_wifi', 'atm', 'coaching', 'outdoor_seating']
  },
  {
    id: 'cafe_sf',
    name: 'Capital One Café - San Francisco',
    address: { street: '2 Stockton St', city: 'San Francisco', state: 'CA', zip: '94108' },
    geocode: { lat: 37.7866, lng: -122.4065 },
    hours: ['Mon-Fri: 7AM-7PM', 'Sat-Sun: 8AM-6PM'],
    features: ['free_wifi', 'atm', 'coaching']
  },
  // Add more real locations...
];

class CafeFinderService {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  /**
   * Find nearby cafés using user's location
   */
  async findNearbyCafes(lat, lng, radiusMiles = 25) {
    // First try Nessie API
    let branches = [];
    try {
      branches = await this._fetchFromNessie(lat, lng, radiusMiles);
    } catch (error) {
      console.log('Nessie branches unavailable, using fallback data');
    }

    // Combine with/fallback to static café data
    const cafes = this._mergeWithFallback(branches, lat, lng, radiusMiles);

    // Calculate distances and sort
    return cafes
      .map(cafe => ({
        ...cafe,
        distance: this._calculateDistance(lat, lng, cafe.geocode.lat, cafe.geocode.lng),
        walkable: this._calculateDistance(lat, lng, cafe.geocode.lat, cafe.geocode.lng) < 1,
        ecoBonus: this._calculateDistance(lat, lng, cafe.geocode.lat, cafe.geocode.lng) < 0.5 
          ? '+25 pts for walking!' 
          : null
      }))
      .filter(cafe => cafe.distance <= radiusMiles)
      .sort((a, b) => a.distance - b.distance);
  }

  /**
   * Get café details by ID
   */
  async getCafeDetails(cafeId) {
    const cafe = CAPITAL_ONE_CAFES.find(c => c.id === cafeId);
    if (!cafe) {
      throw new Error(`Café not found: ${cafeId}`);
    }

    return {
      ...cafe,
      greenSpecials: this._getTodaysGreenSpecials(),
      redeemableRewards: ['cafe_drink', 'cafe_combo', 'cafe_credit']
    };
  }

  /**
   * Get all cafés (for map display)
   */
  getAllCafes() {
    return CAPITAL_ONE_CAFES;
  }

  // Private methods
  async _fetchFromNessie(lat, lng, radius) {
    const url = `${NESSIE_BASE_URL}/branches?key=${this.apiKey}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch branches');
    }

    const branches = await response.json();
    
    // Filter for café-like branches (if any exist in sandbox)
    return branches.filter(b => 
      b.name?.toLowerCase().includes('café') || 
      b.name?.toLowerCase().includes('cafe')
    );
  }

  _mergeWithFallback(nessieBranches, lat, lng, radius) {
    // Use fallback data, potentially enhanced with any Nessie data
    return CAPITAL_ONE_CAFES.map(cafe => {
      const nessieMatch = nessieBranches.find(b => 
        b.address?.city === cafe.address.city
      );
      
      return {
        ...cafe,
        nessieId: nessieMatch?._id,
        hasATM: nessieMatch?.has_atm ?? true
      };
    });
  }

  _calculateDistance(lat1, lng1, lat2, lng2) {
    // Haversine formula
    const R = 3959; // Earth's radius in miles
    const dLat = this._toRad(lat2 - lat1);
    const dLng = this._toRad(lng2 - lng1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this._toRad(lat1)) * Math.cos(this._toRad(lat2)) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c * 10) / 10; // Round to 1 decimal
  }

  _toRad(deg) {
    return deg * Math.PI / 180;
  }

  _getTodaysGreenSpecials() {
    const specials = [
      { item: 'Oat Milk Upgrade', discount: 'FREE', pointsRequired: 0 },
      { item: 'Bring Your Own Cup', bonus: '+25 points', pointsRequired: 0 },
      { item: 'Local Pastry', discount: '20% off', pointsRequired: 100 },
      { item: 'Organic Cold Brew', discount: '15% off', pointsRequired: 50 }
    ];
    
    // Rotate based on day
    const dayOfWeek = new Date().getDay();
    return specials.slice(dayOfWeek % 2, (dayOfWeek % 2) + 2);
  }
}

export default CafeFinderService;
```

---

## 🖥️ UI Components

### 4. Rewards Store Panel (`popup-rewards.html` section)

```html
<!-- Add to popup.html -->
<section id="rewards-section" class="section collapsed">
  <div class="section-header" onclick="toggleSection('rewards-section')">
    <span>💚 Green Rewards Store</span>
    <span class="toggle-icon">▼</span>
  </div>
  <div class="section-content">
    <!-- Points Balance -->
    <div id="points-balance" class="points-display">
      <span class="points-icon">🌱</span>
      <span class="points-value">0</span>
      <span class="points-label">Green Points</span>
    </div>
    
    <!-- Tier Progress -->
    <div id="tier-progress" class="tier-display">
      <div class="tier-name">🌱 SEEDLING</div>
      <div class="tier-bar">
        <div class="tier-fill" style="width: 0%"></div>
      </div>
      <div class="tier-info">1,000 points to SPROUT</div>
    </div>
    
    <!-- Reward Categories -->
    <div class="reward-tabs">
      <button class="tab active" data-category="cafe">☕ Café</button>
      <button class="tab" data-category="cashback">💰 Cash</button>
      <button class="tab" data-category="charity">🌍 Donate</button>
    </div>
    
    <!-- Rewards List -->
    <div id="rewards-list" class="rewards-container">
      <!-- Populated by JavaScript -->
    </div>
    
    <!-- Quick Actions -->
    <div class="rewards-actions">
      <button id="find-cafe-btn" class="action-btn">
        📍 Find Nearby Café
      </button>
      <button id="view-history-btn" class="action-btn secondary">
        📜 Redemption History
      </button>
    </div>
  </div>
</section>
```

### 5. Rewards JavaScript (`popup-rewards.js`)

```javascript
/**
 * Rewards Store UI Logic
 */

// Initialize rewards display
async function initRewardsStore() {
  await updatePointsDisplay();
  await updateTierProgress();
  await loadRewardsCatalog();
  setupRewardsTabs();
}

async function updatePointsDisplay() {
  const balance = await chrome.runtime.sendMessage({ type: 'GET_GREEN_POINTS' });
  
  const pointsValue = document.querySelector('.points-value');
  if (pointsValue) {
    // Animate the number
    animateNumber(pointsValue, 0, balance, 500);
  }
}

async function updateTierProgress() {
  const progress = await chrome.runtime.sendMessage({ type: 'GET_TIER_PROGRESS' });
  
  const tierName = document.querySelector('.tier-name');
  const tierFill = document.querySelector('.tier-fill');
  const tierInfo = document.querySelector('.tier-info');
  
  if (tierName && progress) {
    const tierEmojis = {
      'SEEDLING': '🌱',
      'SPROUT': '🌿',
      'TREE': '🌳',
      'FOREST': '🌲',
      'GUARDIAN': '🌎'
    };
    
    tierName.textContent = `${tierEmojis[progress.currentTier]} ${progress.currentTier}`;
    tierFill.style.width = `${progress.progress}%`;
    tierInfo.textContent = progress.message;
  }
}

async function loadRewardsCatalog(category = 'cafe') {
  const rewards = await chrome.runtime.sendMessage({ 
    type: 'GET_REWARDS_CATALOG',
    category: category 
  });
  
  const balance = await chrome.runtime.sendMessage({ type: 'GET_GREEN_POINTS' });
  
  const container = document.getElementById('rewards-list');
  container.innerHTML = rewards
    .filter(r => category === 'all' || r.category === category)
    .map(reward => createRewardCard(reward, balance))
    .join('');
  
  // Attach click handlers
  container.querySelectorAll('.reward-card').forEach(card => {
    card.addEventListener('click', () => handleRewardClick(card.dataset.rewardId));
  });
}

function createRewardCard(reward, userBalance) {
  const canAfford = userBalance >= reward.pointsCost;
  
  return `
    <div class="reward-card ${canAfford ? 'affordable' : 'locked'}" 
         data-reward-id="${reward.id}">
      <div class="reward-icon">${reward.icon}</div>
      <div class="reward-details">
        <div class="reward-name">${reward.name}</div>
        <div class="reward-description">${reward.description}</div>
      </div>
      <div class="reward-cost">
        <span class="cost-value">${reward.pointsCost.toLocaleString()}</span>
        <span class="cost-label">pts</span>
      </div>
      <button class="redeem-btn ${canAfford ? '' : 'disabled'}">
        ${canAfford ? 'GET' : '🔒'}
      </button>
    </div>
  `;
}

async function handleRewardClick(rewardId) {
  const balance = await chrome.runtime.sendMessage({ type: 'GET_GREEN_POINTS' });
  const rewards = await chrome.runtime.sendMessage({ type: 'GET_REWARDS_CATALOG' });
  const reward = rewards.find(r => r.id === rewardId);
  
  if (!reward) return;
  
  if (balance < reward.pointsCost) {
    showToast(`Need ${reward.pointsCost - balance} more points!`, 'warning');
    return;
  }
  
  // Show confirmation modal
  showRedemptionModal(reward);
}

function showRedemptionModal(reward) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <span class="modal-icon">${reward.icon}</span>
        <h3>Redeem Reward?</h3>
      </div>
      <div class="modal-body">
        <p><strong>${reward.name}</strong></p>
        <p>${reward.description}</p>
        <p class="cost-display">
          <span class="cost">${reward.pointsCost.toLocaleString()}</span> Green Points
        </p>
      </div>
      <div class="modal-actions">
        <button class="btn-cancel" onclick="this.closest('.modal-overlay').remove()">
          Cancel
        </button>
        <button class="btn-confirm" onclick="confirmRedemption('${reward.id}')">
          Confirm Redemption
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function confirmRedemption(rewardId) {
  // Close modal
  document.querySelector('.modal-overlay')?.remove();
  
  // Show loading
  showToast('Processing redemption...', 'info');
  
  try {
    const result = await chrome.runtime.sendMessage({
      type: 'REDEEM_REWARD',
      rewardId: rewardId
    });
    
    if (result.success) {
      // Show success based on type
      if (result.result.type === 'cafe') {
        showQRCodeModal(result.result);
      } else if (result.result.type === 'cashback') {
        showToast(`💰 ${result.result.message}`, 'success');
      } else if (result.result.type === 'charity') {
        showCertificateModal(result.result);
      }
      
      // Update displays
      await updatePointsDisplay();
      await updateTierProgress();
      await loadRewardsCatalog();
    }
  } catch (error) {
    showToast(`Error: ${error.message}`, 'error');
  }
}

function showQRCodeModal(redemptionResult) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content qr-modal">
      <div class="modal-header success">
        <span>🎉</span>
        <h3>Reward Redeemed!</h3>
      </div>
      <div class="modal-body">
        <div class="qr-code" id="qr-display">
          <!-- QR code would be generated here -->
          <div class="qr-placeholder">
            <div class="qr-text">${redemptionResult.code}</div>
          </div>
        </div>
        <div class="redemption-instructions">
          ${redemptionResult.instructions.map(i => `<p>✓ ${i}</p>`).join('')}
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn-confirm" onclick="this.closest('.modal-overlay').remove()">
          Done
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function showCertificateModal(donationResult) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content certificate-modal">
      <div class="certificate">
        <h2>🌍 Certificate of Environmental Impact</h2>
        <div class="certificate-body">
          <p>Thank you for your donation to</p>
          <h3>${donationResult.charityPartner}</h3>
          <p class="donation-amount">$${donationResult.donationValue.toFixed(2)}</p>
          <p class="impact-message">${donationResult.impactMessage}</p>
          <p class="donation-id">ID: ${donationResult.donationId}</p>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" onclick="shareCertificate()">
          📤 Share
        </button>
        <button class="btn-confirm" onclick="this.closest('.modal-overlay').remove()">
          Done
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function setupRewardsTabs() {
  document.querySelectorAll('.reward-tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.reward-tabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      loadRewardsCatalog(tab.dataset.category);
    });
  });
}

// Utility functions
function animateNumber(element, start, end, duration) {
  const startTime = performance.now();
  
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const value = Math.floor(start + (end - start) * easeOutCubic(progress));
    element.textContent = value.toLocaleString();
    
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }
  
  requestAnimationFrame(update);
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initRewardsStore);
```

---

## 🔌 Background Service Integration

### 6. Add to `background.js`

```javascript
// Add these message handlers to background.js

// Import services (or include inline)
// import greenPointsEngine from './services/greenRewards/pointsEngine.js';
// import RedemptionService from './services/greenRewards/redemption.js';

// Green Points Engine (inline version for service worker)
const greenPointsStorage = {
  async getBalance() {
    return new Promise(resolve => {
      chrome.storage.local.get(['greenPoints'], res => resolve(res.greenPoints || 0));
    });
  },
  
  async addPoints(points, reason) {
    const current = await this.getBalance();
    const newBalance = current + points;
    await chrome.storage.local.set({ greenPoints: newBalance });
    console.log(`🌱 +${points} Green Points (${reason}). Balance: ${newBalance}`);
    return newBalance;
  },
  
  async deductPoints(points, reason) {
    const current = await this.getBalance();
    if (current < points) throw new Error('Insufficient points');
    const newBalance = current - points;
    await chrome.storage.local.set({ greenPoints: newBalance });
    console.log(`🌱 -${points} Green Points (${reason}). Balance: ${newBalance}`);
    return newBalance;
  }
};

// Rewards catalog
const REWARDS_CATALOG = [
  { id: 'cafe_drink', name: 'Free Café Drink', pointsCost: 500, icon: '☕', category: 'cafe', description: 'Any drink, any size' },
  { id: 'cafe_combo', name: 'Drink + Pastry', pointsCost: 1000, icon: '🥐', category: 'cafe', description: 'Drink plus pastry combo' },
  { id: 'cafe_credit', name: '$10 Café Credit', pointsCost: 2000, icon: '🎁', category: 'cafe', description: 'Use on anything' },
  { id: 'cashback_5', name: '$5 Cash Back', pointsCost: 5000, icon: '💰', category: 'cashback', cashValue: 5, description: 'To your account' },
  { id: 'cashback_10', name: '$10 Cash Back', pointsCost: 10000, icon: '💵', category: 'cashback', cashValue: 10, description: 'To your account' },
  { id: 'plant_trees', name: 'Plant 5 Trees', pointsCost: 500, icon: '🌳', category: 'charity', description: 'via One Tree Planted' },
  { id: 'ocean_cleanup', name: 'Ocean Cleanup', pointsCost: 1000, icon: '🐋', category: 'charity', description: 'Remove ocean plastic' }
];

// Add to message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // ... existing handlers ...
  
  // Green Points handlers
  if (message.type === 'GET_GREEN_POINTS') {
    greenPointsStorage.getBalance().then(sendResponse);
    return true;
  }
  
  if (message.type === 'ADD_GREEN_POINTS') {
    greenPointsStorage.addPoints(message.points, message.reason).then(sendResponse);
    return true;
  }
  
  if (message.type === 'GET_TIER_PROGRESS') {
    (async () => {
      const balance = await greenPointsStorage.getBalance();
      const tiers = [
        { name: 'SEEDLING', threshold: 0 },
        { name: 'SPROUT', threshold: 1000 },
        { name: 'TREE', threshold: 5000 },
        { name: 'FOREST', threshold: 10000 },
        { name: 'GUARDIAN', threshold: 25000 }
      ];
      
      let currentTier = tiers[0];
      let nextTier = tiers[1];
      
      for (let i = tiers.length - 1; i >= 0; i--) {
        if (balance >= tiers[i].threshold) {
          currentTier = tiers[i];
          nextTier = tiers[i + 1] || null;
          break;
        }
      }
      
      const progress = nextTier 
        ? Math.round(((balance - currentTier.threshold) / (nextTier.threshold - currentTier.threshold)) * 100)
        : 100;
      
      sendResponse({
        currentTier: currentTier.name,
        nextTier: nextTier?.name,
        progress: progress,
        pointsToNext: nextTier ? nextTier.threshold - balance : 0,
        message: nextTier ? `${nextTier.threshold - balance} points to ${nextTier.name}` : 'Max tier reached!'
      });
    })();
    return true;
  }
  
  if (message.type === 'GET_REWARDS_CATALOG') {
    const category = message.category;
    const filtered = category && category !== 'all' 
      ? REWARDS_CATALOG.filter(r => r.category === category)
      : REWARDS_CATALOG;
    sendResponse(filtered);
    return true;
  }
  
  if (message.type === 'REDEEM_REWARD') {
    (async () => {
      try {
        const reward = REWARDS_CATALOG.find(r => r.id === message.rewardId);
        if (!reward) throw new Error('Reward not found');
        
        const balance = await greenPointsStorage.getBalance();
        if (balance < reward.pointsCost) throw new Error('Insufficient points');
        
        // Deduct points
        await greenPointsStorage.deductPoints(reward.pointsCost, `Redeemed: ${reward.name}`);
        
        // Generate result based on type
        let result;
        if (reward.category === 'cafe') {
          const code = 'WW' + Date.now().toString(36).toUpperCase();
          result = {
            type: 'cafe',
            code: code,
            instructions: [
              'Visit any Capital One Café',
              'Show this code to the barista',
              'Enjoy your reward!',
              `Valid for 24 hours`
            ]
          };
        } else if (reward.category === 'cashback') {
          // Deposit via Nessie
          const stored = await chrome.storage.sync.get(['mainAccount', 'nessieApiKey']);
          if (stored.mainAccount && stored.nessieApiKey) {
            const depositUrl = `${NESSIE_BASE_URL}/accounts/${stored.mainAccount}/deposits?key=${stored.nessieApiKey}`;
            await fetch(depositUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                medium: 'balance',
                amount: reward.cashValue,
                transaction_date: new Date().toISOString().split('T')[0],
                description: `WattWise: ${reward.name}`
              })
            });
          }
          result = {
            type: 'cashback',
            amount: reward.cashValue,
            message: `$${reward.cashValue.toFixed(2)} deposited!`
          };
        } else if (reward.category === 'charity') {
          result = {
            type: 'charity',
            charityPartner: reward.description.replace('via ', ''),
            donationValue: reward.pointsCost / 100,
            donationId: 'DON' + Date.now().toString(36).toUpperCase(),
            impactMessage: `Thank you for supporting ${reward.name}!`
          };
        }
        
        sendResponse({ success: true, result: result });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
});

// Award points when sustainability is evaluated
// Add this to evaluateSustainability function:
async function awardPointsForPurchaseAnalysis(productName, sustainabilityScore, repairability) {
  let points = 10; // Base points for using WattWise
  
  if (sustainabilityScore >= 70) points += 50;  // Good sustainability
  if (repairability?.score >= 8) points += 75;  // High repairability
  
  await greenPointsStorage.addPoints(points, `Analyzed: ${productName}`);
  return points;
}
```

---

## 📊 CSS Styles

### 7. Rewards Styles (`popup.css` additions)

```css
/* Green Rewards Styles */
.points-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  background: linear-gradient(135deg, #4CAF50, #2E7D32);
  border-radius: 12px;
  color: white;
  margin-bottom: 12px;
}

.points-icon {
  font-size: 24px;
}

.points-value {
  font-size: 32px;
  font-weight: bold;
}

.points-label {
  font-size: 12px;
  opacity: 0.9;
}

.tier-display {
  padding: 12px;
  background: #f5f5f5;
  border-radius: 8px;
  margin-bottom: 12px;
}

.tier-name {
  font-weight: bold;
  margin-bottom: 8px;
}

.tier-bar {
  height: 8px;
  background: #ddd;
  border-radius: 4px;
  overflow: hidden;
}

.tier-fill {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50, #8BC34A);
  transition: width 0.5s ease;
}

.tier-info {
  font-size: 11px;
  color: #666;
  margin-top: 4px;
}

.reward-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
}

.reward-tabs .tab {
  flex: 1;
  padding: 8px;
  border: none;
  background: #f0f0f0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.reward-tabs .tab.active {
  background: #4CAF50;
  color: white;
}

.rewards-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.reward-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.reward-card:hover {
  border-color: #4CAF50;
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.2);
}

.reward-card.locked {
  opacity: 0.6;
  cursor: not-allowed;
}

.reward-icon {
  font-size: 24px;
  width: 40px;
  text-align: center;
}

.reward-details {
  flex: 1;
}

.reward-name {
  font-weight: 600;
  font-size: 13px;
}

.reward-description {
  font-size: 11px;
  color: #666;
}

.reward-cost {
  text-align: right;
}

.cost-value {
  font-weight: bold;
  color: #4CAF50;
}

.cost-label {
  font-size: 10px;
  color: #888;
}

.redeem-btn {
  padding: 6px 12px;
  border: none;
  background: #4CAF50;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  font-size: 11px;
}

.redeem-btn.disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 20px;
  max-width: 300px;
  width: 90%;
}

.modal-header {
  text-align: center;
  margin-bottom: 16px;
}

.modal-header.success {
  color: #4CAF50;
}

.modal-icon {
  font-size: 32px;
}

.modal-body {
  text-align: center;
  margin-bottom: 16px;
}

.modal-actions {
  display: flex;
  gap: 8px;
}

.btn-cancel, .btn-confirm, .btn-secondary {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
}

.btn-cancel {
  background: #f0f0f0;
}

.btn-confirm {
  background: #4CAF50;
  color: white;
}

.btn-secondary {
  background: #2196F3;
  color: white;
}

/* QR Code display */
.qr-placeholder {
  width: 150px;
  height: 150px;
  margin: 0 auto;
  background: #f5f5f5;
  border: 2px dashed #4CAF50;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qr-text {
  font-family: monospace;
  font-size: 14px;
  font-weight: bold;
  color: #4CAF50;
}

/* Toast notifications */
.toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%) translateY(100px);
  padding: 12px 24px;
  border-radius: 8px;
  color: white;
  font-size: 13px;
  transition: transform 0.3s ease;
  z-index: 1001;
}

.toast.show {
  transform: translateX(-50%) translateY(0);
}

.toast-success { background: #4CAF50; }
.toast-error { background: #f44336; }
.toast-warning { background: #ff9800; }
.toast-info { background: #2196F3; }

/* Certificate */
.certificate {
  border: 3px double #4CAF50;
  padding: 20px;
  text-align: center;
}

.certificate h2 {
  font-size: 16px;
  color: #2E7D32;
  margin-bottom: 12px;
}

.donation-amount {
  font-size: 24px;
  font-weight: bold;
  color: #4CAF50;
}

.impact-message {
  font-style: italic;
  color: #666;
  margin: 12px 0;
}

.donation-id {
  font-size: 10px;
  color: #999;
}
```

---

## 🚀 Implementation Checklist

### Phase 1: Core Points System (Day 1)
- [ ] Create `greenPointsStorage` in background.js
- [ ] Add message handlers for points operations
- [ ] Implement tier calculation logic
- [ ] Add points display to popup.html

### Phase 2: Rewards Catalog (Day 1-2)
- [ ] Define rewards catalog constant
- [ ] Create rewards store UI section
- [ ] Implement tab filtering
- [ ] Add reward cards with affordability check

### Phase 3: Redemption Flow (Day 2)
- [ ] Create confirmation modal
- [ ] Implement QR code generation for café rewards
- [ ] Integrate Nessie deposit API for cashback
- [ ] Add charity donation certificate

### Phase 4: Points Earning (Day 2-3)
- [ ] Hook into sustainability evaluation
- [ ] Award points based on repairability score
- [ ] Track purchase behavior patterns
- [ ] Add bonus points for eco-actions

### Phase 5: Polish (Day 3)
- [ ] Add animations (number counting, progress bars)
- [ ] Implement toast notifications
- [ ] Add tier upgrade celebrations
- [ ] Test all redemption flows

---

## 📝 Testing Scenarios

1. **Points Earning**
   - Analyze product with high repairability → +75 pts
   - Analyze product with good sustainability → +50 pts
   - Regular analysis → +10 pts

2. **Tier Progression**
   - Start at 0, earn 1000 → Upgrade to SPROUT
   - Verify progress bar updates correctly

3. **Redemption**
   - Café reward → QR code displays
   - Cashback → Nessie deposit successful
   - Charity → Certificate displays

4. **Edge Cases**
   - Try to redeem with insufficient points
   - Redeem multiple times rapidly
   - Test with no Nessie account configured

---

*Implementation Framework v1.0 - January 25, 2026*
