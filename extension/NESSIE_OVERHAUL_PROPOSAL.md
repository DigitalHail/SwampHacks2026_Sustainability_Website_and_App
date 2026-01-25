# 🏦 Nessie API Integration Overhaul Proposal

## Executive Summary

The current Nessie implementation is **underutilized** - we're only using ~15% of the API's capabilities. This proposal transforms WattWise from a simple "view balance" tool into a **comprehensive sustainable finance assistant** that tracks spending patterns, calculates eco-impact of purchases, and creates automated savings strategies.

---

## 📊 Current State Analysis

### What We Have Now
```
✅ Test API connection
✅ View account list  
✅ Get account balance
✅ Manual transfers between accounts
✅ Get purchase history (basic)
```

### What We're Missing
```
❌ Merchant categorization & eco-scoring
❌ Purchase pattern analysis
❌ Automated eco-savings rules
❌ Bill tracking for recurring subscriptions
❌ ATM/Branch sustainability features
❌ Customer spending insights
❌ Transaction history visualization
❌ Carbon footprint per transaction
```

---

## 🚀 Proposed Architecture

### Tier 1: **Smart Purchase Tracking** (High Impact)

#### 1.1 Eco-Categorized Purchase History
Instead of just listing purchases, we categorize them by environmental impact:

```javascript
// NEW: Enhanced purchase analysis
async function analyzeEcoPurchases(accountId) {
  const purchases = await getPurchases(accountId);
  
  return purchases.map(purchase => ({
    ...purchase,
    ecoCategory: categorizeByMerchant(purchase.merchant_id),
    carbonImpact: estimateCarbonFromCategory(purchase),
    sustainabilityScore: scoreTransaction(purchase)
  }));
}

// Merchant categories with eco-weights
const ECO_CATEGORIES = {
  'fast_fashion': { weight: -3, label: '🛍️ Fast Fashion' },
  'electronics': { weight: -2, label: '📱 Electronics' },
  'local_food': { weight: +2, label: '🥗 Local Food' },
  'thrift_store': { weight: +3, label: '♻️ Secondhand' },
  'ev_charging': { weight: +2, label: '⚡ EV Charging' },
  'public_transit': { weight: +3, label: '🚌 Public Transit' }
};
```

#### 1.2 Create "Eco Merchants" Database
Use Nessie's Merchant API to build a sustainability-scored merchant database:

```javascript
// Create eco-friendly merchant entries
async function createEcoMerchant(name, category, ecoScore) {
  const response = await fetch(`${NESSIE_BASE_URL}/merchants?key=${key}`, {
    method: 'POST',
    body: JSON.stringify({
      name: name,
      category: category,  // "sustainable", "neutral", "high-impact"
      address: { ... },
      geocode: { lat, lng }  // For local business discovery
    })
  });
  
  // Store eco-score in local cache
  await cacheEcoScore(response.objectCreated._id, ecoScore);
}
```

---

### Tier 2: **Automated Eco-Savings** (Medium Complexity)

#### 2.1 "Round-Up for Planet" Feature
Automatically round up purchases and transfer the difference to a green savings fund:

```javascript
// Auto-triggered after each purchase
async function roundUpForPlanet(purchase) {
  const roundedAmount = Math.ceil(purchase.amount);
  const roundUpAmount = roundedAmount - purchase.amount;
  
  if (roundUpAmount > 0) {
    await performNessieTransfer(
      NESSIE_API_KEY,
      mainAccountId,
      greenSavingsAccountId,
      roundUpAmount
    );
    
    return {
      saved: roundUpAmount,
      message: `🌱 Saved $${roundUpAmount.toFixed(2)} for planet!`
    };
  }
}
```

#### 2.2 "Carbon Tax" Auto-Transfers
Calculate carbon impact and auto-transfer proportional amounts:

