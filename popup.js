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

    const content = document.getElementById("content");
    content.style.display = "block";
    const spinnerContainer = document.getElementById("spinnerContainer");

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

    function handleSelectedTags(selectedTags) {
        const tagCheckboxes = document.querySelectorAll('input[name="tags"]');
        selectedTags.forEach(tag => {
            const checkbox = document.getElementById(tag);
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


    async function getTags() {
        try {
            const apiUrl = `https://api.airtable.com/v0/app7zNJoX11DY99UA/Tags`;
            const response = await fetch(apiUrl, {headers});
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("Error fetching data from the database:", error);
            throw error;
        }
    }

    async function handleTagsData() {
        try {
            const tags = await getTags();

            const tagsDiv = document.getElementById("tags");
            for (const tag of tags.records) {
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.name = "tags";
                checkbox.value = tag.id;
                checkbox.id = tag.id;

                const checkboxLabel = document.createElement("label");
                checkboxLabel.htmlFor = tag.id;
                checkboxLabel.innerText = tag.fields.name;

                tagsDiv.appendChild(checkbox);
                tagsDiv.appendChild(checkboxLabel);
            }
        } catch (error) {
            console.error("Error handling tab data:", error);
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

    async function getPagesData(url) {
        try {
            const filterField = 'mini_url';
            const filterValue = mini_url(url);
            const filterFormula = `SEARCH("${filterValue}", {${filterField}})`;
            const apiUrl = `https://api.airtable.com/v0/app7zNJoX11DY99UA/pages?filterByFormula=${encodeURIComponent(filterFormula)}`;
            const response = await fetch(apiUrl, {headers});
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("Error fetching data from the database:", error);
            throw error;
        }
    }

    async function handleTabData(tab) {
        try {
            const data = await getPagesData(tab.url);
            const cardIdInput = document.getElementById("card_id");
            const titleInput = document.getElementById("title");
            const urlInput = document.getElementById("url");
            const commentInput = document.getElementById("comment");
            const imgUrlInput = document.getElementById("img_url");
            const imgElement = document.getElementById("img");
            const ratingInput = document.getElementById("rating");

            titleInput.value = tab.title;
            urlInput.value = tab.url;

            if (data.records.length === 0) {
                commentInput.value = "";
                const thumbnailUrl = await getThumbnail(tab.url);
                imgUrlInput.value = thumbnailUrl;
                imgElement.src = thumbnailUrl;
                ratingInput.value = "0";
                //
                addButton.style.display = "block"
                updateButton.style.display = "none"
            } else {
                const record = data.records[0];
                cardIdInput.value = record.id;
                commentInput.value = record.fields.description;
                imgUrlInput.value = record.fields.img_url;
                imgElement.src = record.fields.img_url;
                ratingInput.value = record.fields.rating;
                updateStars(0, record.fields.rating);
                handleSelectedTags(record.fields.tag)
                //
                addButton.style.display = "none"
                updateButton.style.display = "inline-block"
            }
        } catch (error) {
            console.error("Error handling tab data:", error);
        }
    }

    try {
        await handleTagsData(); // liste de tous les tags
        const tab = await getCurrentTab(); // données de la page
        await handleTabData(tab); // récup des données en base ou des données de la page
        //
        spinnerContainer.style.display = "none";
        // submit
        form.addEventListener("submit", async function (event) {
            event.preventDefault();

            const formData = new FormData(form);
            const selectedTags = formData.getAll("tags");
            const action = event.submitter ? event.submitter.value : null;
            let method = ""
            let postData;

            if (action === "add") {
                method = "POST";
                postData = { "records" :[{
                    "fields": {
                        "name": formData.get("title"),
                        "rating": formData.get("rating"),
                        "url": formData.get("url"),
                        "mini_url": mini_url(formData.get("url")),
                        "description": formData.get("comment"),
                        "img_url": formData.get("img_url"),
                        "tag": selectedTags
                    }
                }]};
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
                            "tag": selectedTags
                        }
                    }]
                }
            }

            try {
                const response = await fetch("https://api.airtable.com/v0/app7zNJoX11DY99UA/Pages", {
                    method: method,
                    headers: {
                        "Authorization": " Bearer " + token,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(postData)
                });
                const responseData = await response.json();
                console.log("Réponse de la requête POST:", responseData);
                // window.close();


            } catch (error) {
                console.error("Error making POST request:", error);
            }
        });
    } catch (error) {
        console.error("Error:", error);
    }
});
