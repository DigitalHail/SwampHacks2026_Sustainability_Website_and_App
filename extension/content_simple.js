// Ultra-simple version to test if content script loads at all
console.log("🟢 WATWISE LOADED - checking location:", window.location.href);

// Try to get the page title immediately
setTimeout(() => {
  console.log("📄 Page title:", document.title);
  console.log("🔗 URL:", window.location.href);
  
  // Get first h1
  const h1 = document.querySelector('h1');
  console.log("🏷️ First H1:", h1?.innerText?.substring(0, 100) || "NONE FOUND");
  
  // Send message to background
  chrome.runtime.sendMessage({
    type: "CONTENT_LOADED",
    title: document.title,
    url: window.location.href
  }, (response) => {
    console.log("✅ Message response:", response);
  });
}, 500);