```javascript
async function applyCarbonTax(purchase, carbonKg) {
  // $0.05 per kg CO2e (configurable)
  const carbonRate = 0.05;
  const taxAmount = carbonKg * carbonRate;
  
  if (taxAmount >= 0.01) {
    await performNessieTransfer(key, mainAccount, carbonOffsetAccount, taxAmount);
    
    // Track total carbon offset funded
    await updateCarbonStats({
      totalOffsetFunded: taxAmount,
      carbonKgOffset: carbonKg
    });
  }
}
```

#### 2.3 Smart Savings Rules Engine
```javascript
const SAVINGS_RULES = [
  {
    name: "Fast Fashion Penalty",
    condition: (p) => p.ecoCategory === 'fast_fashion',
    action: (p) => transferPercent(p.amount, 0.10),  // 10% to savings
    message: "💡 Consider thrift stores next time!"
  },
  {
    name: "Green Bonus",
    condition: (p) => p.merchant_category === 'farmers_market',
    action: (p) => addRewardPoints(50),
    message: "🌿 +50 eco points for local shopping!"
  },
  {
    name: "High-Impact Alert",
    condition: (p) => p.carbonKg > 10,
    action: (p) => showNotification(p),
    message: "⚠️ This purchase has high carbon impact"
  }
];
```

---

### Tier 3: **Bill & Subscription Eco-Audit** (Novel Feature)

#### 3.1 Subscription Sustainability Checker
Use Nessie's Bill API to track recurring subscriptions and score their sustainability:

```javascript
async function auditSubscriptions(customerId) {
  const bills = await fetch(`${NESSIE_BASE_URL}/customers/${customerId}/bills?key=${key}`);
  
  return bills.map(bill => ({
    ...bill,
    category: categorizeBill(bill.payee),
    ecoAlternative: findGreenAlternative(bill.payee),
    monthlyCarbonImpact: estimateBillCarbon(bill),
    recommendation: generateRecommendation(bill)
  }));
}

// Example output:
// {
//   payee: "Netflix",
//   payment_amount: 15.99,
//   category: "streaming",
//   ecoAlternative: "Consider sharing accounts to reduce server load",
//   monthlyCarbonImpact: 0.3,  // kg CO2
//   recommendation: "✓ Digital service - relatively low impact"
// }
```

#### 3.2 "Green Bill" Creation
Create reminders/bills for eco-commitments:

```javascript
async function createGreenCommitment(accountId, commitment) {
  // Create a recurring "bill" for personal eco-goals
  await fetch(`${NESSIE_BASE_URL}/accounts/${accountId}/bills?key=${key}`, {
    method: 'POST',
    body: JSON.stringify({
      status: "recurring",
      payee: "WattWise Green Fund",
      nickname: commitment.name,  // "Monthly Tree Planting"
      recurring_date: 1,  // 1st of month
      payment_amount: commitment.amount
    })
  });
}
```

---

### Tier 4: **Location-Based Eco Features** (Innovative)

#### 4.1 Green ATM/Branch Finder
Use Nessie's ATM and Branch APIs with geolocation:

```javascript
async function findGreenATMs(lat, lng, radius = 5) {
  const atms = await fetch(
    `${NESSIE_BASE_URL}/atms?lat=${lat}&lng=${lng}&rad=${radius}&key=${key}`
  );
  
  // Score ATMs by:
  // - Walkability from user location
  // - Solar-powered locations (if known)
  // - Paper-free receipt options
  return atms.map(atm => ({
    ...atm,
    walkScore: calculateWalkScore(lat, lng, atm.geocode),
    ecoFeatures: getATMEcoFeatures(atm._id),
    recommendedReason: atm.walkScore > 80 ? "🚶 Walking distance!" : null
  }));
}
```

