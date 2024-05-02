const token = "pateoiLGxeeOa1bbO.7d97dd01a0d5282f7e4d3b5fff9c9e10d2023d3a34b1811e1152a97182c2238d"; // Replace with your Bearer Token
    const headers = new Headers({
        "Authorization": `Bearer ${token}`
    });

let panelUpdated = false;
chrome.tabs.onUpdated.addListener(function (activeInfo, tabInfo) {
    console.log("## chrome.tabs.onUpdated ############ ")
    if (activeInfo.status === 'complete' && !panelUpdated) {
        var tabId = activeInfo.tabId;

        chrome.tabs.get(tabId, function (tab) {
            var url = tab.url;
            console.log("2 Current URL in active tab: " + url);

            // Envoie un message à la pop-up avec l'URL de l'onglet actif
            chrome.runtime.sendMessage({action: "updateUrl", tab: tab});
            panelUpdated = true;
        });
    }
});


chrome.tabs.onActivated.addListener(async function (activeInfo) {
    // activeInfo contient des informations sur l'onglet actif
    console.log("## chrome.tabs.onActivated ############ ")
    var tabId = activeInfo.tabId;

    chrome.tabs.get(tabId, async function (tab) {
        // tab contient des informations sur l'onglet actuel
        var url = tab.url;
        console.log("1 Current URL in active tab: " + url);

        // Envoie un message à la pop-up avec l'URL de l'onglet actif
        //chrome.runtime.sendMessage({ action: "updateUrl", url: url });
        chrome.runtime.sendMessage({action: "updateUrl", tab: tab});

		//getPinData(url);
    });
        setIconRatingScore();
    panelUpdated = true;
});

chrome.webNavigation.onCommitted.addListener(async function (activeInfo) {
    if (!panelUpdated) {
        var tabId = activeInfo.tabId;
        chrome.tabs.get(tabId, function (tab) {
            // tab contient des informations sur l'onglet actuel
            var url = tab.url;
            console.log("1 Current URL in active tab: " + url);

            // Envoie un message à la pop-up avec l'URL de l'onglet actif
            //chrome.runtime.sendMessage({ action: "updateUrl", url: url });
            chrome.runtime.sendMessage({action: "updateUrl", tab: tab});
			const pinData = getPinData(url);
			//processPinData(pinData)
            setIconRatingScore();
        });
    }
});


    async function getCurrentTabData() {
        return new Promise((resolve, reject) => {
            const queryOptions = {active: true, currentWindow: true};
            chrome.tabs.query(queryOptions, (tabs) => {
                currentTab = tabs[0];
                if (currentTab) {
                    resolve(currentTab);
                } else {
                    reject(new Error("No active tab found."));
                }
            });
        });
    };

// Fonction pour effectuer la requête sur Airtable
async function getPinData(url) {
        try {
            const filterField = 'url';
            const filterValue = "^" + url.replace(/[|\\{}()[\]^$+*?.\/]/g, '\\$&') + "$";
            const filterFormula = `REGEX_MATCH({${filterField}}, "${filterValue}" )`;
            const apiUrl = `https://api.airtable.com/v0/app7zNJoX11DY99UA/pins?filterByFormula=${encodeURIComponent(filterFormula)}`;
            const response = await fetch(apiUrl, {headers});
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("Error fetching data from the database:", error);
            throw error;
        }
    }



/*
async function processPinData (pinData) {
	const n = pinData.records.length
		if (n >= 10) {
	//chrome.action.setBadgeText({text:"★"});
		chrome.action.setBadgeText({text:n});}
		else {chrome.action.setBadgeText({text:"9+"});}
	// set badge color
	chrome.action.setBadgeBackgroundColor({color: '#ffee35'});
	chrome.action.setBadgeTextColor({color: 'black'});
}
*/


	// Écouter les événements de changement de page
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    // Vérifier si la page a fini de charger
    if (changeInfo.status === 'complete') {
        setIconRatingScore();
    }
});

function setIconRatingScore() {
    // Effectuer la requête sur Airtable
    //-----------------------------
    const r = Math.floor(Math.random() * 10)
    const c = r.toString();
    const t = (r <10 ? c : c+"+");

    // listen to event for changes from saved data in storage
    chrome.action.setBadgeText({text:t});
    // set badge color
    chrome.action.setBadgeBackgroundColor({color: '#9688F1'});

}




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
