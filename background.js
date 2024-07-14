const apiKey = "pateoiLGxeeOa1bbO.7d97dd01a0d5282f7e4d3b5fff9c9e10d2023d3a34b1811e1152a97182c2238d";
const baseUrl = "https://api.airtable.com/v0/app7zNJoX11DY99UA";
const config = {
    headers: {
        'Authorization': `Bearer ${apiKey}`,
    },
};

let isRunning = false;

// Utilitaires de gestion d'erreurs
function logError(error, context = "") {
    console.error(`Error ${context ? `in ${context}` : ""}:`, error);
}

// Obtenir l'onglet actif
async function getActiveTab() {
    try {
        const queryOptions = {active: true, currentWindow: true};
        const tabs = await chrome.tabs.query(queryOptions);
        if (tabs.length === 0) {
            logError("No active tab found.");
            return null;
        }
        return tabs[0];
    } catch (error) {
        logError(error, "getActiveTab");
        return null;
    }
}

// Obtenir l'URL de l'onglet actif
async function getActiveTabUrl() {
    try {
        const tab = await getActiveTab();
        if (!tab) throw new Error("No active tab found.");
        return tab.url;
    } catch (error) {
        logError(error, "getActiveTabUrl");
        return null;
    }
}

// Fetch a thumbnail for a given URL
async function getThumbnail(url) {
    try {
        const tab = await getActiveTab();
        if (!tab) throw new Error("No active tab found.");
        const response = await chrome.tabs.sendMessage(tab.id, {action: 'getThumbnail', url});
        return response.thumbnail;
    } catch (error) {
        logError(error, "getThumbnail");
        return "https://img.freepik.com/photos-gratuite/peinture-lac-montagne-montagne-arriere-plan_188544-9126.jpg";
    }
}

// Fetch data from the API and store it locally
async function fetchDataAndStore() {
    console.log("fetchDataAndStore called");
    chrome.action.setIcon({path: "public/run16.png"});

    await chrome.storage.local.set({
        pins: null,
        tags: null,
        domains: null,
        sites: null,
        groups: null,
        'data-ready': false
    });

    try {
        const endpoints = ['pins', 'tags', 'domains', 'groups', 'sites'];
        const responses = await Promise.all(endpoints.map(endpoint => fetch(`${baseUrl}/${endpoint}`, config)));

        if (responses.some(response => !response.ok)) throw new Error('One or more requests failed');

        const data = await Promise.all(responses.map(response => response.json()));

        const [pins, tags, domains, groups, sites] = data;
        console.log("Data fetched:", {pins, tags, domains, groups, sites});

        await chrome.storage.local.set({
            pins,
            tags,
            domains,
            groups,
            sites,
            'data-ready': true
        });

        console.log("Data stored in local storage");
        chrome.runtime.sendMessage({type: 'data-ready'});
        chrome.action.setIcon({path: "public/icone16.png"});
    } catch (error) {
        logError(error, "fetchDataAndStore");
    }
}

async function getDataFromStorage(key) {
    try {
        return await new Promise((resolve, reject) => {
            chrome.storage.local.get([key], result => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(result[key]);
                }
            });
        });
    } catch (error) {
        logError(error, "getDataFromStorage");
    }
}

// Handle form submission
async function handleFormSubmit(params) {
    const formData = Object.fromEntries(params.formData.entries());
    const selectedTags = formData.tags ? formData.tags.split(',') : [];
    const selectedDomains = formData.domains ? formData.domains.split(',') : [];

    let siteId;
    try {
        if (formData.new_site === "true") {
            const siteResponse = await fetch(`${baseUrl}/Sites`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
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

        const pinResponse = await fetch(`${baseUrl}/Pins`, {
            method: formData.action === "add" ? "POST" : "PATCH",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
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
                        groups: params.checkedGroups,
                        status: formData.status === "on" ? "1" : "0"
                    }
                }]
            })
        });

        return await pinResponse.json();
    } catch (error) {
        logError(error, "handleFormSubmit");
        throw error;
    }
}

// Event listeners
chrome.runtime.onStartup.addListener(fetchDataAndStore);
chrome.runtime.onInstalled.addListener(fetchDataAndStore);

// Info pins
async function getPinsData() {
    try {
        return await getDataFromStorage("pins");
    } catch (error) {
        logError(error, "getPinsData");
        throw error;
    }
}

// Info sites
async function getSitesData() {
    try {
        return await getDataFromStorage("sites");
    } catch (error) {
        logError(error, "getSitesData");
        throw error;
    }
}

function getSiteFromUrl(url) {
    let parsedURL = "";
    try {
        parsedURL = new URL(url);
        return parsedURL.hostname.replace(/^www\./, '');
    } catch {
        parsedURL.replace(/^https:\/\//, '');
        parsedURL.replace(/^http\/\//, '');
        parsedURL.replace(/^www\./, '');
        return parsedURL
    }
}

async function updateBadge(url) {
    const pinsData = await getPinsData();
    const sitesData = await getSitesData();
    const pinData = pinsData.records.filter(pin => pin.fields.url === url);
    const siteData = sitesData.records.filter(site => site.fields.site === getSiteFromUrl(url));
    if (pinData && pinData[0]?.fields?.rating) {
        chrome.action.setBadgeText({text: pinData[0].fields.rating});
        chrome.action.setBadgeBackgroundColor({color: 'gold'});
    } else {
        if (siteData && siteData[0]?.fields?.site_rating) {
            chrome.action.setBadgeText({text: siteData[0].fields.site_rating+"★"});
            chrome.action.setBadgeBackgroundColor({color: 'gold'})
        } else {
            chrome.action.setBadgeText({text: ""});
            chrome.action.setBadgeBackgroundColor({color: 'lightgrey'})
        }
    }
}

chrome.tabs.onActivated.addListener(async () => {
    if (!isRunning) {
        isRunning = true;
        const url = await getActiveTabUrl();
        if (url) {
            console.log("Active Tab URL 2:", url);
            await updateBadge(url);
        }
        isRunning = false;
    }
    console.log("chrome.tabs.onActivated");
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
    if (!isRunning && changeInfo.status === 'complete') {
        isRunning = true;
        const url = await getActiveTabUrl();
        if (url) {
            console.log("Active Tab URL 2:", url);
            await updateBadge(url);
        }
        isRunning = false;
    }
    console.log("chrome.tabs.onUpdated");
});

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    (async () => {
        try {
            switch (message.action) {
                case "test":
                    sendResponse({success: true, retour: "ok", param: message.params.p1});
                    break;
                case 'fetchDataAndStore':
                    await fetchDataAndStore();
                    sendResponse({status: 'success'});
                    break;
                case "getThumbnail":
                    const thumbnail = await getThumbnail(await getActiveTabUrl());
                    sendResponse(thumbnail);
                    break;
                case "handleFormSubmit":
                    const pinData = await handleFormSubmit(message.params);
                    sendResponse({success: true, data: pinData});
                    break;
                default:
                    sendResponse({error: "Invalid action " + message.action});
            }
        } catch (error) {
            sendResponse({success: false, error: error.message});
        }
    })();
    return true; // Indicate that the response is async
});
