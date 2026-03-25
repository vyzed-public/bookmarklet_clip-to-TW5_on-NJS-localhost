// funcs.js - Helper functions for TiddlyWiki bookmarking
//
// Adapted for port 1234

function saveTiddler(title, url, tags) {
    // Clean title of forbidden characters
    const cleanTitle = title.replace(/[\[\]\{\}\|]/g, '');
    
    // Build tiddler data
    const now = new Date();
    const timestamp = formatTiddlyWikiDate(now);
    
    const tiddlerData = {
        "title": cleanTitle,
        "url": url,
        "tags": tags || "bookmark",
        "created": timestamp,
        "modified": timestamp,
        "type": "text/vnd.tiddlywiki"
    };
    
    // Send to server
    const xhr = new XMLHttpRequest();
    const encodedTitle = encodeURIComponent(cleanTitle);
    
    xhr.open('PUT', 'http://127.0.0.1:1234/recipes/default/tiddlers/' + encodedTitle);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('x-requested-with', 'TiddlyWiki');
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 204 || xhr.status === 200) {
                console.log('Success! Tiddler saved: ' + cleanTitle);
                alert('✓ Saved: ' + cleanTitle);
                window.close(); // Close popup on success
            } else {
                console.error('Error saving tiddler');
                console.error('Status: ' + xhr.status);
                console.error('Response: ' + xhr.responseText);
                alert('✗ Error: ' + xhr.status + '\n\nCheck console for details.\n\nMake sure server is running with csrf-disable=yes');
            }
        }
    };
    
    xhr.send(JSON.stringify(tiddlerData));
}

// Format date as TiddlyWiki timestamp: YYYYMMDDHHmmssSSS
function formatTiddlyWikiDate(date) {
    const pad = (n, width) => String(n).padStart(width, '0');
    
    return pad(date.getFullYear(), 4) +
           pad(date.getMonth() + 1, 2) +
           pad(date.getDate(), 2) +
           pad(date.getHours(), 2) +
           pad(date.getMinutes(), 2) +
           pad(date.getSeconds(), 2) +
           pad(date.getMilliseconds(), 3);
}

// Parse URL parameters
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        title: params.get('title') || 'Untitled',
        url: params.get('url') || ''
    };
}