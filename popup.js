document.addEventListener("DOMContentLoaded", async function () {
    const token = "pateoiLGxeeOa1bbO.7d97dd01a0d5282f7e4d3b5fff9c9e10d2023d3a34b1811e1152a97182c2238d"; // Replace with your Bearer Token
    const headers = new Headers({
        "Authorization": `Bearer ${token}`
    });

    const stars = document.querySelectorAll('.star');
    const form = document.getElementById("addForm");
    const status = document.getElementById('status');
    const rating = document.getElementById('rating');
    const cancelButton = document.getElementById('cancel');
    const addButton = document.getElementById('add');
    const updateButton = document.getElementById('update');
    const imgUrl = document.getElementById('img_url');
    const domainsContainer = document.getElementById('domains');
    const tagsDiv = document.getElementById("tags");
    const content = document.getElementById("content");
    const spinnerContainer = document.getElementById("spinnerContainer");
    const site = document.getElementById("site");
    const newSite = document.getElementById("new_site");
    const siteRating = document.getElementById("site_rating");
    let checkedGroups;

    content.style.display = "block";

    //*********************************
    //***** Evenements  ***************
    //*********************************
    // evenement sur le champ adresse
    if (document.querySelector('input[name="domain"]')) {
        document.querySelectorAll('input[name="domain"]').forEach((elem) => {
            elem.addEventListener("change", function (event) {
                const item = event.target.value;
                console.log(item);
            });
        });
    }

    // evenement sur le zone de saisie image
    imgUrl.addEventListener("input", (e) => {
        e.preventDefault();
        const imgElement = document.getElementById("img")
        imgElement.src = imgUrl.value;
    })

    // événement sur le bouton annuler
    cancelButton.addEventListener("click", function () {
        // Close the popup window
        window.close();
    });

    // événement sur les étoiles
    stars.forEach(star => {
        star.addEventListener('click', () => {
            let old_value = parseInt(rating.value);
            let new_value = parseInt(star.getAttribute('data-value'));

            if (old_value == 1 && new_value == 1) {
                new_value = 0;
            }
            rating.value = new_value;
            updateStars(0, new_value);
        });
    })


    //*********************************
    //**** evenement sur les onglets **
    //*********************************
    /**
     chrome.runtime.onMessage.addListener(async function (message, sender, sendResponse) {
        if (message.action === "updateUrl") {
            const tab = message.tab
            const url = tab.url;
            const title = tab.title;
            const pinData = await getPinData(url);
            await processPinData(tab, pinData); // récup des données en base ou des données de la page
            await createFormItems(pinData)
        }
    });
     */



    //*********************************
    //***** utils    ***************
    //*********************************
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

    function updateStars(old_value, new_value) {
        stars.forEach((star, index) => {
            if (index < new_value) {
                star.classList.add('bi-star-fill');
                star.classList.remove('bi-star');
            } else {
                star.classList.add('bi-star');
                star.classList.remove('bi-star-fill');
            }
        });
    }

    //************************************
    //***** Construction de side page  ***
    //************************************
    async function getCurrentTab() {
        return new Promise((resolve, reject) => {
            const queryOptions = {active: true, currentWindow: true};
            chrome.tabs.query(queryOptions, (tabs) => {
                const currentTab = tabs[0];
                if (currentTab) {
                    resolve(currentTab);
                } else {
                    reject(new Error("No active tab found."));
                }
            });
        });
    };

    async function getThumbnail(url) {
        try {
            const response = await fetch(url);
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const ogImage = doc.querySelector('meta[property="og:image"]');
            if (ogImage) {
                const thumbnailUrl = ogImage.getAttribute('content');
                console.log("Thumbnail URL:", thumbnailUrl);
                return thumbnailUrl;
            } else {
                console.log("No Open Graph image found.");
                return "https://img.freepik.com/free-vector/colorful-pastel-poly-background_53876-62618.jpg?size=626&ext=jpg";
            }
        } catch (error) {
            console.error("Error fetching thumbnail:", error);
            return "https://img.freepik.com/free-vector/colorful-pastel-poly-background_53876-62618.jpg?size=626&ext=jpg";
        }
    }

    // info domaines pour construire les radiobouton
    async function getDomainsData() {
        try {
            const apiUrl = `https://api.airtable.com/v0/app7zNJoX11DY99UA/Domains`;
            const response = await fetch(apiUrl, {headers});
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("Error fetching data from the database:", error);
            throw error;
        }
    }

    async function processDomainsData(domainsData, selectedDomain) {
        try {
            const domains = domainsData.records.toSorted((a, b) => {
                const nameA = a.fields.name.toLowerCase();
                const nameB = b.fields.name.toLowerCase();

                if (nameA < nameB) return -1;
                if (nameA > nameB) return 1;
                return 0;
            });
            domainsContainer.innerHTML = ""
            for (const domain of domains) {
                const radioGroup = document.createElement("div");
                radioGroup.classList.add("d-flex");
                radioGroup.classList.add("flex-line");
                const radio = document.createElement("input");
                radio.type = "radio";
                radio.name = "domains";
                radio.value = domain.id;
                radio.id = domain.id;
                if (selectedDomain != undefined && selectedDomain != "") {
                    radio.checked = (domain.fields.name == selectedDomain);
                }

                const radioLabel = document.createElement('label')
                radioLabel.htmlFor = domain.id;
                radioLabel.innerText = domain.fields.name;

                radio.addEventListener("click", async () => {
                    const tagsData = await getTagsData(domain.fields.name);
                    const groupsData = await getGroupsData(domain.fields.name);
                    addButton.removeAttribute('disabled');
                    await processTagsData(tagsData, [])
                    await processGroupsData(groupsData, [])
                })

                radioGroup.appendChild(radio);
                radioGroup.appendChild(radioLabel);
                domainsContainer.appendChild(radioGroup);

                //domainsContainer.appendChild(newline);
            }
            domainsContainer.classList.add("d-flex");
            domainsContainer.classList.add("flex-column");
        } catch (error) {
            console.error("Error handling domain data:", error);
        }
    }

    // info tags pour construire les checkbox
    async function getTagsData(domain) {
        try {
            const apiUrl = `https://api.airtable.com/v0/app7zNJoX11DY99UA/Tags?filterByFormula=` + encodeURIComponent(`AND({domain_name}="` + domain + `")`);
            const response = await fetch(apiUrl, {headers});
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("Error fetching data from the database:", error);
            throw error;
        }
    }

    async function processTagsData(tagsData, selectedTags) {
        try {
            const tags = tagsData.records.toSorted((a, b) => {
                const nameA = a.fields.name.toLowerCase();
                const nameB = b.fields.name.toLowerCase();

                if (nameA < nameB) return -1;
                if (nameA > nameB) return 1;
                return 0;
            });

            tagsDiv.innerHTML = ""
            for (const tag of tags) {
                if (tag.fields.name != undefined) {
                    const newTagDiv = document.createElement("div");
                    const checkbox = document.createElement("input");
                    checkbox.type = "checkbox";
                    checkbox.name = "tags";
                    checkbox.value = tag.id;
                    checkbox.id = tag.id;
                    //
                    if (selectedTags != undefined && selectedTags.length != 0) {
                        checkbox.checked = selectedTags.includes(tag.fields.name);
                    }

                    const checkboxLabel = document.createElement("label");
                    checkboxLabel.htmlFor = tag.id;
                    checkboxLabel.innerText = tag.fields.name;

                    newTagDiv.appendChild(checkbox);
                    newTagDiv.appendChild(checkboxLabel);

                    tagsDiv.append(newTagDiv)
                }
            }
        } catch (error) {
            console.error("Error handling tab data:", error);
        }
    }

    // info groups pour construire les radiobutton
    async function getGroupsData(domain) {
        try {
            const apiUrl = `https://api.airtable.com/v0/app7zNJoX11DY99UA/Groups?filterByFormula=` + encodeURIComponent(`AND({domain_name}="` + domain + `")`);
            const response = await fetch(apiUrl, {headers});
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("Error fetching data from the database:", error);
            throw error;
        }
    }

    async function processGroupsData(groupsData, selectedGroups) {
        function trouverFils(array, parent) {
            let children = [];
            if (Array.isArray(array)) {
                array.forEach(record => {
                    const fields = record.fields;
                    if (Array.isArray(fields.group) && fields.group.length > 0) {
                        if (parent == fields.group[0]) {
                            children.push({
                                id: record.id,
                                text: fields.name,
                                //name: "groups",
                                children: trouverFils(array, record.id),
                                checked: selectedGroups.includes(fields.name)
                            });
                        }
                    }
                });
            }
            return children;
        }

        try {
            let result = trouverFils(groupsData.records, "recqhM5UDTNnUVvaL");
            let groupCheckboxesList = document.getElementById("groups");
            groupCheckboxesList.innerHTML = "";
            tree = new Tree('#groups', {
                data: result,
                closeDepth: 3,
                loaded: function () {
                },
                onChange: function () {
                    checkedGroups = this.values;
                }
            });
        } catch (error) {
            console.error("Error fetching or processing data:", error);
        }
    }

    // récup de la fiche correspondant à l'url
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

    async function getSiteData(site) {
        try {
            const apiUrl = `https://api.airtable.com/v0/app7zNJoX11DY99UA/Sites?filterByFormula=AND({site}='` + site + `')`;
            const response = await fetch(apiUrl, {headers});
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("Error fetching data from the database:", error);
            throw error;
        }
    }

    async function processPinData(currentTab, pinData) {
        try {
            const cardIdInput = document.getElementById("card_id");
            const titleInput = document.getElementById("title");
            const urlInput = document.getElementById("url");
            const commentInput = document.getElementById("comment");
            const imgUrlInput = document.getElementById("img_url");
            const imgElement = document.getElementById("img");
            const ratingInput = document.getElementById("rating");
            const statusInput = document.getElementById("status");

            titleInput.value = currentTab.title;
            urlInput.value = currentTab.url;
            addButton.style.display = "none"
            updateButton.style.display = "none"

            if (pinData.records.length === 0) {
                commentInput.value = "";
                const thumbnailUrl = await getThumbnail(currentTab.url);
                imgUrlInput.value = thumbnailUrl;
                imgElement.src = thumbnailUrl;
                ratingInput.value = "0";
                updateStars(0, 0);
                //
                addButton.style.display = "block"
                updateButton.style.display = "none"
            } else {
                const record = pinData.records[0];
                titleInput.value = record.fields.name;
                urlInput.value = record.fields.url;
                cardIdInput.value = record.id;
                commentInput.value = (record.fields.description == undefined ? "" : record.fields.description);
                imgUrlInput.value = record.fields.img_url;
                imgElement.src = record.fields.img_url;
                ratingInput.value = record.fields.rating;
                statusInput.checked = record.fields.status == "1"
                updateStars(0, record.fields.rating);
                //TODO : gestion des tags
                //
                addButton.style.display = "none"
                updateButton.style.display = "block"
            }
        } catch (error) {
            console.error("Error handling tab data:", error);
        }
    }

    async function getSelectedDomain(pinData) {
        if (pinData.records.length > 0) {
            if (pinData.records[0].fields.domain_name != undefined) {
                if (pinData.records[0].fields.domain_name.length > 0) {
                    return pinData.records[0].fields.domain_name[0];
                }
            }
        }
        return "";
    }

    async function getSelectedTags(pinData) {
        if (pinData.records.length > 0) {
            if (pinData.records[0].fields.tags_name != undefined) {
                if (pinData.records[0].fields.tags_name.length > 0) {
                    return pinData.records[0].fields.tags_name;
                }
            }
        }
        return "";
    }

    async function getSelectedGroups(pinData) {
        if (pinData.records.length > 0) {
            if (pinData.records[0].fields.groups_name != undefined) {
                if (pinData.records[0].fields.groups_name.length > 0) {
                    return pinData.records[0].fields.groups_name;
                }
            }
        }
        return "";
    }

    async function createFormItems(pinData, siteData) {
        spinnerContainer.style.display = "block";
        // récup des données Domaine pour la liste déroulante,
        // et du dernier domaine stocké dans lees cookies
        const domainsData = await getDomainsData(); // liste de tous les domaines
        const selectedDomain = await getSelectedDomain(pinData);
        await processDomainsData(domainsData, selectedDomain);
        // récup des données Tags
        const tagsData = await getTagsData(selectedDomain);
        const selectedTags = await getSelectedTags(pinData);
        await processTagsData(tagsData, selectedTags);
        // récup des données Groupe
        const groupsData = await getGroupsData(selectedDomain);
        const selectedGroups = await getSelectedGroups(pinData);
        await processGroupsData(groupsData, selectedGroups);
        //
        spinnerContainer.style.display = "none";
    }

    async function processSiteData(currentTabSite, siteData) {
        try {
            site.value = currentTabSite;
            newSite.value = true;
            if (siteData != undefined) {
                newSite.value = false;
                siteRating.value = siteData.records[0].fields.site_rating;
            }
        } catch (error) {
            console.error("Error handling site data:", error);
        }
    }

    async function createSite(siteData) {
        try {
            const response = await fetch("https://api.airtable.com/v0/app7zNJoX11DY99UA/Sites", {
                method: "POST",
                headers: {
                    "Authorization": "Bearer " + token,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(siteData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const responseData = await response.json();
            console.log("Response data:", responseData);

            // réponse
            const record = responseData.records[0];
            const siteId = record.id;
            const createdTime = record.createdTime;
            const site = record.fields.site;
            const siteRating = record.fields.site_rating;
            const domain = record.fields.domain[0];
            const domainName = record.fields.domain_name[0];

            console.log(`Site ID: ${siteId}`);
            console.log(`Created Time: ${createdTime}`);
            console.log(`Site: ${site}`);
            console.log(`Site Rating: ${siteRating}`);
            console.log(`Domain ID: ${domain}`);
            console.log(`Domain Name: ${domainName}`);

            // You can now use these variables as needed in your application
            return record;
        } catch (error) {
            console.error("Error making POST request:", error);
            return null;
        }
    }

    async function updateSite(siteData) {
        try {
            const response = await fetch("https://api.airtable.com/v0/app7zNJoX11DY99UA/Sites", {
                method: "PATCH",
                headers: {
                    "Authorization": "Bearer " + token,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(siteData)
            });

            // Cacher le spinner après une courte période
            setTimeout(() => {
                spinnerContainer.style.display = "none";
            }, 1000);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const responseData = await response.json();
            console.log("Response data:", responseData);

            if (responseData.records.length > 0) {
                const record = responseData.records[0];
                return record;
            } else {
                return undefined;
            }
        } catch (error) {
            console.error("Error making PATCH request:", error);
            return null;
        }
    }


    async function createPin(pinData) {
        try {
            const response = await fetch("https://api.airtable.com/v0/app7zNJoX11DY99UA/Pins", {
                method: "POST",
                headers: {
                    "Authorization": " Bearer " + token,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(pinData)
            })
                .then(() => setTimeout(() => {
                    spinnerContainer.style.display = "none";
                }, 1000))

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const responseData = await response.json();
            console.log("Response data:", responseData);
            if (responseData.records.length > 0) {
                const record = responseData.records[0];
                return record;
            } else return null;
        } catch (error) {
            console.error("Error making POST request:", error);
        }
    }

    async function updatePin(pinData) {
        try {
            const response = await fetch("https://api.airtable.com/v0/app7zNJoX11DY99UA/Pins", {
                method: "PATCH",
                headers: {
                    "Authorization": " Bearer " + token,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(pinData)
            })
                .then(() => setTimeout(() => {
                    spinnerContainer.style.display = "none";
                }, 1000))
            //------------
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const responseData = await response.json();
            console.log("Response data:", responseData);
            if (responseData.records.length > 0) {
                const record = responseData.records[0];
                return record;
            } else return null;
        } catch (error) {
            console.error("Error making POST request:", error);
        }
    }

    async function handleFormSubmit(action, siteData, pinData) {
        const formData = new FormData(form);
        const selectedTags = formData.getAll("tags");
        const selectedDomains = formData.getAll("domains");
        let siteId = (function() {
            if (siteData != undefined && siteData.records.length > 0) {
                return siteData.records[0].id
            } else return undefined
        })();

        let pinId = (function() {
            if (pinData != undefined && pinData.records.length > 0) {
                return pinData.records[0].id
            } else return undefined
        })();
        let method = ""
        let postData;
        //TODO gestion create
        if (action === "cancel") {
            window.close();
            return null;
        }

        // si la fiche n'existe pas'
        //if (action === "add") {
        if (pinId == undefined) {
            /***here**/
            spinnerContainer.style.display = "block";
            // teste si le site "parent" existe.
            // si il n'existe pas, on le crée et on, récupère
            if (siteId == undefined) {
                //création du site + création du pin
                let siteRatingValue = "0"
                if (siteRating.value != undefined && siteRating.value!="") {
                    siteRatingValue = siteRating.value;
                }
                siteData = {
                    "records": [
                        {
                            "fields": {
                                "site": site.value,
                                //"site_rating": siteRating.value,
                                "site_rating": siteRatingValue,
                                "domain": selectedDomains
                            }
                        }
                    ]
                };
                const newSiteRecord = await createSite(siteData);
                siteId = newSiteRecord.id
            }
                // sinon (le site parent existe déjà on met à jour la donnée "site")
            //TODO moyen d'optimiser ça : pas besoin si on n'a pas modifié les données "site"
            else {
                siteData = {
                    "records": [
                        {
                            "id": siteId,
                            "fields": {
                                "site": site.value,
                                "site_rating": siteRating.value,
                                "domain": selectedDomains
                            }
                        }
                    ]
                }
                await updateSite(siteData);
            }

            //creation du pin
            method = "POST";
            pinData = {
                "records": [{
                    "fields": {
                        "name": formData.get("title"),
                        "rating": formData.get("rating"),
                        "url": formData.get("url"),
                        "site": [siteId],
                        "description": formData.get("comment") == undefined ? "" : formData.get("comment"),
                        "img_url": formData.get("img_url"),
                        "tags": selectedTags,
                        "domain": selectedDomains,
                        "groups": checkedGroups,
                        "status": formData.get("status") === "on" ? "1" : "0"
                    }
                }]
            };

            const newPinRecord = await createPin(pinData)
            addButton.style.display = "none"
            updateButton.style.display = "block"
            console.log ("newPinRecord : "+ newPinRecord)
            //} else if (action === "update") {
        } else {
            spinnerContainer.style.display = "block";
            pinData = {
                "records": [{
                    "id": pinId,
                    "fields": {
                        "name": formData.get("title"),
                        "rating": formData.get("rating"),
                        "url": formData.get("url"),
                        "site": [siteId],
                        "description": formData.get("comment") == undefined ? "" : formData.get("comment"),
                        "img_url": formData.get("img_url"),
                        "tags": selectedTags,
                        "domain": selectedDomains,
                        "groups": checkedGroups,
                        "status": formData.get("status") === "on" ? "1" : "0"
                    }
                }]
            };
            await updatePin(pinData);
        }
        // window.close();
    }

    /**********************/
    try {
        const currentTab = await getCurrentTab(); // données de la page
        const currentTabUrl = currentTab.url;
        const currentTabSite = getSiteFromUrl(currentTabUrl);
        const pinData = await getPinData(currentTabUrl);
        const siteData = await getSiteData(currentTabSite);
        const domainsData = await getDomainsData(); // liste de tous les domaines
        const selectedDomain = await getSelectedDomain(pinData);
        const tagsData = await getTagsData(selectedDomain);
        const selectedTags = await getSelectedTags(pinData);
        const groupsData = await getGroupsData(selectedDomain);
        const selectedGroups = await getSelectedGroups(pinData);

        spinnerContainer.style.display = "block";
        await processPinData(currentTab, pinData); // récup des données en base ou des données de la page
        await processSiteData(currentTabSite, siteData); // récup des données en base ou des données de la page
        //await createFormItems(pinData, siteData)
        await processDomainsData(domainsData, selectedDomain);
        await processTagsData(tagsData, selectedTags);
        await processGroupsData(groupsData, selectedGroups);
        await setAccordionItem();
        spinnerContainer.style.display = "none";
        // submit
        form.addEventListener("submit", async function (event) {
            event.preventDefault();
            const action = event.submitter ? event.submitter.value : null;
            await handleFormSubmit(action, siteData, pinData);
        });
    } catch
        (error) {
        console.error("Error:", error);
    }

    async function setAccordionItem() {
        const accordionItemHeaders = document.querySelectorAll(".accordion-item-header");
        accordionItemHeaders.forEach(accordionItemHeader => {
            accordionItemHeader.addEventListener("click", event => {
                // Uncomment in case you only want to allow for the display of only one collapsed item at a time!
                const currentlyActiveAccordionItemHeader = document.querySelector(".accordion-item-header.active");
                if (currentlyActiveAccordionItemHeader && currentlyActiveAccordionItemHeader !== accordionItemHeader) {
                    currentlyActiveAccordionItemHeader.classList.toggle("active");
                    currentlyActiveAccordionItemHeader.nextElementSibling.style.maxHeight = 0;
                }

                accordionItemHeader.classList.toggle("active");
                const accordionItemBody = accordionItemHeader.nextElementSibling;
                if (accordionItemHeader.classList.contains("active")) {
                    accordionItemBody.style.maxHeight = accordionItemBody.scrollHeight + "px";
                } else {
                    accordionItemBody.style.maxHeight = 0;
                }

            });
        })
    };
})
;
