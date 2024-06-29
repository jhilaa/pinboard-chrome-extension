document.addEventListener("DOMContentLoaded", async function () {
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

    const messageElement = document.getElementById('message');
    const refreshButton = document.getElementById('refreshButton');

    function refreshPopupWithStorageData() {
        messageElement.textContent = "Loading";
        chrome.storage.local.get(['sites', 'domains', 'tags', 'groups', 'pins', 'data-ready'], async (result) => {
            console.log("Retrieved storage values: ", result);
            if (result['data-ready']) {
                messageElement.textContent = "Data loaded";
                const currentTab = await getCurrentTab();
                const currentTabUrl = currentTab.url;
                const currentTabSite = getSiteFromUrl(currentTabUrl);
                await processDomainsData(result.domains.records, undefined);
                await setAccordionItem();
            } else {
                messageElement.textContent = "No data found";
            }
        });
    }

    function launchRefreshData(response) {
        console.log("type: 'launchRefreshData'");
        console.log("Response received:", response);
        if (response && response.status) {
            console.log("fetchDataAndStore called successfully");
            refreshPopupWithStorageData();
        } else {
            console.error("Error calling launchRefreshData");
        }
    }

    function callForDataFromBackground() {
        chrome.runtime.sendMessage({ action: 'fetchDataAndStore' }, async (response) => {
            await launchRefreshData(response);
        });
    }

    function setListenerOnDomainItems() {
        if (document.querySelector('input[name="domain"]')) {
            document.querySelectorAll('input[name="domain"]').forEach((elem) => {
                elem.addEventListener("change", function (event) {
                    const item = event.target.value;
                    console.log(item);
                });
            });
        }
    }

    function setListenerOnImgUrlInput() {
        imgUrl.addEventListener("input", (e) => {
            e.preventDefault();
            const imgElement = document.getElementById("img");
            imgElement.src = imgUrl.value;
        });
    }

    function setListenerOnRefreshButton() {
        refreshButton.addEventListener('click', () => {
            callForDataFromBackground();
        });
    }

    function setListenerOnCancelButton() {
        cancelButton.addEventListener("click", function () {
            window.close();
        });
    }

    function setListenerOnStars() {
        function updateStars(new_value) {
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

                if (old_value === 1 && new_value === 1) {
                    new_value = 0;
                }
                rating.value = new_value;
                updateStars(new_value);
            });
        });
    }

    function setListenerOnForm() {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            spinnerContainer.style.display = "block";

            chrome.runtime.sendMessage({
                action: "handleFormSubmit",
                params: {
                    formData: new FormData(form),
                    checkedGroups: checkedGroups,
                    tagAddOrUpdate: addButton.style.display === "block" ? "add" : "update"
                }
            }, (response) => {
                if (response.success) {
                    window.close();
                } else {
                    spinnerContainer.style.display = "none";
                    alert("An error occurred. Please try again.");
                }
            });
        });
    }

    function setAccordionItem() {
        const accordionItemHeaders = document.querySelectorAll(".accordion-item-header");
        accordionItemHeaders.forEach(accordionItemHeader => {
            accordionItemHeader.addEventListener("click", event => {
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
    }

    async function getCurrentTab() {
        return new Promise((resolve, reject) => {
            const queryOptions = { active: true, currentWindow: true };
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

    function getSiteFromUrl(url) {
        try {
            const parsedURL = new URL(url);
            return parsedURL.hostname.replace(/^www\./, '');
        } catch (error) {
            console.error("Error parsing URL:", error);
            return url.replace(/^https?:\/\//, '').replace(/^www\./, '');
        }
    }

    async function processDomainsData(domainsData, selectedDomain) {
        try {
            domainsContainer.innerHTML = "";
            domainsData.forEach(domain => {
                const radioGroup = document.createElement("div");
                radioGroup.classList.add("d-flex", "flex-line");

                const radio = document.createElement("input");
                radio.type = "radio";
                radio.name = "domains";
                radio.value = domain.id;
                radio.id = domain.id;
                radio.checked = selectedDomain !== undefined && domain.fields.name === selectedDomain;

                const radioLabel = document.createElement('label');
                radioLabel.htmlFor = domain.id;
                radioLabel.innerText = domain.fields.name;

                radio.addEventListener("click", async () => {
                    // Handle radio button click
                });

                radioGroup.appendChild(radio);
                radioGroup.appendChild(radioLabel);
                domainsContainer.appendChild(radioGroup);
            });

            domainsContainer.classList.add("d-flex", "flex-column");
        } catch (error) {
            console.error("Error processing domains data:", error);
        }
    }

    // Additional functions for handling tags, groups, and other data processing can be added here

    spinnerContainer.style.display = "block";
    await refreshPopupWithStorageData();
    spinnerContainer.style.display = "none";

    setListenerOnCancelButton();
    setListenerOnImgUrlInput();
    setListenerOnDomainItems();
    setListenerOnRefreshButton();
    setListenerOnStars();
    setListenerOnForm();
});
