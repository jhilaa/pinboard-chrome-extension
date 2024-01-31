
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete') {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            var activeTab = tabs[0];
            var url = activeTab.url;
            console.log("Current URL in active tab: " + url);

            // Envoie un message à la pop-up avec l'URL de l'onglet complètement chargé
            chrome.runtime.sendMessage({ action: "updateUrl", url: url });
        });
    }
});


chrome.tabs.onActivated.addListener(function(activeInfo) {
    // activeInfo contient des informations sur l'onglet actif
    var tabId = activeInfo.tabId;

    chrome.tabs.get(tabId, function(tab) {
        // tab contient des informations sur l'onglet actuel
        var url = tab.url;
        console.log("Current URL in active tab: " + url);

        // Envoie un message à la pop-up avec l'URL de l'onglet actif
        chrome.runtime.sendMessage({ action: "updateUrl", url: url });
    });
});



/*
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.url) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      var activeTab = tabs[0];
      var url = activeTab.url;
      chrome.runtime.sendMessage({ action: "updateUrl", url: url });
    });
  }
});
 */
