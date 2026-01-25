function getTitle() {
  const title = document.querySelector('#productTitle')?.innerText || 
                document.querySelector('.sku-title h1')?.innerText || 
                document.querySelector('h1')?.innerText;
  return title ? title.trim() : null;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SCAN_PAGE') {
    const title = getTitle();
    if (title) {
      chrome.runtime.sendMessage({ type: "ANALYZE_PRODUCT", name: title });
      sendResponse({ success: true, message: '✓ Detected: ' + title.substring(0, 30) + '...' });
    } else {
      sendResponse({ success: false });
    }
  }
  return true;
});

// Auto-scan on load
const initialTitle = getTitle();
if (initialTitle) chrome.runtime.sendMessage({ type: "ANALYZE_PRODUCT", name: initialTitle });