#!/bin/bash
# Setup script to configure the extension with your API credentials

# Read from .env.local
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
    
    echo "✓ Loaded API key from .env.local"
    echo "API Key: ${NESSIE_API_KEY:0:10}..."
    
    # Update extension/background.js with the API key
    # (This is just for local development)
    echo "To use these credentials in the extension:"
    echo "1. Open the extension settings popup in Chrome"
    echo "2. Enter the API key: ${NESSIE_API_KEY}"
    echo "3. Enter the Customer ID: ${NESSIE_CUSTOMER_ID}"
    echo "4. Click Save Settings"
else
    echo "❌ .env.local not found"
fi
