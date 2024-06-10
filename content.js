


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getThumbnail' && request.url) {
        // Ici, vous ajouterez le code pour obtenir la miniature de l'URL
        // Par exemple :
        let thumbnail = fetchThumbnailFromURL(request.url);
        sendResponse({ thumbnail: thumbnail });
    }
});

function fetchThumbnailFromURL(url) {
    // Logic to fetch the thumbnail
    // This is just a placeholder
    //return "data:image/jpeg;base64,..."; // Placeholder for the actual thumbnail data
    return "https://img.freepik.com/free-vector/colorful-pastel-poly-background_53876-62618.jpg"
}

