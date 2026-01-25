console.log("🔴 [WattWise Content] Script loading at:", window.location.href);

function isSupportedShoppingSite() {
  const host = window.location.hostname || "";
  return host.includes("amazon.com") || host.includes("bestbuy.com");
}

function getProductTitle() {
  console.log("🔍 [WattWise Content] Starting title detection...");
  
  var selectors = [
    '#productTitle',
    'h1.a-size-large',
    'span.a-size-large[data-feature-name="title"]',
    'h2 a span',
    'span[data-component-type="s-search-result"] h2',
    '.sku-title h1',
    '[data-cy="product-title"]',
    '[role="heading"][aria-level="1"]',
    'h1',
    'h2'
  ];
  
  for (var i = 0; i < selectors.length; i++) {
    var elem = document.querySelector(selectors[i]);
    if (elem && elem.innerText && elem.innerText.trim().length > 5) {
      var text = elem.innerText.trim();
      console.log("  🟢 Found via", selectors[i], ":", text.substring(0, 60));
      return text;
    }
  }
  
  if (document.title && document.title.trim().length > 5) {
    console.log("  🟢 Using page title:", document.title.substring(0, 60));
    return document.title;
  }
  
  console.log("  🔴 No title found!");
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
      sendResponse({ success: true, message: '✓ Detected: ' + title.substring(0, 30) });
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