#### 4.2 Local Eco-Merchant Discovery
```javascript
async function discoverLocalEcoMerchants(lat, lng) {
  const merchants = await fetch(
    `${NESSIE_BASE_URL}/merchants?lat=${lat}&lng=${lng}&rad=2&key=${key}`
  );
  
  // Filter and rank by eco-score
  return merchants
    .filter(m => getEcoScore(m._id) >= 7)
    .sort((a, b) => getEcoScore(b._id) - getEcoScore(a._id))
    .map(m => ({
      name: m.name,
      category: m.category,
      ecoScore: getEcoScore(m._id),
      distance: calculateDistance(lat, lng, m.geocode),
      whyGreen: getEcoReason(m._id)
    }));
}
```

---

### Tier 5: **Analytics Dashboard** (Data-Driven)

#### 5.1 Monthly Eco-Finance Report
```javascript
async function generateMonthlyReport(accountId, month, year) {
  const purchases = await getPurchasesForMonth(accountId, month, year);
  const deposits = await getDeposits(accountId);
  const transfers = await getTransfers(accountId);
  
  return {
    // Spending breakdown by eco-category
    spendingByCategory: groupByEcoCategory(purchases),
    
    // Carbon footprint
    totalCarbonKg: purchases.reduce((sum, p) => sum + p.carbonKg, 0),
    carbonTrend: compareToLastMonth(purchases),
    
    // Savings impact
    greenSavingsTotal: calculateGreenSavings(transfers),
    projectedAnnualSavings: greenSavingsTotal * 12,
    
    // Gamification
    ecoPoints: calculateEcoPoints(purchases),
    level: getEcoLevel(ecoPoints),
    badges: getEarnedBadges(purchases),
    
    // Recommendations
    topRecommendation: generateTopRecommendation(purchases),
    potentialSavings: calculatePotentialSavings(purchases)
  };
}
```

#### 5.2 Comparative Spending Insights
```javascript
// How does user compare to average?
function generateInsights(userPurchases) {
  return {
    vs_average: {
      electronics: "+23% above average",
      local_food: "-15% below average",
      fast_fashion: "-42% below average 🎉"
    },
    improvement_areas: [
      "Consider reducing electronics purchases by 10%",
      "Great job avoiding fast fashion!"
    ],
    eco_rank: "Top 15% of WattWise users"
  };
}
```

---

## 🎨 New UI Components

### 1. Eco-Finance Dashboard
```
┌─────────────────────────────────────────────┐
│  🌍 Monthly Eco Report - January 2026       │
├─────────────────────────────────────────────┤
│                                             │
│  Carbon Footprint: 127 kg CO2e   ↓ 12%     │
│  ████████░░░░░░░░░░ vs last month          │
│                                             │
│  Green Savings: $47.32           ↑ 8%      │
│  🌱🌱🌱🌱🌱🌱🌱🌱░░                          │
│                                             │
│  ─────────────────────────────────         │
│  Spending by Impact:                        │
│  🟢 Low Impact    $234.50  (45%)           │
│  🟡 Medium        $189.20  (36%)           │
│  🔴 High Impact   $ 98.30  (19%)           │
│                                             │
│  [View Details] [Set Goals] [Export]       │
└─────────────────────────────────────────────┘
```

### 2. Smart Transaction Feed
```
┌─────────────────────────────────────────────┐
│  Recent Transactions                        │
├─────────────────────────────────────────────┤
│  🥗 Whole Foods          -$45.23           │
│     Local & Organic • 1.2 kg CO2           │
│     💚 +25 eco points                       │
│                                             │
│  📱 Best Buy             -$899.00          │
│     Electronics • 23.5 kg CO2              │
│     ⚠️ Tip: Check iFixit score before buy  │
│     [Auto-saved $9.00 to Green Fund]       │
│                                             │
│  ♻️ ThriftBooks          -$12.99           │
│     Secondhand • 0.1 kg CO2                │
│     🎉 Eco Hero! +50 bonus points          │
└─────────────────────────────────────────────┘
```

