#!/bin/bash
# WattWise Nessie API Setup Script
# Creates a customer with Checking and Sustainability Savings accounts

API_KEY="99864d500fa931ec644d3a5d865a866c"
BASE_URL="http://api.nessieisreal.com"

echo "🟢 WattWise Nessie Setup Script"
echo "================================"
echo ""

# STEP 1: Check for existing customers
echo "STEP 1: Checking for existing customers..."
echo ""

CUSTOMERS_RESPONSE=$(curl -s "$BASE_URL/customers?key=$API_KEY")
echo "Response: $CUSTOMERS_RESPONSE"
echo ""

# Parse response - if it's an empty array, no customers exist
if [ "$CUSTOMERS_RESPONSE" == "[]" ]; then
    echo "✓ No existing customers found. Creating new customer..."
    echo ""
    
    # STEP 2: Create a new customer
    echo "STEP 2: Creating new customer..."
    echo ""
    
    CUSTOMER_DATA='{"first_name":"WattWise","last_name":"User","address":{"street_number":"123","street_name":"Eco Street","city":"Green City","state":"FL","zip":"12345"}}'
    
    CUSTOMER_RESPONSE=$(curl -s -X POST "$BASE_URL/customers?key=$API_KEY" \
      -H "Content-Type: application/json" \
      -d "$CUSTOMER_DATA")
    
    echo "Customer Response: $CUSTOMER_RESPONSE"
    echo ""
    
    # Extract customer ID (MongoDB ObjectId format)
    CUSTOMER_ID=$(echo "$CUSTOMER_RESPONSE" | grep -o '"_id":"[a-f0-9]*"' | head -1 | cut -d'"' -f4)
    
    if [ -z "$CUSTOMER_ID" ]; then
        echo "❌ Failed to extract customer ID"
        exit 1
    fi
    
    echo "✓ Customer created!"
    echo "  Customer ID: $CUSTOMER_ID"
    echo ""
else
    echo "✓ Existing customers found!"
    echo "Response: $CUSTOMERS_RESPONSE"
    echo ""
    
    # Extract first customer ID
    CUSTOMER_ID=$(echo "$CUSTOMERS_RESPONSE" | grep -o '"_id":"[a-f0-9]*"' | head -1 | cut -d'"' -f4)
    echo "Using customer ID: $CUSTOMER_ID"
    echo ""
fi

# STEP 3: Create Checking Account
echo "STEP 3: Creating Checking Account..."
echo ""

CHECKING_DATA='{"type":"Checking","nickname":"Main Checking","balance":1000,"rewards":0}'

CHECKING_RESPONSE=$(curl -s -X POST "$BASE_URL/customers/$CUSTOMER_ID/accounts?key=$API_KEY" \
  -H "Content-Type: application/json" \
  -d "$CHECKING_DATA")

echo "Checking Response: $CHECKING_RESPONSE"
echo ""

CHECKING_ID=$(echo "$CHECKING_RESPONSE" | grep -o '"_id":"[a-f0-9]*"' | head -1 | cut -d'"' -f4)

if [ -z "$CHECKING_ID" ]; then
    echo "❌ Failed to create checking account"
    exit 1
fi

echo "✓ Checking account created!"
echo "  Account ID: $CHECKING_ID"
echo ""

# STEP 4: Create Sustainability Savings Account
echo "STEP 4: Creating Sustainability Savings Account..."
echo ""

SAVINGS_DATA='{"type":"Savings","nickname":"Sustainability Savings","balance":0,"rewards":0}'

SAVINGS_RESPONSE=$(curl -s -X POST "$BASE_URL/customers/$CUSTOMER_ID/accounts?key=$API_KEY" \
  -H "Content-Type: application/json" \
  -d "$SAVINGS_DATA")

echo "Savings Response: $SAVINGS_RESPONSE"
echo ""

SAVINGS_ID=$(echo "$SAVINGS_RESPONSE" | grep -o '"_id":"[a-f0-9]*"' | head -1 | cut -d'"' -f4)

if [ -z "$SAVINGS_ID" ]; then
    echo "❌ Failed to create savings account"
    exit 1
fi

echo "✓ Savings account created!"
echo "  Account ID: $SAVINGS_ID"
echo ""

# SUMMARY
echo "================================"
echo "✓ SETUP COMPLETE!"
echo "================================"
echo ""
echo "Copy these IDs to your WattWise extension:"
echo ""
echo "  API Key: $API_KEY"
echo "  Main Checking Account ID: $CHECKING_ID"
echo "  Sustainability Savings Account ID: $SAVINGS_ID"
echo ""
echo "How to use in the extension:"
echo "1. Click the WattWise extension icon"
echo "2. Go to Settings"
echo "3. Fill in all three fields with the IDs above"
echo "4. Click 'Save Settings'"
echo "5. Click 'Test API Connection'"
echo ""
