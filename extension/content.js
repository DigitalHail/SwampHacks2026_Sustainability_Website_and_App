function getTitle() {
  var elem1 = document.querySelector('#productTitle');
  var elem2 = document.querySelector('.sku-title h1');
  var elem3 = document.querySelector('h1');
  
  var title = (elem1 && elem1.innerText) || (elem2 && elem2.innerText) || (elem3 && elem3.innerText);
  return title ? title.trim() : null;
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.type === 'SCAN_PAGE') {
    var title = getTitle();
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
var initialTitle = getTitle();
if (initialTitle) chrome.runtime.sendMessage({ type: "ANALYZE_PRODUCT", name: initialTitle });