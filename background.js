chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installed");
});

let isRunning = false;

// Fonction pour obtenir l'onglet actif
async function getActiveTab() {
    //let queryOptions = { active: true, currentWindow: true };
    console.log("getActiveTab()");
    let queryOptions = {active: true};
    let tabs = await chrome.tabs.query(queryOptions);
    let tabs1 = await chrome.tabs.query({active: true});
    let tabs2 = await chrome.tabs.query({currentWindow: true});
    console.log("Tabs returned:", tabs); // Ajoutez cette ligne pour loguer les onglets retournés
    if (tabs.length === 0) {
        console.error("No active tab found.");
        return null;
    }
    return tabs[0];
}

async function getActiveTabUrl() {
    try {
        console.log("getActiveTabUrl()");
        const tab = await getActiveTab();
        if (!tab) {
            throw new Error("No active tab found.");
        }
        return tab.url;
    } catch (error) {
        console.error("getActiveTabUrl error: " + error);
        return null;
    }
}

async function getThumbnail(url) {
    try {
        console.log("getThumbnail()");
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

async function fetchData(endpoint, headers) {
    const apiUrlBase = "https://api.airtable.com/v0/app7zNJoX11DY99UA/";
    try {
        const request = apiUrlBase + endpoint;
        console.log("fetchData : request")
        console.log("request : " + request)
        const response = await fetch(request, {headers});
        return await response.json();
    } catch (error) {
        console.error(`Error fetching ${request}:`, error);
        throw error;
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const token = "pateoiLGxeeOa1bbO.7d97dd01a0d5282f7e4d3b5fff9c9e10d2023d3a34b1811e1152a97182c2238d";
    const headers = new Headers({
        "Authorization": `Bearer ${token}`
    });
    console.log("Message : " + message)
    console.log("Sender : " + sender)

    async function handleMessage() {
        console.log("handleMessage ---------")
        const url = await getActiveTabUrl();
        if (!url && message.action !== "handleFormSubmit") {
            sendResponse({error: "Unable to get active tab URL."});
            return;
        }

        switch (message.action) {
            case "test":
                try {
                    console.log("case test");
                    sendResponse({success: true, retour: "ok", param: message.params.p1});
                } catch (error) {
                    sendResponse({error: error.message});
                }
                break;
            case "getThumbnail":
                console.log("case getThumbnail");
                try {
                    console.log("getThumbnail");
                    const thumbnail = await getThumbnail(url);
                    sendResponse(thumbnail);
                } catch (error) {
                    sendResponse({error: error.message});
                }
                break;
            case "getPinData":
                try {
                    console.log("case getPinData");
                    const filterField = 'url';
                    const filterValue = "^" + message.params.url.replace(/[|\\{}()[\]^$+*?.\/]/g, '\\$&') + "$";
                    const filterFormula = `REGEX_MATCH({${filterField}}, "${filterValue}")`;
                    const pinData = await fetchData(`pins?filterByFormula=${encodeURIComponent(filterFormula)}`, headers);
                    sendResponse(pinData);
                } catch (error) {
                    sendResponse({error: error.message});
                }
                break;
            case "getSiteData":
                try {
                    console.log("case getSiteData");
                    console.log(`Sites?filterByFormula=AND({site}='${message.params.site}')`)
                    const siteData = await fetchData(`Sites?filterByFormula=AND({site}='${message.params.site}')`, headers);
                    sendResponse(siteData);
                } catch (error) {
                    sendResponse({error: error.message});
                }
                break;
            case "getData":
                try {
                    console.log("case getData");
                    //const siteFilterFormula = `AND({site}='${message.params.site}')`;
                    const pinFilterField = 'url';
                    //const pinFilterValue = "^" + message.params.url.replace(/[|\\{}()[\]^$+*?.\/]/g, '\\$&') + "$";
                    //const siteFilterValue = "^" + message.params.site.replace(/[|\\{}()[\]^$+*?.\/]/g, '\\$&') + "$";
                    //const pinFilterFormula = `REGEX_MATCH({${pinFilterField}}, "${pinFilterValue}")`;
                    //const pinFilterFormula = `REGEX_MATCH({url}, "${pinFilterValue}")`;
                    //const siteFilterFormula = `REGEX_MATCH({url}, "${siteFilterValue}")`;

                    //https://api.airtable.com/v0/app7zNJoX11DY99UA/Sites?filterByFormula=AND({domain}="Maths",{site}='edubase.eduscol.education.fr')

                    console.log("sites  ++++++++++++++++++++++++");
                    console.log("sites?filterByFormula=AND({site}='" + message.params.site + "')");
                    console.log("pins  ++++++++++++++++++++++++");
                    console.log("pins?filterByFormula=AND({url}='" + message.params.url + "')");


                    const [siteData, pinData, domainsData] = await Promise.all([
                        fetchData("sites?filterByFormula=AND({site}='" + message.params.site + "')", headers),
                        fetchData("pins?filterByFormula=AND({url}='" + message.params.url + "')", headers),
                        fetchData("domains", headers)
                    ]);

                    if (pinData.records != undefined && pinData.records.length > 0 && pinData.records[0].fields && pinData.records[0].fields.domain) {
                        const domain = pinData.records[0].fields.domain;

                        const [tagsData, groupsData] = await Promise.all([
                            fetchData(`tags?filterByFormula=AND({domain}='${domain}')`, headers),
                            fetchData(`groups?filterByFormula=AND({domain}='${domain}')`, headers)
                        ]);

                        sendResponse({siteData, pinData, domainsData, tagsData, groupsData});
                    } else {
                        sendResponse({siteData, pinData, domainsData, undefined, undefined});
                    }
                } catch (error) {
                    sendResponse({error: error.message});
                }
                break;
            case "handleFormSubmit":
                try {
                    console.log("handleFormSubmit")
                    const params = message.params;
                    const formData = Object.fromEntries(params.formData.entries());
                    const selectedTags = formData.tags ? formData.tags.split(',') : [];
                    const selectedDomains = formData.domains ? formData.domains.split(',') : [];

                    let siteId;

                    if (formData.new_site === "true") {
                        const siteResponse = await fetchData("Sites", {
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

                    const pinResponse = await fetchData("Pins", {
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
                    sendResponse({success: true, data: pinData});
                } catch (error) {
                    sendResponse({success: false, error: error.message});
                }
                break;
            default:
                sendResponse({error: "Invalid action"});
        }

        return true; // Indiquer que la réponse sera envoyée de manière asynchrone
    }

    handleMessage();
    return true; // Indiquer que la réponse sera envoyée de manière asynchrone
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
    console.log("onActivated ------------------");
    if (!isRunning) {
        isRunning = true;
        const url = await getActiveTabUrl();
        if (url) {
            console.log("Active Tab URL (2) : " + url);
        }
        isRunning = false;
    }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    console.log("onUpdated ------------------");
    if (!isRunning) {
        isRunning = true;
        if (changeInfo.status === 'complete') {
            const url = await getActiveTabUrl();
            if (url) {
                console.log("Active Tab URL (3) : " + url);
            }
        }
        isRunning = false;
    }
})
;
