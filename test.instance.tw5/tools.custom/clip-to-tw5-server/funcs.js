// funcs.js - Helper functions for TiddlyWiki bookmarking (Production Hardened)
// Location: ~/my/files/local/lfs.10-KBs/kb.tw5/test.new.tw5/files/
//
// Adapted from code snippets by 'amreus' (TiddlyWiki Google Groups, Oct 2020)
// and TiddlyWiki WebServer API documentation

// Global configuration
const FILESYSTEM_LIMIT = 255;
const EXTENSION_LENGTH = 4;    // ".tid"
const DEFAULT_MAX_ENCODED = 100; // Safe fallback for encoded length
const MAX_RETRIES = 3;         // Network request retries

// Dynamic max encoded length (updated on load from config tiddler)
let maxEncodedLength = DEFAULT_MAX_ENCODED;

// Sanitize title for cross-platform filesystem compatibility
function sanitizeTitle(title) {
    return title
        // Remove forbidden characters (cross-platform: Windows + Linux + macOS)
        .replace(/[\[\]\{\}\|<>"\\\*?]/g, '')  // Modified to allow colon (':') and slash ('/') characters.
        // Remove control characters (0x00-0x1F)
        .replace(/[\x00-\x1F\x7F]/g, '')
        // Remove trailing dots (Windows strips these)
        .replace(/\.+$/g, '')
        // Remove leading/trailing spaces
        .trim()
        // Escape Windows reserved names (CON, PRE, AUX, NUL, COM1-9, LPT1-9)
        .replace(/^(CON|PRE|AUX|NUL|COM[1-9]|LPT[1-9])$/i, '$1_')
        // Replace multiple spaces with single space
        .replace(/\s+/g, ' ');
}

// Truncate title based on URL-encoded length
function truncateToEncodedLength(title, maxEncodedBytes) {
    let encoded = encodeURIComponent(title);
    
    if (encoded.length <= maxEncodedBytes) {
        return title; // No truncation needed
    }
    
    // Truncate encoded string
    let truncated = encoded.substring(0, maxEncodedBytes);
    
    // Be careful not to cut in the middle of a %XX sequence
    // If we end with %, remove it
    while (truncated.length > 0 && truncated.endsWith('%')) {
        truncated = truncated.slice(0, -1);
    }
    // If we end with %X (incomplete sequence), remove both
    if (truncated.length > 1 && truncated[truncated.length - 2] === '%') {
        truncated = truncated.slice(0, -2);
    }
    
    try {
        // Decode back to get the actual title
        return decodeURIComponent(truncated);
    } catch (e) {
        // If decode fails, we cut in a bad spot, back up more
        console.warn('Decode failed during truncation, backing up further');
        if (maxEncodedBytes > 10) {
            return truncateToEncodedLength(title, maxEncodedBytes - 3);
        }
        // Fallback: just use first 50 chars
        return title.substring(0, 50);
    }
}

// Fetch base path from config tiddler and calculate max encoded length
function fetchBasePathConfig() {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'http://127.0.0.1:1234/recipes/default/tiddlers/%24%3A%2FConfig%2FBookmarkletBasePath');
    xhr.setRequestHeader('x-requested-with', 'TiddlyWiki');
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    const config = JSON.parse(xhr.responseText);
                    const basePath = config.fields?.text || config.text || '';
                    
                    if (basePath) {
                        const basePathLength = basePath.length;
                        // Calculate max based on encoded filename length
                        // 255 bytes for filename - base path - ".tid" extension
                        const calculatedMax = FILESYSTEM_LIMIT - basePathLength - EXTENSION_LENGTH;
                        
                        // Use calculated max if it's reasonable (between 50 and 240)
                        if (calculatedMax >= 50 && calculatedMax <= 240) {
                            maxEncodedLength = calculatedMax;
                            console.log(`Dynamic max encoded length: ${maxEncodedLength} bytes (base path: ${basePathLength} chars)`);
                        } else {
                            console.warn(`Calculated max (${calculatedMax}) out of range, using default: ${DEFAULT_MAX_ENCODED}`);
                        }
                    }
                } catch (e) {
                    console.warn('Error parsing base path config:', e);
                }
            } else {
                console.log(`Base path config not found, using default max: ${DEFAULT_MAX_ENCODED}`);
            }
            
            // Update character counter after fetching config
            if (typeof updateCharCount === 'function') {
                updateCharCount();
            }
        }
    };
    
    xhr.send();
}