### 3. Subscription Audit Panel
```
┌─────────────────────────────────────────────┐
│  📋 Subscription Eco-Audit                  │
├─────────────────────────────────────────────┤
│                                             │
│  Netflix         $15.99/mo    🟢 Low       │
│  → Share with family to reduce impact      │
│                                             │
│  Amazon Prime    $14.99/mo    🟡 Medium    │
│  → Fast shipping increases carbon          │
│  → 💡 Switch to "No Rush" for rewards      │
│                                             │
│  Meal Kit Box    $79.99/mo    🔴 High      │
│  → Excess packaging, shipping emissions    │
│  → 💡 Try local meal prep services         │
│                                             │
│  Monthly Impact: 12.3 kg CO2               │
│  Potential Savings: 4.8 kg/mo              │
└─────────────────────────────────────────────┘
```

---

## 🔧 Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Refactor Nessie API service into modular architecture
- [ ] Create eco-merchant categorization system
- [ ] Implement enhanced purchase history with carbon estimates
- [ ] Add transaction detail view with sustainability insights

### Phase 2: Automation (Week 2)
- [ ] Build round-up savings feature
- [ ] Create carbon tax auto-transfer logic
- [ ] Implement savings rules engine
- [ ] Add user configuration for automation preferences

### Phase 3: Analytics (Week 3)
- [ ] Build monthly report generator
- [ ] Create spending visualization components
- [ ] Implement comparative insights
- [ ] Add goal tracking and progress

### Phase 4: Advanced Features (Week 4)
- [ ] Subscription audit functionality
- [ ] Location-based features
- [ ] Gamification system (points, badges, levels)
- [ ] Export and sharing features

---

## 📁 Proposed File Structure

```
extension/
├── services/
│   ├── nessie/
│   │   ├── index.js           # Main Nessie service
│   │   ├── accounts.js        # Account operations
│   │   ├── purchases.js       # Purchase tracking
│   │   ├── transfers.js       # Transfer operations
│   │   ├── merchants.js       # Merchant management
│   │   ├── bills.js           # Bill/subscription tracking
│   │   └── analytics.js       # Data analysis
│   └── eco/
│       ├── categorizer.js     # Eco-categorization logic
│       ├── carbon.js          # Carbon estimation
│       ├── savings.js         # Auto-savings rules
│       └── gamification.js    # Points & badges
├── components/
│   ├── EcoDashboard.js        # Main dashboard
│   ├── TransactionFeed.js     # Enhanced transaction list
│   ├── SubscriptionAudit.js   # Subscription panel
│   ├── MonthlyReport.js       # Monthly summary
│   └── GreenMerchantFinder.js # Local merchant discovery
└── data/
    ├── eco-categories.json    # Category definitions
    ├── merchant-scores.json   # Known merchant eco-scores
    └── carbon-factors.json    # Carbon estimation factors
```

---

## 🎯 Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Nessie API utilization | 15% | 75% |
| User engagement (popup opens/day) | ? | 3+ |
| Auto-savings adoption | 0% | 60% |
| Carbon tracking accuracy | N/A | ±15% |
| User satisfaction | ? | 4.5/5 |

---

## 💡 Innovative Ideas Beyond Nessie

### 1. "Carbon Credit" Rewards System
Partner purchases with carbon offset providers. When users reach savings milestones, actually purchase carbon offsets.

### 2. Social Comparison
"You saved 23% more carbon than average WattWise user this month!" (anonymized, aggregate data)

### 3. Merchant Incentive Program
Work with eco-friendly merchants to offer WattWise users discounts, tracked via Nessie purchase data.

### 4. Predictive Budgeting
"Based on your patterns, you'll likely spend $X on electronics this month. Here's how to reduce impact..."

### 5. Family/Household Mode
Link multiple Nessie accounts for household-level sustainability tracking.

---

## 🏦 Capital One Partnership Incentives (Key Differentiator!)

Since Nessie is Capital One's API, we can propose **real-world redemption partnerships** that make eco-points tangible:

### 💳 Green Points → Real Rewards

