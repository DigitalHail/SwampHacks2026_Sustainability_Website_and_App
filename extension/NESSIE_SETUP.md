# WattWise - Nessie API Account Setup Guide

## Understanding the Nessie API Structure

### API Endpoints Used:

```
GET /accounts?key={apiKey}
  → Returns ALL accounts for your API key
  → Each account has: _id, type, nickname, balance

POST /accounts/{accountId}/transfers?key={apiKey}
  → Creates a transfer FROM this account TO another
  → Requires: payee_id, amount, description, transaction_date

GET /customers?key={apiKey}
  → Returns all customers (usually empty in demo)
```

## How to Get Account IDs

### Option 1: Use Extension Auto-Discovery (Recommended) ✅

1. **Reload the extension** in Chrome
2. **Open WattWise popup** → Settings
3. **Click "Test API Connection"**
4. The extension will:
   - Fetch all your accounts from Nessie
   - Display them with their types and IDs
   - **Auto-fill** Main Account ID and Savings Account ID

### Option 2: Manual Lookup

1. Visit https://www.nessieisreal.com
2. Log into your developer account
3. Go to **Accounts** section
4. Copy the account IDs you want to use

## Account ID Format

Nessie account IDs look like:
```
"55d60614355f70e60c71a3fd"  (MongoDB ObjectID format)
```

## How the Sustainability Tax Works

### Flow Diagram:

```
User shops on Amazon
    ↓
Sees "plastic water bottle"
    ↓
WattWise detects keyword "plastic"
    ↓
Extension sends message to background.js
    ↓
background.js retrieves stored account IDs
    ↓
performNessieTransfer() is called
    ↓
API Request: POST /accounts/{mainAccountId}/transfers
    ├── payee_id: savingsAccountId
    ├── amount: 1.50
    └── description: "WattWise Sustainability Offset"
    ↓
$1.50 transferred from Main → Sustainability Savings
    ↓
Arduino R4 LED Matrix lights up 🟢
```

## Implementation Details

### Background.js Key Functions:

```javascript
// Retrieves all available accounts
testNessieAPI()
  → Returns list of accounts with IDs

// Performs the actual transfer
performNessieTransfer(apiKey, mainAccountId, savingsAccountId, amount)
  → Makes POST request to Nessie API
  → Transfers money between accounts
```

### Popup.js Key Features:

```javascript
// Auto-discovers accounts from API
// Auto-fills the first two accounts
// Saves to chrome.storage.local
```

## What Account Types Exist in Nessie?

Common account types:
- **"Checking"** - Main account (good for mainAccount ID)
- **"Savings"** - Savings account (good for savingsAccount ID)
- **"Credit Card"** - Credit card account
- **"Money Market"** - Money market account

## Testing Your Setup

1. **Fill in all fields:**
   - API Key: `99864d500fa931ec644d3a5d865a866c`
   - Main Account ID: (from auto-discovery or manual lookup)
   - Savings Account ID: (from auto-discovery or manual lookup)

2. **Click "Save Settings"** ✓

3. **Test the transfer:**
   - Go to Amazon
   - Search for "plastic water bottle"
   - Click on a product with "plastic" in the name
   - Extension should trigger transfer automatically

4. **Verify in Nessie:**
   - Log into nessieisreal.com
   - Check both accounts
   - Main account should be $1.50 less
   - Savings account should be $1.50 more

## Troubleshooting

### "Missing API configuration"
→ Make sure all three fields are filled: API key, main account ID, savings account ID

### "API returned 404"
→ Account ID might be invalid. Try "Test API Connection" again to get correct IDs.

### "Transfer failed: 403"
→ You may not have permission to transfer from this account. Check account type and permissions.

### No accounts showing?
→ Create accounts in Nessie dashboard first at https://www.nessieisreal.com

## API Documentation References

- Full Docs: http://api.nessieisreal.com/documentation
- Account Endpoint: GET /accounts?key={apiKey}
- Transfer Endpoint: POST /accounts/{id}/transfers?key={apiKey}
- GitHub Repo: https://github.com/nessieisreal
