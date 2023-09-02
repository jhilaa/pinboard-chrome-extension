document.addEventListener("DOMContentLoaded", function () {
    const token = "pateoiLGxeeOa1bbO.7d97dd01a0d5282f7e4d3b5fff9c9e10d2023d3a34b1811e1152a97182c2238d"; // Remplacez par votre Bearer Token
    const headers = new Headers({
        "Authorization": `Bearer ${token}`
    });

    // event sur le score
    const rating = document.getElementById('rating');
    const stars = document.querySelectorAll('.star');
    let currentRating = rating.value;

    //TODO a poursuivre
    stars.forEach(star => {
        star.addEventListener('click', () => {
            let old_value = parseInt(rating.value);
            let new_value = parseInt(star.getAttribute('data-value'));

            if (old_value == 1 && new_value == 1) {
                new_value=0;
            }
            rating.value = new_value;
            updateStars(old_value, new_value);
        });
    });

    function updateStars(old_value, new_value) {
        stars.forEach((star, index) => {
            if (index <= new_value-1) {
                star.classList.add('bi-star-fill');
                star.classList.remove('bi-star');
            } else {
                star.classList.add('bi-star');
                star.classList.remove('bi-star-fill');
            }
        });
    }

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
                        const urlInput = form.querySelector("#url");
                        urlInput.value = currentTab.url;
                    }
                });
            }
            ;
        })

    //

    // Soumettre le formulaire
    const form = document.getElementById("addForm");
    form.addEventListener("submit", function (event) {
        event.preventDefault();

        const formData = new FormData(form);
        const selectedItems = formData.getAll("items");

        console.log("img_url : " + img_url);

        // Préparez les données pour la requête POST
        const postData = {
            "fields": {
                "name": formData.get("title"),
                "rating": formData.get("rating"),
                "url": formData.get("url"),
                "description": formData.get("comment"),
                "img_url": formData.get("img_url"),
                "tag": selectedItems
            }
        };

        console.log("postData : " + postData.toString());

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
    const img = form.querySelector("#img");
    const img_url = form.querySelector("#img_url");

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
                    img_url.value = thumbnailUrl;
                    img.src = thumbnailUrl;
                    return thumbnailUrl;
                } else {
                    console.log("No Open Graph image found.");
                    const default_img_url ="https://img.freepik.com/free-vector/colorful-pastel-poly-background_53876-62618.jpg?size=626&ext=jpg";
                    img_url.value = default_img_url
                    img.src = default_img_url
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


