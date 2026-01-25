// Function to scan and analyze products on the page
function scanForProducts() {
  // Try multiple selectors for different sites
  let productTitle = null;
  
  // Amazon
  productTitle = productTitle || document.querySelector('#productTitle')?.innerText;
  productTitle = productTitle || document.querySelector('h1.a-size-large')?.innerText;
  
  // Best Buy
  productTitle = productTitle || document.querySelector('.sku-title h1')?.innerText;
  productTitle = productTitle || document.querySelector('[data-cy="product-title"]')?.innerText;
  
  // Generic selectors
  productTitle = productTitle || document.querySelector('[role="heading"][aria-level="1"]')?.innerText;
  productTitle = productTitle || document.querySelector('h1')?.innerText;
  productTitle = productTitle || document.querySelector('h2')?.innerText;
  
  // Last resort: check page title
  productTitle = productTitle || document.title;

  if (productTitle && productTitle.trim().length > 0) {
    console.log("🟢 WattWise detected product:", productTitle.trim());

    // Send the product name to the background script
    chrome.runtime.sendMessage({
      type: "ANALYZE_PRODUCT",
      name: productTitle.trim(),
      url: window.location.href
    }, (response) => {
      if (response?.success) {
        console.log("🟢 Product analyzed:", response.message);
      }
    }).catch(error => {
      console.log("Error sending message:", error);
    });
  } else {
    console.log("🟡 WattWise: No product detected on this page");
  }
}

console.log("🟢 WattWise content script loaded on:", window.location.href);

// Scan on initial page load
scanForProducts();

// Also scan when DOM changes (for dynamic content)
const observer = new MutationObserver((mutations) => {
  // Debounce the scan to avoid too many checks
  clearTimeout(observer.scanTimeout);
  observer.scanTimeout = setTimeout(scanForProducts, 1000);
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true
});

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SCAN_PAGE') {
    console.log("🔵 Popup requested page scan");
    let productTitle = null;
    
    // Try multiple selectors
    productTitle = productTitle || document.querySelector('#productTitle')?.innerText;
    productTitle = productTitle || document.querySelector('h1.a-size-large')?.innerText;
    productTitle = productTitle || document.querySelector('.sku-title h1')?.innerText;
    productTitle = productTitle || document.querySelector('[data-cy="product-title"]')?.innerText;
    productTitle = productTitle || document.querySelector('[role="heading"][aria-level="1"]')?.innerText;
    productTitle = productTitle || document.querySelector('h1')?.innerText;
    productTitle = productTitle || document.querySelector('h2')?.innerText;
    productTitle = productTitle || document.title;
    
    if (productTitle && productTitle.trim().length > 0) {
      const message = '✓ Product detected: ' + productTitle.trim();
      console.log("🟢", message);
      sendResponse({ success: true, message: message });
    } else {
      console.log("🟡 No product on this page");
      sendResponse({ success: true, message: 'No product on this page' });
    }
  }
});