#### Tier 1: Capital One Café Redemptions
Capital One operates [Capital One Cafés](https://www.capitalone.com/local/) across the US - perfect for eco-reward redemption:

```
┌─────────────────────────────────────────────┐
│  🎉 Redeem Your Green Points!               │
├─────────────────────────────────────────────┤
│                                             │
│  Your Balance: 2,450 Green Points 🌱        │
│                                             │
│  ☕ Free Coffee at Capital One Café         │
│     500 points → Any drink, any size        │
│     [Redeem Now]                            │
│                                             │
│  🥐 Free Pastry + Drink Combo               │
│     1,000 points → Breakfast on us          │
│     [Redeem Now]                            │
│                                             │
│  🎁 $10 Café Credit                         │
│     2,000 points → Use on anything          │
│     [Redeem Now]                            │
│                                             │
│  💰 Cash Back to Account                    │
│     5,000 points → $5 deposited             │
│     [Redeem Now]                            │
│                                             │
└─────────────────────────────────────────────┘
```

#### Tier 2: Enhanced Capital One Rewards Integration
```javascript
// Convert Green Points to Capital One Rewards
async function redeemGreenPoints(points, rewardType) {
  const CONVERSION_RATES = {
    'cafe_coffee': { points: 500, value: 'Free drink' },
    'cafe_combo': { points: 1000, value: 'Drink + pastry' },
    'cafe_credit': { points: 2000, value: '$10 café credit' },
    'cashback': { points: 5000, value: '$5.00' },
    'venture_miles': { points: 1000, value: '100 miles' },
    'charity_donation': { points: 500, value: '$5 to eco-charity' }
  };
  
  // Use Nessie rewards system
  const account = await getAccount(accountId);
  if (account.rewards >= points) {
    await deductRewards(accountId, points);
    await issueReward(rewardType);
    return { success: true, reward: CONVERSION_RATES[rewardType] };
  }
}
```

#### Tier 3: Exclusive Green Cardholder Benefits
Propose special perks for Capital One cardholders who use WattWise:

| Green Level | Points Needed | Capital One Benefit |
|-------------|---------------|---------------------|
| 🌱 Seedling | 0 | Basic tracking |
| 🌿 Sprout | 1,000 | 1% extra cashback on eco-purchases |
| 🌳 Tree | 5,000 | Free café visits (2/month) |
| 🌲 Forest | 10,000 | Exclusive green card design |
| 🌎 Guardian | 25,000 | APR reduction + café ambassador |

### 🏪 Capital One Café Integration Features

#### Café Finder with Green Points
```javascript
// Find nearest Capital One Café using Nessie Branch API
async function findCapitalOneCafes(lat, lng) {
  const branches = await fetch(
    `${NESSIE_BASE_URL}/branches?key=${key}`
  );
  
  // Filter for café locations
  const cafes = branches.filter(b => b.name.includes('Café'));
  
  return cafes.map(cafe => ({
    name: cafe.name,
    address: cafe.address,
    distance: calculateDistance(lat, lng, cafe.geocode),
    hours: cafe.hours,
    redeemableRewards: getRedeemableAtLocation(cafe._id),
    specialOffers: getGreenSpecials(cafe._id)
  }));
}
```

#### In-Café Experience
```
┌─────────────────────────────────────────────┐
│  📍 Capital One Café - Union Square         │
├─────────────────────────────────────────────┤
│                                             │
│  You're at a Capital One Café! 🎉           │
│                                             │
│  Today's Green Specials:                    │
│  ☕ Oat milk latte - 20% off with 100 pts   │
│  🥗 Local salad bowl - FREE with 800 pts   │
│                                             │
│  Your Points: 2,450 🌱                      │
│                                             │
│  [Show QR Code to Redeem]                   │
│                                             │
│  ─────────────────────────────────         │
│  💡 Tip: Bring your own cup for +25 pts!   │
└─────────────────────────────────────────────┘
```

### 💰 Cash Back to Nessie Account
Direct deposit green rewards back to user's account:

```javascript
async function redeemForCashback(accountId, greenPoints) {
  const CASHBACK_RATE = 0.001; // $0.001 per point
  const cashValue = greenPoints * CASHBACK_RATE;
  
  // Deposit to user's account via Nessie
  await fetch(`${NESSIE_BASE_URL}/accounts/${accountId}/deposits?key=${key}`, {
    method: 'POST',
    body: JSON.stringify({
      medium: "balance",
      amount: cashValue,
      transaction_date: new Date().toISOString().split('T')[0],
      description: "WattWise Green Points Redemption 🌱"
    })
  });
  
  return {
    deposited: cashValue,
    message: `$${cashValue.toFixed(2)} deposited to your account!`
  };
}
```

### 🎯 Why This Matters for Capital One

**Pitch to Capital One:**
1. **Customer Engagement** - Drives café foot traffic and app engagement
2. **Brand Differentiation** - Positions Capital One as sustainability leader
3. **Data Insights** - Understand eco-conscious spending patterns
4. **Loyalty** - Green rewards create stickier customers
5. **ESG Goals** - Tangible sustainability initiative for corporate reporting

**User Value Proposition:**
- "Your sustainable choices earn real rewards"
- "Every eco-friendly purchase gets you closer to free coffee"
- "Banking that rewards you for helping the planet"

### 📱 Redemption UI Mockup
```
┌─────────────────────────────────────────────┐
│  💚 Green Rewards Store                     │
├─────────────────────────────────────────────┤
│                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  YOUR POINTS: 2,450 🌱                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                             │
│  🏪 CAPITAL ONE CAFÉ                        │
│  ┌─────────────────────────────────────┐   │
│  │ ☕ Any Drink        500 pts [GET]  │   │
│  │ 🥐 Drink + Pastry  1000 pts [GET]  │   │
│  │ 🎁 $10 Credit      2000 pts [GET]  │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  💵 CASH BACK                               │
│  ┌─────────────────────────────────────┐   │
│  │ 💰 $5 to Account   5000 pts [—]    │   │
│  │ 💰 $10 to Account 10000 pts [—]    │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  🌍 DONATE TO CHARITY                       │
│  ┌─────────────────────────────────────┐   │
│  │ 🌳 Plant 5 Trees    500 pts [GET]  │   │
│  │ 🐋 Ocean Cleanup   1000 pts [GET]  │   │
│  │ ⚡ Renewable Fund  2000 pts [GET]  │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [View Redemption History]                  │
└─────────────────────────────────────────────┘
```

### 🔄 Points Earning Structure
| Action | Points Earned |
|--------|---------------|
| Purchase from eco-merchant | +50 |
| Buy secondhand/refurbished | +100 |
| High iFixit score purchase (8+) | +75 |
| Use "No Rush" shipping | +25 |
| Monthly carbon reduction | +200 |
| Refer a friend | +500 |
| Bring reusable cup to café | +25 |
| Complete eco-challenge | +150 |

---

## ⚠️ Technical Considerations

1. **Rate Limiting**: Nessie may have rate limits - implement request queuing
2. **Data Privacy**: All eco-scores and patterns stored locally, not on external servers
3. **Offline Support**: Cache critical data for offline viewing
4. **HTTP vs HTTPS**: Nessie uses HTTP - ensure proper handling in manifest
5. **Demo Data**: Since Nessie is a sandbox API, pre-populate with realistic demo data

---

## 🚦 Quick Wins (Start Here)

1. **Enhanced purchase history** with eco-categories (2-3 hours)
2. **Basic carbon footprint display** per transaction (1-2 hours)
3. **Monthly summary stats** in popup (2 hours)
4. **Round-up savings toggle** in settings (3-4 hours)

---

## Questions for Stakeholders

1. Should auto-transfers be opt-in or opt-out by default?
2. What's the priority: automation features or analytics dashboard?
3. Do we want gamification (points/badges) or keep it serious/professional?
4. Should we support multiple Nessie accounts per user?

---

*Proposal created: January 24, 2026*
*Author: WattWise Development Team*
