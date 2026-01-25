console.log("🔴 [WattWise Content] Script loading at:", window.location.href);

function isSupportedShoppingSite() {
  const host = window.location.hostname || "";
  return host.includes("amazon.com") || host.includes("bestbuy.com");
}

function getProductTitle() {
  console.log("🔍 [WattWise Content] Starting title detection...");
  
  // Common navigation/non-product text to filter out
  const navigationKeywords = [
    'skip to',
    'go to',
    'back',
    'next',
    'previous',
    'home',
    'menu',
    'cart',
    'sign in',
    'account',
    'help',
    'search'
  ];
  
  // Selectors ordered by specificity (most specific first)
  var selectors = [
    // Amazon-specific high-confidence selectors
    '#productTitle',
    'span.a-size-large[data-feature-name="title"]',
    'h1#productTitle',
    'span[id*="title"]',
    
    // Best Buy selectors
    '[data-cy="product-title"]',
    '.sku-title h1',
    
    // Generic but specific enough
    'h1.a-size-large',
    'h1.a-size-extra-large',
    'h1[role="heading"]',
    'h2 a span',
    
    // Last resort (very generic)
    '[role="heading"][aria-level="1"]'
  ];
  
  for (var i = 0; i < selectors.length; i++) {
    var elem = document.querySelector(selectors[i]);
    if (elem && elem.innerText && elem.innerText.trim().length > 8) {  // Require at least 8 chars
      var text = elem.innerText.trim();
      
      // Filter out navigation text
      var isNavigation = navigationKeywords.some(keyword => 
        text.toLowerCase().includes(keyword)
      );
      
      if (isNavigation) {
        console.log("  🟡 Skipping navigation text:", text.substring(0, 40));
        continue;
      }
      
      // Filter out very short titles (likely not product titles)
      if (text.length < 8) {
        console.log("  🟡 Skipping too-short text:", text);
        continue;
      }
      
      console.log("  🟢 Found via", selectors[i], ":", text.substring(0, 60));
      return text;
    }
  }
  
  // Fallback to page title only if it's substantial
  if (document.title && document.title.trim().length > 15) {
    var titleText = document.title.trim();
    // Filter title too
    var isNavigation = navigationKeywords.some(keyword => 
      titleText.toLowerCase().includes(keyword)
    );
    
    if (!isNavigation) {
      console.log("  🟢 Using page title:", titleText.substring(0, 60));
      return titleText;
    }
  }
  
  console.log("  🔴 No product title found!");
  return null;
}

console.log("🟢 [WattWise Content] Script ready");

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log("📬 Message from popup:", request.type);
  
  if (request.type === 'SCAN_PAGE') {
    if (!isSupportedShoppingSite()) {
      console.log("🟡 Not a supported shopping site:", window.location.hostname);
      sendResponse({ success: false, message: 'Not a shopping page' });
      return true;
    }
    var title = getProductTitle();
    if (title) {
      console.log("🟢 Sending:", title.substring(0, 30));
      sendResponse({ success: true, message: '✅ Detected: ' + title.substring(0, 30) });
      chrome.runtime.sendMessage({ type: "ANALYZE_PRODUCT", name: title });
    } else {
      sendResponse({ success: false, message: 'No product' });
    }
  }
  return true;
});

if (isSupportedShoppingSite()) {
  var title = getProductTitle();
  if (title) {
    console.log("🟢 Auto-detected:", title.substring(0, 30));
    chrome.runtime.sendMessage({ type: "ANALYZE_PRODUCT", name: title });
  }
}
