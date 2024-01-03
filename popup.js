document.addEventListener("DOMContentLoaded", async function () {
    const token = "pateoiLGxeeOa1bbO.7d97dd01a0d5282f7e4d3b5fff9c9e10d2023d3a34b1811e1152a97182c2238d"; // Replace with your Bearer Token
    const headers = new Headers({
        "Authorization": `Bearer ${token}`
    });

    const stars = document.querySelectorAll('.star');
    const form = document.getElementById("addForm");
    const rating = document.getElementById('rating');
    const cancelButton = document.getElementById('cancel');
    const addButton = document.getElementById('add');
    const updateButton = document.getElementById('update');
    const imgUrl = document.getElementById('img_url');
    const domainsContainer = document.getElementById('domains');
    const tagsDiv = document.getElementById("tags");
    let checkedGroups;

    const content = document.getElementById("content");
    content.style.display = "block";
    const spinnerContainer = document.getElementById("spinnerContainer");

    if (document.querySelector('input[name="domain"]')) {
        document.querySelectorAll('input[name="domain"]').forEach((elem) => {
            elem.addEventListener("change", function (event) {
                const item = event.target.value;
                console.log(item);
            });
        });
    }

    imgUrl.addEventListener("input", (e) => {
        e.preventDefault();
        const imgElement = document.getElementById("img")
        imgElement.src = imgUrl.value;
    })

    cancelButton.addEventListener("click", function () {
        // Close the popup window
        window.close();
    });

    function mini_url(url) {
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

    stars.forEach(star => {
        star.addEventListener('click', () => {


            let old_value = parseInt(rating.value);
            let new_value = parseInt(star.getAttribute('data-value'));

            if (old_value == 1 && new_value == 1) {
                new_value = 0;
            }
            rating.value = new_value;
            updateStars(old_value, new_value);
        });
    });


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
    }

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

    //
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

    async function processPinData(currentTab, pinData) {
        try {
            const cardIdInput = document.getElementById("card_id");
            const titleInput = document.getElementById("title");
            const urlInput = document.getElementById("url");
            const commentInput = document.getElementById("comment");
            const imgUrlInput = document.getElementById("img_url");
            const imgElement = document.getElementById("img");
            const ratingInput = document.getElementById("rating");

            titleInput.value = currentTab.title;
            urlInput.value = currentTab.url;

            if (pinData.records.length === 0) {
                commentInput.value = "";
                const thumbnailUrl = await getThumbnail(currentTab.url);
                imgUrlInput.value = thumbnailUrl;
                imgElement.src = thumbnailUrl;
                ratingInput.value = "0";
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
                updateStars(0, record.fields.rating);
                //
                addButton.style.display = "none"
                updateButton.style.display = "block"

            }
        } catch (error) {
            console.error("Error handling tab data:", error);
        }
    }

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
                    checkbox.checked = selectedTags.includes(tag.fields.name);

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

    //

    /**********************/
    try {
        addButton.style.display = "none"
        updateButton.style.display = "none"
        const currentTab = await getCurrentTab(); // données de la page
        const pinData = await getPinData(currentTab.url);
        await processPinData(currentTab, pinData); // récup des données en base ou des données de la page

        const selectedDomain = await getSelectedDomain(pinData);
        const selectedGroups = await getSelectedGroups(pinData);
        const selectedTags = await getSelectedTags(pinData);

        const domainsData = await getDomainsData(); // liste de tous les domaines
        await processDomainsData(domainsData, selectedDomain);

        const tagsData = await getTagsData(selectedDomain);
        await processTagsData(tagsData, selectedTags); // liste de tous les tags du domaine

        const groupsData = await getGroupsData(selectedDomain);
        await processGroupsData(groupsData, selectedGroups);
        //
        spinnerContainer.style.display = "none";
        // submit
        form.addEventListener("submit", async function (event) {
            event.preventDefault();

            const formData = new FormData(form);
            const selectedTags = formData.getAll("tags");
            const selectedDomains = formData.getAll("domains");
            const selectedGroups = formData.getAll("groups");
            const action = event.submitter ? event.submitter.value : null;
            let method = ""
            let postData;

            if (action === "cancel") {
                window.close();
                return null;
            }
            if (action === "add") {
                method = "POST";
                postData = {
                    "records": [{
                        "fields": {
                            "name": formData.get("title"),
                            "rating": formData.get("rating"),
                            "url": formData.get("url"),
                            "mini_url": mini_url(formData.get("url")),
                            "description": formData.get("comment") == undefined ? "" : formData.get("comment"),
                            "img_url": formData.get("img_url"),
                            "tags": selectedTags,
                            "domain": selectedDomains,
                            "groups": checkedGroups,
                            "status": "0"
                        }
                    }]
                };
            } else if (action === "update") {
                method = "PATCH";
                postData = {
                    "records": [{
                        "id": formData.get("card_id"),
                        "fields": {
                            "name": formData.get("title"),
                            "rating": formData.get("rating"),
                            "url": formData.get("url"),
                            "mini_url": mini_url(formData.get("url")),
                            "description": formData.get("comment"),
                            "img_url": formData.get("img_url"),
                            "tags": selectedTags,
                            "domain": selectedDomains,
                            "groups": checkedGroups,
                        }
                    }]
                }
            }

            try {
                const response = await fetch("https://api.airtable.com/v0/app7zNJoX11DY99UA/Pins", {
                    method: method,
                    headers: {
                        "Authorization": " Bearer " + token,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(postData)
                });
                const responseData = await response.json()
                    //console.log("Réponse de la requête POST:", responseData);
                    .then(window.close())


            } catch (error) {
                console.error("Error making POST request:", error);
            }
        });
    } catch
        (error) {
        console.error("Error:", error);
    }

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
    });

})
;
