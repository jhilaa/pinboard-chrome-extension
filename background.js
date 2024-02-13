

chrome.tabs.onUpdated.addListener(function(activeInfo, tabInfo) {
    if (activeInfo.status === 'complete') {
        var tabId = activeInfo.tabId;

        chrome.tabs.get(tabId, function(tab) {
            var url = tab.url;
            console.log("2 Current URL in active tab: " + url);

            // Envoie un message à la pop-up avec l'URL de l'onglet actif
            chrome.runtime.sendMessage({ action: "updateUrl", tab: tab });
        });
    }
});



chrome.tabs.onActivated.addListener(function(activeInfo) {
    // activeInfo contient des informations sur l'onglet actif
    var tabId = activeInfo.tabId;

    chrome.tabs.get(tabId, function(tab) {
        // tab contient des informations sur l'onglet actuel
        var url = tab.url;
        console.log("1 Current URL in active tab: " + url);

        // Envoie un message à la pop-up avec l'URL de l'onglet actif
        //chrome.runtime.sendMessage({ action: "updateUrl", url: url });
        chrome.runtime.sendMessage({ action: "updateUrl", tab: tab });
    });
});

chrome.webNavigation.onCommitted.addListener(function(activeInfo) {
    var tabId = activeInfo.tabId;

    chrome.tabs.get(tabId, function(tab) {
        // tab contient des informations sur l'onglet actuel
        var url = tab.url;
        console.log("1 Current URL in active tab: " + url);

        // Envoie un message à la pop-up avec l'URL de l'onglet actif
        //chrome.runtime.sendMessage({ action: "updateUrl", url: url });
        chrome.runtime.sendMessage({ action: "updateUrl", tab: tab });
    });
});

/*
chrome.webNavigation.onCommitted.addListener(function(details) {
    if (details.frameId === 0) {  // Assurez-vous que l'événement concerne le cadre principal
        var tabId = details.tabId;

        chrome.tabs.get(tabId, function(tab) {
            var url = details.url;  // Utilisez details.url au lieu de tab.url pour obtenir l'URL actuelle

            console.log("URL entrée manuellement dans la barre d'adresse: " + url);

            // Envoie un message à l'arrière-plan avec l'URL de l'onglet actif
            chrome.runtime.sendMessage({ action: "updateUrl", tab: tab });
        });
    }
});

 */



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
