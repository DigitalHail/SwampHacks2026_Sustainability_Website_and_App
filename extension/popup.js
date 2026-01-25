var settingsKeys = ["nessieApiKey", "geminiApiKey", "climatiqApiKey", "mainAccount", "savingsAccount"];

document.addEventListener('DOMContentLoaded', function() {
  console.log('[WattWise] Popup loaded');
  
  // Load stored settings
  chrome.storage.local.get(settingsKeys, function(data) {
    settingsKeys.forEach(function(key) {
      var elem = document.getElementById(key);
      if (elem && data[key]) {
        elem.value = data[key];
      }
    });
  });

  // Settings toggle
  var toggleBtn = document.getElementById('toggleSettings');
  if (toggleBtn) {
    toggleBtn.onclick = function() {
      var panel = document.getElementById('settingsPanel');
      if (panel) panel.classList.toggle('hidden');
    };
  }

  // Save button
  var saveBtn = document.getElementById('saveBtn');
  if (saveBtn) {
    saveBtn.onclick = function() {
      var vals = {};
      settingsKeys.forEach(function(key) {
        var elem = document.getElementById(key);
        if (elem) vals[key] = elem.value;
      });
      
      chrome.storage.local.set(vals, function() {
        var status = document.getElementById('connectionStatus');
        if (status) {
          status.innerText = '✅ Saved!';
          setTimeout(function() { status.innerText = ''; }, 2000);
        }
      });
    };
  }

  // Test button
  var testBtn = document.getElementById('testBtn');
  if (testBtn) {
    testBtn.onclick = function() {
      var status = document.getElementById('connectionStatus');
      var nessieKeyElem = document.getElementById('nessieApiKey');
      var mainAccElem = document.getElementById('mainAccount');
      
      if (!nessieKeyElem || !mainAccElem) {
        if (status) status.innerText = '❌ Settings elements not found';
        return;
      }
      
      var nessieKey = nessieKeyElem.value;
      var mainAcc = mainAccElem.value;
      
      if (!nessieKey || !mainAcc) {
        if (status) status.innerText = '❌ Add API key and account ID first';
        return;
      }
      
      if (status) status.innerText = '🔄 Testing...';
      
      fetch('http://api.nessieisreal.com/accounts/' + mainAcc + '?key=' + nessieKey)
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (status) {
            status.innerText = '✅ Connected!';
            setTimeout(function() { status.innerText = ''; }, 2000);
          }
        })
        .catch(function(e) {
          if (status) {
            status.innerText = '❌ Error: ' + e.message;
            setTimeout(function() { status.innerText = ''; }, 2000);
          }
        });
    };
  }

  // Balance button
  var checkBalBtn = document.getElementById('checkBalance');
  if (checkBalBtn) {
    checkBalBtn.onclick = function() {
      var status = document.getElementById('connectionStatus');
      if (status) status.innerText = '🔄 Loading...';
      
      chrome.runtime.sendMessage({type: 'GET_ACCOUNT_DETAILS'}, function(res) {
        if (res && res.success) {
          var mainBal = document.getElementById('mainBalance');
          var savBal = document.getElementById('savingsBalance');
          var balSection = document.getElementById('balanceSection');
          
          if (mainBal) mainBal.innerText = res.mainBalance.toFixed(2);
          if (savBal) savBal.innerText = res.savingsBalance.toFixed(2);
          if (balSection) balSection.style.display = 'block';
          if (status) {
            status.innerText = '✅ Updated!';
            setTimeout(function() { status.innerText = ''; }, 2000);
          }
        } else {
          if (status) {
            status.innerText = '❌ Failed to get balance';
            setTimeout(function() { status.innerText = ''; }, 2000);
          }
        }
      });
    };
  }

  // Scan page for product
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {type: 'SCAN_PAGE'}, function(res) {
        if (chrome.runtime.lastError) {
          console.log('[WattWise] Content script not ready');
          return;
        }
        
        if (res && res.success) {
          var statusDiv = document.getElementById('status');
          if (statusDiv) statusDiv.innerText = '✓ ' + res.message;
          
          // Fetch and display impact
          setTimeout(function() {
            chrome.storage.local.get(['lastProductAnalysis'], function(d) {
              if (d.lastProductAnalysis) {
                var a = d.lastProductAnalysis;
                var msg = (a.isUnsustainable ? '🔴 Unsustainable' : '🟢 Sustainable') + '<br>';
                if (a.score) msg += 'Score: ' + a.score + '/100<br>';
                msg += a.reason + '<br>';
                if (a.taxAmount) msg += '💰 Tax: $' + a.taxAmount;
                
                var impMsg = document.getElementById('impactMessage');
                var sec = document.getElementById('impactSection');
                
                if (impMsg) impMsg.innerHTML = msg;
                if (sec) {
                  sec.style.display = 'block';
                  sec.style.borderColor = a.isUnsustainable ? '#f44336' : '#4CAF50';
                  sec.style.backgroundColor = a.isUnsustainable ? '#ffebee' : '#f0f8f0';
                }
              }
            });
          }, 500);
        } else {
          var statusDiv = document.getElementById('status');
          if (statusDiv) statusDiv.innerText = '⚠️ No product detected';
        }
      });
    }
  });
});