
//TODO passer par l'api render
const apiKey = "pateoiLGxeeOa1bbO.7d97dd01a0d5282f7e4d3b5fff9c9e10d2023d3a34b1811e1152a97182c2238d";
const baseUrl = "https://api.airtable.com/v0/app7zNJoX11DY99UA";
const config = {
    headers: {
        'Authorization': `Bearer ${apiKey}`,
    },
};

let isRunning = false;


// Get the active tab
async function getActiveTab() {
    try {
        let queryOptions = {active: true, currentWindow: true};
        let tabs = await chrome.tabs.query(queryOptions);
        if (tabs.length === 0) {
            console.error("No active tab found.");
            return null;
        }
        return tabs[0];
    } catch (error) {
        console.error("Error in getActiveTab:", error);
        return null;
    }
}

// Get the active tab's URL
async function getActiveTabUrl() {
    try {
        const tab = await getActiveTab();
        if (!tab) {
            throw new Error("No active tab found.");
        }
        return tab.url;
    } catch (error) {
        console.error("getActiveTabUrl error:", error);
        return null;
    }
}

// Fetch a thumbnail for a given URL
async function getThumbnail(url) {
    try {
        const tab = await getActiveTab();
        if (!tab) {
            throw new Error("No active tab found.");
        }
        const response = await chrome.tabs.sendMessage(tab.id, {action: 'getThumbnail', url: url});
        return response.thumbnail;
    } catch (error) {
        console.error("Error fetching thumbnail:", error);
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
    console.log("Initial storage values set");

    try {
        const [pinResponse, tagResponse, domainResponse, groupResponse, siteResponse] = await Promise.all([
            fetch(`${baseUrl}/pins`, config),
            fetch(`${baseUrl}/tags`, config),
            fetch(`${baseUrl}/domains`, config),
            fetch(`${baseUrl}/groups`, config),
            fetch(`${baseUrl}/sites`, config),
        ]);

        if (!pinResponse.ok || !tagResponse.ok || !domainResponse.ok || !groupResponse.ok || !siteResponse.ok) {
            throw new Error('One or more requests failed');
        }

        const [pinData, tagData, domainData, groupData, siteData] = await Promise.all([
            pinResponse.json(),
            tagResponse.json(),
            domainResponse.json(),
            groupResponse.json(),
            siteResponse.json()
        ]);

        console.log("Data fetched:", {pinData, tagData, domainData, groupData, siteData});

        await chrome.storage.local.set({
            pins: pinData,
            tags: tagData,
            domains: domainData,
            sites: siteData,
            groups: groupData,
            'data-ready': true
        });

        console.log("Data stored in local storage");
        chrome.runtime.sendMessage({type: 'data-ready'});
        chrome.action.setIcon({path: "public/icone16.png"});
    } catch (error) {
        console.error("Error fetching data:", error);
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

        const pinData = await pinResponse.json();
        return pinData;
    } catch (error) {
        console.error("Error in handleFormSubmit:", error);
        throw error;
    }
}

// Event listeners
chrome.runtime.onStartup.addListener(fetchDataAndStore);
chrome.runtime.onInstalled.addListener(fetchDataAndStore);

chrome.tabs.onActivated.addListener(async () => {
    if (!isRunning) {
        isRunning = true;
        const url = await getActiveTabUrl();
        if (url) {
            console.log("Active Tab URL:", url);
        }
        isRunning = false;
    }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
    if (!isRunning && changeInfo.status === 'complete') {
        isRunning = true;
        const url = await getActiveTabUrl();
        if (url) {
            console.log("Active Tab URL:", url);
        }
        isRunning = false;
    }
});

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    (async () => {
        switch (message.action) {
            case "test":
                sendResponse({success: true, retour: "ok", param: message.params.p1});
                break;
            case 'fetchDataAndStore':
                try {
                    await fetchDataAndStore();
                    sendResponse({status: 'success'});
                } catch (error) {
                    sendResponse({status: 'error', message: error.message});
                }
                break;
            case "getThumbnail":
                try {
                    const thumbnail = await getThumbnail(await getActiveTabUrl());
                    sendResponse(thumbnail);
                } catch (error) {
                    sendResponse({error: error.message});
                }
                break;
            case "handleFormSubmit":
                try {
                    const pinData = await handleFormSubmit(message.params);
                    sendResponse({success: true, data: pinData});
                } catch (error) {
                    sendResponse({success: false, error: error.message});
                }
                break;
            default:
                sendResponse({error: "Invalid action " + message.action});
        }
    })();
    return true; // Indicate that the response is async
});
