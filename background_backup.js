chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installed");
});

// Fonction pour obtenir l'onglet actif
async function getActiveTab() {
    let queryOptions = { active: true, currentWindow: true };
    let [tab] = await chrome.tabs.query(queryOptions);
    return tab;
}

// Fonction asynchrone pour obtenir l'URL de l'onglet actif
async function getActiveTabUrl() {
    try {
        const tab = await getActiveTab();
        return tab.url;
    } catch (error) {
        console.error("getActiveTabUrl error: " + error);
        return null;
    }
}

// Fonction pour envoyer un message au Content Script pour obtenir la miniature
async function getThumbnail(url) {
    try {
        //const tab = await getActiveTab();
        //const response = await chrome.tabs.sendMessage(tab.id, { action: 'getThumbnail', url: url });
        //return response.thumbnail;
        //return "https://img.freepik.com/free-vector/colorful-pastel-poly-background_53876-62618.jpg";
        return "https://img.freepik.com/photos-gratuite/peinture-lac-montagne-montagne-arriere-plan_188544-9126.jpg";

    } catch (error) {
        console.error("Error fetching thumbnail:", error);
        return "https://img.freepik.com/photos-gratuite/peinture-lac-montagne-montagne-arriere-plan_188544-9126.jpg";
    }
}

// Fonction pour récupérer les données de l'API Airtable
async function fetchData(endpoint, headers) {
    const apiUrlBase = "https://api.airtable.com/v0/app7zNJoX11DY99UA/";
    try {
        const response = await fetch(apiUrlBase + endpoint, { headers });
        return await response.json();
    } catch (error) {
        console.error(`Error fetching ${endpoint}:`, error);
        throw error;
    }
}

// Écouteur de message principal
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const token = "pateoiLGxeeOa1bbO.7d97dd01a0d5282f7e4d3b5fff9c9e10d2023d3a34b1811e1152a97182c2238d";
    const headers = new Headers({
        "Authorization": `Bearer ${token}`
    });

    async function handleMessage() {
        const url = await getActiveTabUrl();
        if (!url && message.action !== "handleFormSubmit") {
            sendResponse({ error: "Unable to get active tab URL." });
            return;
        }

        switch (message.action) {
            case "test":
                sendResponse({ success: true, retour: "ok", param: message.params.p1 });
                break;
            case "getThumbnail":
                try {
                    const thumbnail = await getThumbnail(url);
                    sendResponse(thumbnail);
                } catch (error) {
                    sendResponse({ error: error.message });
                }
                break;
            case "getPinData":
                try {
                    const filterField = 'url';
                    const filterValue = "^" + message.url.replace(/[|\\{}()[\]^$+*?.\/]/g, '\\$&') + "$";
                    const filterFormula = `REGEX_MATCH({${filterField}}, "${filterValue}")`;
                    const pinData = await fetchData(`pins?filterByFormula=${encodeURIComponent(filterFormula)}`, headers);
                    sendResponse(pinData);
                } catch (error) {
                    sendResponse({ error: error.message });
                }
                break;
            case "getSiteData":
                try {
                    const siteData = await fetchData(`Sites?filterByFormula=AND({site}='${message.site}')`, headers);
                    sendResponse(siteData);
                } catch (error) {
                    sendResponse({ error: error.message });
                }
                break;
            case "getData":
                try {
                    const siteFilterFormula = `AND({site}='${message.site}')`;
                    const pinFilterField = 'url';
                    const pinFilterValue = "^" + message.url.replace(/[|\\{}()[\]^$+*?.\/]/g, '\\$&') + "$";
                    const pinFilterFormula = `REGEX_MATCH({${pinFilterField}}, "${pinFilterValue}")`;

                    const [siteData, pinData, domainData] = await Promise.all([
                        fetchData(`Sites?filterByFormula=${encodeURIComponent(siteFilterFormula)}`, headers),
                        fetchData(`pins?filterByFormula=${encodeURIComponent(pinFilterFormula)}`, headers),
                        fetchData("domains", headers)
                    ]);

                    if (pinData.length > 0 && pinData[0].fields && pinData[0].fields.domain) {
                        const domain = pinData[0].fields.domain;

                        const [tagsData, groupsData] = await Promise.all([
                            fetchData(`tags?filterByFormula=AND({domain}='${domain}')`, headers),
                            fetchData(`groups?filterByFormula=AND({domain}='${domain}')`, headers)
                        ]);

                        sendResponse({ siteData, pinData, domainData, tagsData, groupsData });
                    } else {
                        sendResponse({ siteData, pinData, domainData });
                    }
                } catch (error) {
                    sendResponse({ error: error.message });
                }
                break;
            case "handleFormSubmit":
                try {
                    const params = message.params;
                    const formData = Object.fromEntries(params.formData.entries());
                    const selectedTags = formData.tags ? formData.tags.split(',') : [];
                    const selectedDomains = formData.domains ? formData.domains.split(',') : [];

                    let siteId;

                    if (formData.new_site === "true") {
                        const siteResponse = await fetch("https://api.airtable.com/v0/app7zNJoX11DY99UA/Sites", {
                            method: "POST",
                            headers: {
                                "Authorization": `Bearer ${token}`,
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                records: [{
                                    fields: {
                                        site: formData.site,
                                        site_rating: formData.site_rating || "0",
                                        domain: selectedDomains
                                    }
                                }]
                            })
                        });

                        const siteData = await siteResponse.json();
                        siteId = siteData.records[0].id;
                    } else {
                        siteId = formData.site_id;
                    }

                    const pinResponse = await fetch("https://api.airtable.com/v0/app7zNJoX11DY99UA/Pins", {
                        method: formData.action === "add" ? "POST" : "PATCH",
                        headers: {
                            "Authorization": `Bearer ${token}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            records: [{
                                id: formData.action === "update" ? formData.pin_id : undefined,
                                fields: {
                                    name: formData.title,
                                    rating: formData.rating,
                                    url: formData.url,
                                    site: [siteId],
                                    description: formData.comment || "",
                                    img_url: formData.img_url,
                                    tags: selectedTags,
                                    domain: selectedDomains,
                                    groups: message.checkedGroups,
                                    status: formData.status === "on" ? "1" : "0"
                                }
                            }]
                        })
                    });

                    const pinData = await pinResponse.json();
                    sendResponse({ success: true, data: pinData });
                } catch (error) {
                    sendResponse({ success: false, error: error.message });
                }
                break;
            default:
                sendResponse({ error: "Invalid action" });
        }

        return true; // Indiquer que la réponse sera envoyée de manière asynchrone
    }

    handleMessage();
    return true; // Indiquer que la réponse sera envoyée de manière asynchrone
});

// changement d'onglet actif
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    console.log("onActivated ------------------");
    const url = await getActiveTabUrl();
    if (url) {
        console.log("Active Tab URL: " + url);
    }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    console.log("onUpdated ------------------");
    if (changeInfo.status === 'complete') {
        const url = await getActiveTabUrl();
        if (url) {
            console.log("Active Tab URL: " + url);
        }
    }
});
