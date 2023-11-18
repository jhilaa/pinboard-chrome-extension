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
        const parsedURL = new URL(url);
        return parsedURL.hostname.replace(/^www\./, '');
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

    function processSelectedTags(selectedTags) {
        const tagCheckboxes = document.querySelectorAll('input[name="tags"]');
        selectedTags.forEach(tag => {
            const checkbox = document.getElementById(tag);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
    }

    function processSelectedDomains(selectedDomains) {
        const DomainCheckboxes = document.querySelectorAll('input[name="domains"]');
        selectedDomains.forEach(domain => {
            const checkbox = document.getElementById(domain);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
    }

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

    async function processTagsData(tagsData) {
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
                const newTagDiv = document.createElement("div");
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.name = "tags";
                checkbox.value = tag.id;
                checkbox.id = tag.id;

                const checkboxLabel = document.createElement("label");
                checkboxLabel.htmlFor = tag.id;
                checkboxLabel.innerText = tag.fields.name;

                newTagDiv.appendChild(checkbox);
                newTagDiv.appendChild(checkboxLabel);

                tagsDiv.append(newTagDiv)
            }
        } catch (error) {
            console.error("Error handling tab data:", error);
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
                const radio = document.createElement("input");
                radio.type = "radio";
                radio.name = "domains";
                radio.value = domain.id;
                radio.id = domain.id;
                if (selectedDomain != undefined && selectedDomain != "") {
                    radio.checked = (domain.id == selectedDomain);
                }

                const radioLabel = document.createElement('label')
                radioLabel.htmlFor = domain.id;
                radioLabel.innerText = domain.fields.name;

                radio.addEventListener("click", async () => {
                    const tagsData = await getTagsData(domain.fields.name);
                    await processTagsData(tagsData)
                })

                domainsContainer.appendChild(radio);
                domainsContainer.appendChild(radioLabel);

                //domainsContainer.appendChild(newline);
            }
        } catch (error) {
            console.error("Error handling domain data:", error);
        }
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
                urlInput.value = record.fields.mini_url;
                cardIdInput.value = record.id;
                commentInput.value = record.fields.description;
                imgUrlInput.value = record.fields.img_url;
                imgElement.src = record.fields.img_url;
                ratingInput.value = record.fields.rating;
                updateStars(0, record.fields.rating);
                processSelectedTags(record.fields.tag)
                processSelectedDomains(record.fields.domain)
                //
                addButton.style.display = "none"
                updateButton.style.display = "block"
            }
        } catch (error) {
            console.error("Error handling tab data:", error);
        }
    }

    try {
        addButton.style.display = "none"
        updateButton.style.display = "none"
        const currentTab = await getCurrentTab(); // données de la page
        const pinData = await getPinData(currentTab.url);
        const domainsData = await getDomainsData(); // liste de tous les domaines

        let selectedDomain = "";
        if (pinData.records.length > 0) {
            if (pinData.records[0].fields.domain.length > 0) {
                selectedDomain = pinData.records[0].fields.domain_name[0];
            }
        }
        await processDomainsData(domainsData, selectedDomain);

        const tagsData = await getTagsData(selectedDomain);
        await processTagsData(tagsData); // liste de tous les tags du domaine

        await processPinData(currentTab, pinData); // récup des données en base ou des données de la page
        //
        spinnerContainer.style.display = "none";
        // submit
        form.addEventListener("submit", async function (event) {
            event.preventDefault();

            const formData = new FormData(form);
            const selectedTags = formData.getAll("tags");
            const selectedDomains = formData.getAll("domains");
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
                            "tag": selectedTags,
                            "domain": selectedDomains,
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
                            "tag": selectedTags,
                            "domain": selectedDomains
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
})
;