// Make HTTP request with retry logic
function makeRequest(method, url, data, callback, retryCount = 0) {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    
    if (data) {
        xhr.setRequestHeader('Content-Type', 'application/json');
    }
    xhr.setRequestHeader('x-requested-with', 'TiddlyWiki');
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200 || xhr.status === 204) {
                callback(null, xhr);
            } else if (retryCount < MAX_RETRIES && (xhr.status === 0 || xhr.status >= 500)) {
                // Retry on network errors or server errors
                console.warn(`Request failed (status ${xhr.status}), retrying... (${retryCount + 1}/${MAX_RETRIES})`);
                setTimeout(() => {
                    makeRequest(method, url, data, callback, retryCount + 1);
                }, 1000 * (retryCount + 1)); // Exponential backoff
            } else {
                callback(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`), xhr);
            }
        }
    };
    
    xhr.onerror = function() {
        if (retryCount < MAX_RETRIES) {
            console.warn(`Network error, retrying... (${retryCount + 1}/${MAX_RETRIES})`);
            setTimeout(() => {
                makeRequest(method, url, data, callback, retryCount + 1);
            }, 1000 * (retryCount + 1));
        } else {
            callback(new Error('Network error after retries'), xhr);
        }
    };
    
    xhr.send(data ? JSON.stringify(data) : null);
}

function saveTiddler(title, url, tags, originalTitle) {
    // Sanitize and clean title for filesystem compatibility
    let cleanTitle = sanitizeTitle(title);
    
    // Validate we have a title after sanitization
    if (!cleanTitle || cleanTitle.length === 0) {
        alert('Error: Title is empty after sanitization. Please use a different title.');
        return;
    }
    
    // Truncate title based on URL-encoded length
    // Reserve 10 bytes for "..." suffix when encoded
    const maxForTitle = maxEncodedLength - 10;
    const truncatedTitle = truncateToEncodedLength(cleanTitle, maxForTitle);
    
    // Add ellipsis if truncated
    if (truncatedTitle.length < cleanTitle.length) {
        cleanTitle = truncatedTitle + '...';
    } else {
        cleanTitle = truncatedTitle;
    }
    
    const cleanOriginalTitle = sanitizeTitle(originalTitle);  // Tab title for link text
    
    // Build tiddler data
    const now = new Date();
    const timestamp = formatTiddlyWikiDate(now);
    
    const tiddlerData = {
        "title": cleanTitle,
        "url": url,
        "tags": tags || "bookmark",
        "text": `Open [ext[${cleanOriginalTitle}|${url}]]`,
        "created": timestamp,
        "modified": timestamp,
        "type": "text/x-markdown"
    };
    
    // Send to server with retry logic
    const encodedTitle = encodeURIComponent(cleanTitle);
    const tiddlerUrl = 'http://127.0.0.1:1234/recipes/default/tiddlers/' + encodedTitle;
    
    makeRequest('PUT', tiddlerUrl, tiddlerData, function(err, xhr) {
        if (err) {
            console.error('Error saving tiddler:', err);
            alert(`✗ Error: ${err.message}\n\nCheck console for details.\n\nMake sure server is running with csrf-disable=yes`);
        } else {
            console.log('Success! Tiddler saved: ' + cleanTitle);
            // Now add to StoryList
            addToStoryList(cleanTitle);
        }
    });
}

// Add tiddler to StoryList to make it appear as "open"
function addToStoryList(tiddlerTitle) {
    const storyListUrl = 'http://127.0.0.1:1234/recipes/default/tiddlers/%24%3A%2FStoryList';
    
    makeRequest('GET', storyListUrl, null, function(err, xhr) {
        if (err) {
            console.error('Error getting StoryList:', err);
            finishUp();
            return;
        }
        
        try {
            const storyList = JSON.parse(xhr.responseText);
            
            // Parse list field (space-separated string in fields.list)
            const currentListString = storyList.fields?.list || '';
            const currentList = currentListString ? currentListString.split(' ') : [];
            
            // Wrap title in [[brackets]] if it contains spaces
            const formattedTitle = tiddlerTitle.includes(' ') 
                ? `[[${tiddlerTitle}]]` 
                : tiddlerTitle;
            
            const newList = [formattedTitle, ...currentList];
            const newListString = newList.join(' ');
            
            // PUT updated StoryList back
            updateStoryList(newListString, tiddlerTitle);
        } catch (e) {
            console.error('Error parsing StoryList:', e);
            finishUp();
        }
    });
}

// Update StoryList with new list
function updateStoryList(newListString, tiddlerTitle) {
    const storyListUrl = 'http://127.0.0.1:1234/recipes/default/tiddlers/%24%3A%2FStoryList';
    
    const storyListData = {
        "title": "$:/StoryList",
        "list": newListString,
        "type": "text/vnd.tiddlywiki"
    };
    
    makeRequest('PUT', storyListUrl, storyListData, function(err, xhr) {
        if (err) {
            console.error('Error updating StoryList:', err);
        } else {
            console.log('StoryList updated successfully');
            
            // Send message to TiddlyWiki tab to trigger sync and update StoryList
            sendSyncMessage(tiddlerTitle);
        }
        finishUp();
    });
}

// Send sync message via BroadcastChannel (with fallback)
function sendSyncMessage(tiddlerTitle) {
    if (typeof BroadcastChannel === 'undefined') {
        console.warn('BroadcastChannel not supported in this browser');
        // Fallback: just log. User will need to refresh manually.
        console.log('Please refresh TiddlyWiki tab to see the new tiddler');
        return;
    }
    
    try {
        const channel = new BroadcastChannel('tiddlywiki-sync');
        channel.postMessage({ 
            action: 'syncNow',
            tiddlerTitle: tiddlerTitle
        });
        console.log('Sent sync message with tiddler title:', tiddlerTitle);
        channel.close();
    } catch (e) {
        console.error('BroadcastChannel error:', e);
        console.log('Tiddler saved but may not appear immediately. Try refreshing TiddlyWiki.');
    }
}

// Finish up and close popup
function finishUp() {
    alert('✓ Saved!');
    window.close();
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
        tabTitle: params.get('tabTitle') || params.get('title') || 'Untitled',
        url: params.get('url') || ''
    };
}
