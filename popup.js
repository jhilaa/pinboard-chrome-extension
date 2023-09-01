document.addEventListener("DOMContentLoaded", function () {
    const token = "pateoiLGxeeOa1bbO.7d97dd01a0d5282f7e4d3b5fff9c9e10d2023d3a34b1811e1152a97182c2238d"; // Remplacez par votre Bearer Token
    const headers = new Headers({
        "Authorization": `Bearer ${token}`
    });


    fetch("https://api.airtable.com/v0/app7zNJoX11DY99UA/Tags?content", {headers})
        .then(response => response.json())
        .then((data) => {
            const itemsDiv = document.getElementById("items");
            for (const item of data.records) {
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.name = "items";
                checkbox.value = item.id;
                checkbox.id = item.id;

                const checkboxLabel = document.createElement("label");
                checkboxLabel.htmlFor = item.id;
                checkboxLabel.innerText = item.fields.name

                itemsDiv.appendChild(checkbox);
                itemsDiv.appendChild(checkboxLabel);
                //itemsDiv.appendChild(br);

                // Get the current active tab and populate the title input
                chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
                    const currentTab = tabs[0];
                    if (currentTab) {
                        const form = document.getElementById("addForm");
                        const titleInput = form.querySelector("#title");
                        titleInput.value = currentTab.title; // Populate the title input with the current page's title
                    }
                });
            }
            ;
        })


    // Soumettre le formulaire
    const form = document.getElementById("addForm");
    form.addEventListener("submit", function (event) {
        event.preventDefault();

        const formData = new FormData(form);
        const selectedItems = formData.getAll("items");

        // Préparez les données pour la requête POST
        const postData = {
            "fields": {
                "name": formData.get("title"),
                "notes": "0",
                "url": "url",
                "description": formData.get("comment"),
                "img_url": "https://source.unsplash.com/600x400/?car",
                "tag": selectedItems
            }

        };

        // Envoie de la requête POST
        fetch("https://api.airtable.com/v0/app7zNJoX11DY99UA/Pages",
            {
                method: "POST",
                headers: {
                    "Authorization": " Bearer " + token,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(postData)
                //body: JSON.stringify(test)
            })
            .then(response => response.json())
            .then(responseData => {
                console.log("Réponse de la requête POST:", responseData);
            });
    });

    //charger la miniature
    const thumbnail = form.querySelector("#thumbnail");

    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        const currentTab = tabs[0];
        const externalUrl = currentTab.url;

        fetch(externalUrl)
            .then(response => response.text())
            .then(html => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');

                // Extract the og:image meta tag
                const ogImage = doc.querySelector('meta[property="og:image"]');

                if (ogImage) {
                    const thumbnailUrl = ogImage.getAttribute('content');
                    console.log("Thumbnail URL:", thumbnailUrl);
                    thumbnail.src = thumbnailUrl
                    return thumbnailUrl;
                } else {
                    console.log("No Open Graph image found.");
                    return null
                }
            })
            .catch(error => {
                console.error("Error fetching URL:", error);
                return null
            });
    });
});

// This code should be in your popup.js or background script within your Chrome extension.


