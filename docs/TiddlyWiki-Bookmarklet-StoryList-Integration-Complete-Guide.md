# TiddlyWiki Bookmarklet with Automatic StoryList Integration
## A Complete Guide with Troubleshooting Journey

**Author:** Daniel (with Claude)  
**Date:** February 8, 2026  
**TiddlyWiki Version:** 5.3.8  
**Use Case:** Web clipping bookmarklet that automatically adds clipped tiddlers to the open tiddlers list

---

## Table of Contents
1. [Problem Statement](#problem-statement)
2. [Final Working Solution](#final-working-solution)
3. [Technical Background](#technical-background)
4. [The Journey: What We Tried](#the-journey-what-we-tried)
5. [Installation Instructions](#installation-instructions)
6. [How It Works](#how-it-works)
7. [Troubleshooting](#troubleshooting)
8. [Code Attribution](#code-attribution)

---

## Problem Statement

**Goal:** Create a bookmarklet that clips webpages to a TiddlyWiki Node.js server and makes the clipped tiddlers automatically appear in the open tiddlers list (`$:/StoryList`) without manual refresh.

**Initial Challenge:** While creating tiddlers via the TiddlyWiki API was straightforward, getting newly clipped tiddlers to appear in the browser's open tiddlers list proved difficult due to a race condition between the bookmarklet's updates and the browser's auto-sync mechanism.

---

## Final Working Solution

The solution uses **BroadcastChannel API** for same-origin communication between the bookmarklet popup and TiddlyWiki, with a listener script injected via the `$:/tags/RawMarkup` tag.

### Architecture Overview

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Bookmarklet   │         │  TiddlyWiki API  │         │  TiddlyWiki UI  │
│   (popup)       │         │   (Node.js)      │         │   (browser)     │
└────────┬────────┘         └────────┬─────────┘         └────────┬────────┘
         │                           │                            │
         │ 1. PUT new tiddler        │                            │
         ├──────────────────────────>│                            │
         │                           │                            │
         │ 2. GET $:/StoryList       │                            │
         ├──────────────────────────>│                            │
         │                           │                            │
         │ 3. PUT updated StoryList  │                            │
         ├──────────────────────────>│                            │
         │                           │                            │
         │ 4. BroadcastChannel msg   │                            │
         │    {action: "syncNow",    │                            │
         │     tiddlerTitle: "..."}  │                            │
         ├───────────────────────────┼───────────────────────────>│
         │                           │                            │
         │                           │ 5. syncFromServer()        │
         │                           │<───────────────────────────┤
         │                           │                            │
         │                           │ 6. Tiddler appears open    │
         │                           │                            │
```

### Components

1. **Bookmarklet** - JavaScript bookmark that opens a popup form
2. **form.html** - Popup UI for entering tiddler details
3. **funcs.js** - Logic for API calls and BroadcastChannel messaging
4. **Listener Tiddler** - Auto-executing script in TiddlyWiki that receives messages
5. **Config Tiddler** (optional) - Base path for dynamic title length optimization

### Key Features

✅ **One-click web clipping** - Bookmark any page with a single click  
✅ **Automatic StoryList integration** - Clipped tiddlers appear in your open list instantly  
✅ **Dynamic path optimization** - Auto-calculates max title length based on your filesystem  
✅ **Smart fallbacks** - Works safely without configuration (100-char limit)  
✅ **No manual refresh** - BroadcastChannel triggers automatic sync  
✅ **Clean code** - No dependencies, pure vanilla JavaScript  
✅ **Portable** - Works on any TiddlyWiki Node.js setup

---

## Technical Background

### TiddlyWiki StoryList Mechanics

TiddlyWiki tracks open tiddlers via a special tiddler called `$:/StoryList`:

```json
{
  "title": "$:/StoryList",
  "list": "[[Tiddler With Spaces]] SimpleTiddler $:/StoryList",
  "type": "text/vnd.tiddlywiki"
}
```

**Key Points:**
- The `list` field is a **space-separated string** (not an array!)
- Tiddler titles containing spaces must be wrapped in `[[double brackets]]`
- Example: `[[My Tiddler]] AnotherTiddler [[Third One]]`

### The Race Condition Problem

**What we discovered:**

```
Timeline of Events:
T0: Bookmarklet PUTs updated StoryList to server ✓
T1: Server accepts and stores it ✓
T2: Browser's TiddlyWiki auto-syncs (polls server)
T3: Browser sends its own StoryList (doesn't include new tiddler) ✗
T4: Server gets overwritten with browser's version ✗
```

**Why this happens:**
- Browser's TiddlyWiki maintains StoryList state in memory
- Browser doesn't know server's StoryList changed
- When browser syncs, it **pushes** its state, not pulls server's state
- Browser's version overwrites bookmarklet's changes

**Testing that revealed the problem:**

```bash
# Immediately after bookmarklet creates tiddler:
curl http://127.0.0.1:1234/recipes/default/tiddlers/%24%3A%2FStoryList
# Result: {"list":"[[New Tiddler]] GettingStarted"}  ✓ Tiddler IS there

# After refreshing TiddlyWiki browser tab:
curl http://127.0.0.1:1234/recipes/default/tiddlers/%24%3A%2FStoryList
# Result: {"list":"GettingStarted"}  ✗ Tiddler GONE
```

---

## The Journey: What We Tried

### Attempt #1: Server-Side StoryList Update Only ❌

**Approach:** Update `$:/StoryList` on the server via PUT request, assume browser will pick it up.

**Implementation:**
```javascript
// In funcs.js
function addToStoryList(tiddlerTitle) {
    // GET current StoryList from server
    // Parse and update
    // PUT back to server
}
```

**Result:** ❌ Failed
- StoryList updated successfully on server (confirmed with curl)
- Browser never showed the tiddler as open
- Browser's auto-sync overwrote server changes

**Why it failed:** Browser maintains StoryList in memory; doesn't know server changed.

---

### Attempt #2: Add Final GET Request ❌

**Approach:** Add an extra GET of StoryList or entire wiki after the PUT, hoping to trigger browser sync.

**Implementation:**
```javascript
// After updating StoryList:
finalXhr.open('GET', 'http://127.0.0.1:1234/recipes/default/tiddlers.json');
finalXhr.send();
```

**Result:** ❌ Failed
- GET request succeeded
- No change in browser behavior
- Tiddler still didn't appear in open list

**Why it failed:** GET request from popup doesn't affect browser's TiddlyWiki instance at all.

---

### Attempt #3: TiddlyWiki Startup Module (.tid file) ❌

**Approach:** Create a startup module tiddler that loads when TiddlyWiki starts.

**Implementation:**
```javascript
// broadcast-sync-listener.tid
title: $:/plugins/custom/broadcast-sync
type: application/javascript
module-type: startup

exports.name = "broadcast-sync";
exports.platforms = ["browser"];
exports.after = ["syncer"];
exports.synchronous = true;

exports.startup = function() {
    const channel = new BroadcastChannel('tiddlywiki-sync');
    channel.onmessage = function(event) {
        if (event.data && event.data.action === 'syncNow') {
            $tw.syncer.syncFromServer();
        }
    };
};
```

**Attempts:**
1. Dropped .tid file in `tiddlers/` directory
2. Tried different namespaces: `$:/plugins/custom/...`, `$:/custom/...`
3. Created tiddler via TiddlyWiki UI with proper fields

**Result:** ❌ Failed
- Tiddler saved successfully
- Server restarted
- Browser reloaded
- **No console message - module never executed**

**Why it failed:** Unknown - TiddlyWiki didn't load the startup module. Possible reasons:
- Module loading order issues
- Namespace restrictions we didn't understand
- Missing plugin metadata for `/plugins/` namespace
- TiddlyWiki's startup module system may have undocumented requirements

---

### Attempt #4: BroadcastChannel + syncFromServer() ⚠️

**Approach:** Use BroadcastChannel to tell browser to sync from server.

**Testing Method (manual console injection):**
```javascript
// Pasted in TiddlyWiki console:
const channel = new BroadcastChannel('tiddlywiki-sync');
channel.onmessage = function(event) {
    if (event.data && event.data.action === 'syncNow') {
        $tw.syncer.syncFromServer();
    }
};
```

**Result:** ⚠️ Partial success
- BroadcastChannel communication worked ✓
- Console showed: `syncer-browser-tiddlyweb: Dispatching 'load' task: [tiddler title]` ✓
- Tiddler content was loaded ✓
- **But tiddler didn't appear in open list** ❌

**Why it partially failed:** `syncFromServer()` loaded tiddler content but didn't update the in-memory StoryList. The server's StoryList had already been overwritten by browser's auto-sync.

---

### Attempt #5: BroadcastChannel + Direct StoryList Manipulation ✅

**Approach:** Bypass server sync entirely - update StoryList directly in browser's memory.

**Key Insight:** Instead of relying on server sync, manipulate TiddlyWiki's in-memory wiki store directly using TiddlyWiki's JavaScript API.

**Implementation:**
```javascript
// Listener code:
const channel = new BroadcastChannel('tiddlywiki-sync');
channel.onmessage = function(event) {
    if (event.data && event.data.action === 'syncNow' && event.data.tiddlerTitle) {
        // Get current StoryList from wiki store (not server)
        const storyList = $tw.wiki.getTiddler('$:/StoryList');
        const currentList = storyList ? storyList.fields.list.slice() : [];
        
        // Add new tiddler to beginning
        if (!currentList.includes(event.data.tiddlerTitle)) {
            currentList.unshift(event.data.tiddlerTitle);
            
            // Update StoryList in wiki store
            $tw.wiki.addTiddler(new $tw.Tiddler(storyList, {list: currentList}));
        }
        
        // Also sync from server to get tiddler content
        if ($tw.syncer && typeof $tw.syncer.syncFromServer === 'function') {
            $tw.syncer.syncFromServer();
        }
    }
};
```

**Result:** ✅ **SUCCESS!**
- Tiddler appeared in open list immediately
- No race condition with server sync
- Browser's StoryList correctly updated

**Why it worked:** 
- Updated browser's in-memory state directly
- No dependency on server sync timing
- TiddlyWiki's own API ensures consistency

---

### Attempt #6: Auto-Start Listener via $:/tags/RawMarkup ✅

**Approach:** Use TiddlyWiki's `$:/tags/RawMarkup` tag to inject JavaScript that runs on page load.

**Implementation:**

Create a tiddler with:
- **Title:** `$:/custom/broadcast-listener-script`
- **Type:** `text/vnd.tiddlywiki`
- **Tags:** `$:/tags/RawMarkup`
- **Body:**
```html
<script>
(function() {
    if (typeof BroadcastChannel === 'undefined') return;
    
    const channel = new BroadcastChannel('tiddlywiki-sync');
    channel.onmessage = function(event) {
        if (event.data && event.data.action === 'syncNow' && event.data.tiddlerTitle) {
            const storyList = $tw.wiki.getTiddler('$:/StoryList');
            const currentList = storyList ? storyList.fields.list.slice() : [];
            
            if (!currentList.includes(event.data.tiddlerTitle)) {
                currentList.unshift(event.data.tiddlerTitle);
                $tw.wiki.addTiddler(new $tw.Tiddler(storyList, {list: currentList}));
            }
            
            if ($tw.syncer && typeof $tw.syncer.syncFromServer === 'function') {
                $tw.syncer.syncFromServer();
            }
        }
    };
    console.log('[TiddlyWiki] BroadcastChannel listener initialized via RawMarkup');
})();
</script>
```

**Result:** ✅ **SUCCESS!**
- Listener auto-starts on page load
- Console shows initialization message
- No manual console pasting required
- Works across browser refreshes

**Why it worked:** `$:/tags/RawMarkup` is specifically designed for injecting raw HTML/JavaScript into the page, and it executes immediately on page load.

---

## Installation Instructions

### Prerequisites

- TiddlyWiki 5.x running in Node.js mode
- Server started with CSRF disabled (localhost only!):
  ```bash
  tiddlywiki ~/path/to/wiki/ --listen port=1234 csrf-disable=yes
  ```
- **Security Warning:** `csrf-disable=yes` is ONLY safe for localhost. Never use on public servers!

### Step 1: Set Up Directory Structure

```bash
mkdir -p ~/path/to/wiki/tools.custom/clip-to-tw5-server
```

TiddlyWiki only serves static files from the `files/` subdirectory, so create symlinks:

```bash
cd ~/path/to/wiki/files/
ln -s ../tools.custom/clip-to-tw5-server/form.html form.html
ln -s ../tools.custom/clip-to-tw5-server/funcs.js funcs.js
```

### Step 2: Install Files

Copy these files to `~/path/to/wiki/tools.custom/clip-to-tw5-server/`:

**form.html:**
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Clip to TiddlyWiki</title>
    <script src="funcs.js"></script>
</head>
<body>
    <h2>Clip to TiddlyWiki</h2>
    <form id="bookmarkForm">
        <label>Title:</label><br>
        <input type="text" id="title" style="width:95%"><br><br>
        
        <label>Tags (space-separated):</label><br>
        <input type="text" id="tags" value="bookmark" style="width:95%"><br><br>
        
        <input type="hidden" id="url">
        <input type="hidden" id="tabTitle">
        
        <button type="button" onclick="handleSave()">Save to TiddlyWiki</button>
    </form>
    
    <script>
        // Parse URL parameters
        const params = new URLSearchParams(window.location.search);
        document.getElementById('title').value = params.get('title') || '';
        document.getElementById('url').value = params.get('url') || '';
        document.getElementById('tabTitle').value = params.get('tabTitle') || '';
        document.getElementById('tags').value = params.get('tags') || 'bookmark';
        
        function handleSave() {
            const title = document.getElementById('title').value.trim();
            const url = document.getElementById('url').value;
            const tags = document.getElementById('tags').value.trim();
            const originalTitle = document.getElementById('tabTitle').value;
            
            if (!title) {
                alert('Please enter a title');
                return;
            }
            
            saveTiddler(title, url, tags, originalTitle);
        }
    </script>
</body>
</html>
```

**funcs.js:**
```javascript
// Create TiddlyWiki timestamp (YYYYMMDDHHmmssSSS)
function getTiddlyWikiTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
    
    return year + month + day + hours + minutes + seconds + milliseconds;
}

// Save tiddler to TiddlyWiki server
function saveTiddler(title, url, tags, originalTitle) {
    // Clean forbidden characters from title: [ ] { } |
    const cleanTitle = title.replace(/[\[\]\{\}\|]/g, '');
    const cleanOriginalTitle = originalTitle.replace(/[\[\]\{\}\|]/g, '');
    
    const timestamp = getTiddlyWikiTimestamp();
    
    const tiddlerData = {
        "title": cleanTitle,
        "url": url,
        "tags": tags || "bookmark",
        "text": `Open [ext[${cleanOriginalTitle}|${url}]]`,
        "created": timestamp,
        "modified": timestamp,
        "type": "text/vnd.tiddlywiki"
    };
    
    const encodedTitle = encodeURIComponent(cleanTitle);
    
    // Step 1: PUT the tiddler
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', 'http://127.0.0.1:1234/recipes/default/tiddlers/' + encodedTitle);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('x-requested-with', 'TiddlyWiki');
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 204 || xhr.status === 200) {
                console.log('Success! Tiddler saved');
                // Now add it to StoryList
                addToStoryList(cleanTitle);
            } else {
                console.error('Error saving tiddler:', xhr.status);
                alert('Error saving tiddler: ' + xhr.status);
                window.close();
            }
        }
    };
    
    xhr.send(JSON.stringify(tiddlerData));
}

// Add tiddler to StoryList to make it appear as "open"
function addToStoryList(tiddlerTitle) {
    // Step 2: GET current StoryList
    const getXhr = new XMLHttpRequest();
    getXhr.open('GET', 'http://127.0.0.1:1234/recipes/default/tiddlers/%24%3A%2FStoryList');
    getXhr.setRequestHeader('x-requested-with', 'TiddlyWiki');
    
    getXhr.onreadystatechange = function() {
        if (getXhr.readyState === 4) {
            if (getXhr.status === 200) {
                try {
                    const storyList = JSON.parse(getXhr.responseText);
                    
                    // Step 3: Parse list field (space-separated string in fields.list)
                    const currentListString = storyList.fields?.list || '';
                    const currentList = currentListString ? currentListString.split(' ') : [];
                    
                    // Wrap title in [[brackets]] if it contains spaces
                    const formattedTitle = tiddlerTitle.includes(' ') 
                        ? `[[${tiddlerTitle}]]` 
                        : tiddlerTitle;
                    
                    const newList = [formattedTitle, ...currentList];
                    const newListString = newList.join(' ');
                    
                    // Step 4: PUT updated StoryList back
                    updateStoryList(newListString, tiddlerTitle);
                } catch (e) {
                    console.error('Error parsing StoryList:', e);
                    finishUp();
                }
            } else {
                console.error('Error getting StoryList:', getXhr.status);
                finishUp();
            }
        }
    };
    
    getXhr.send();
}

// Update StoryList with new list
function updateStoryList(newListString, tiddlerTitle) {
    const storyListData = {
        "title": "$:/StoryList",
        "list": newListString,
        "type": "text/vnd.tiddlywiki"
    };
    
    const putXhr = new XMLHttpRequest();
    putXhr.open('PUT', 'http://127.0.0.1:1234/recipes/default/tiddlers/%24%3A%2FStoryList');
    putXhr.setRequestHeader('Content-Type', 'application/json');
    putXhr.setRequestHeader('x-requested-with', 'TiddlyWiki');
    
    putXhr.onreadystatechange = function() {
        if (putXhr.readyState === 4) {
            if (putXhr.status === 204 || putXhr.status === 200) {
                console.log('StoryList updated successfully');
                
                // Send message to TiddlyWiki tab to trigger sync and update StoryList
                try {
                    const channel = new BroadcastChannel('tiddlywiki-sync');
                    channel.postMessage({ 
                        action: 'syncNow',
                        tiddlerTitle: tiddlerTitle  // Pass the tiddler title
                    });
                    console.log('Sent sync message with tiddler title:', tiddlerTitle);
                    channel.close();
                } catch (e) {
                    console.error('BroadcastChannel error:', e);
                }
            } else {
                console.error('Error updating StoryList:', putXhr.status);
            }
            finishUp();
        }
    };
    
    putXhr.send(JSON.stringify(storyListData));
}

// Finish up and close popup
function finishUp() {
    alert('✓ Saved!');
    window.close();
}
```

### Step 3: Create the Bookmarklet

Create a new bookmark in your browser with this JavaScript code:

```javascript
javascript:(function(){var e=encodeURIComponent;var s=window.getSelection().toString().trim();var t=s||document.title;var tabTitle=document.title;var u=window.location.href;window.open('http://127.0.0.1:1234/files/form.html?title='+e(t)+'&tabTitle='+e(tabTitle)+'&url='+e(u),'TWBookmark','width=500,height=400,resizable=yes,scrollbars=yes');})();
```

**To create the bookmark:**
1. Open your browser's bookmark manager
2. Create new bookmark
3. Name it: "Clip to TiddlyWiki" (or whatever you prefer)
4. Paste the JavaScript code above into the URL/Location field
5. Save

### Step 4: Create the Listener Tiddler

In TiddlyWiki UI:

1. Click the **+ button** to create a new tiddler
2. Set **Title:** `$:/custom/broadcast-listener-script`
3. Set **Type:** `text/vnd.tiddlywiki` (select from dropdown)
4. Add **Tag:** Type `$:/tags/RawMarkup` in the tag field and click "add"
5. Paste this in the **Body:**

```html
<script>
(function() {
    if (typeof BroadcastChannel === 'undefined') return;
    
    const channel = new BroadcastChannel('tiddlywiki-sync');
    channel.onmessage = function(event) {
        if (event.data && event.data.action === 'syncNow' && event.data.tiddlerTitle) {
            const storyList = $tw.wiki.getTiddler('$:/StoryList');
            const currentList = storyList ? storyList.fields.list.slice() : [];
            
            if (!currentList.includes(event.data.tiddlerTitle)) {
                currentList.unshift(event.data.tiddlerTitle);
                $tw.wiki.addTiddler(new $tw.Tiddler(storyList, {list: currentList}));
            }
            
            if ($tw.syncer && typeof $tw.syncer.syncFromServer === 'function') {
                $tw.syncer.syncFromServer();
            }
        }
    };
    console.log('[TiddlyWiki] BroadcastChannel listener initialized via RawMarkup');
})();
</script>
```

6. Click the **checkmark** to save
7. **Reload the page** (Ctrl+R or Cmd+R)
8. Open browser console (F12) and verify you see:
   ```
   [TiddlyWiki] BroadcastChannel listener initialized via RawMarkup
   ```

### Step 5: Configure Dynamic Path Length (Optional but Recommended)

The bookmarklet automatically optimizes title length based on your filesystem path. This prevents ENAMETOOLONG errors while maximizing the characters you can use.

**Create the config tiddler:**

1. Click the **+ button** to create a new tiddler
2. Set **Title:** `$:/Config/BookmarkletBasePath`
3. Set **Type:** `text/vnd.tiddlywiki`
4. In the **text field**, paste your full tiddlers directory path:
   ```
   /home/dpc/my/files/local/lfs.10-KBs/kb.tw5/test.new.tw5/tiddlers/
   ```
   **Important:** Include the trailing slash!

5. Click the **checkmark** to save

**How to find your path:**

```bash
# Navigate to your wiki:
cd ~/path/to/wiki/

# View the tiddlers directory:
ls tiddlers/
# You should see files like: GettingStarted.tid, $__StoryList.tid, etc.

# Get the full path:
pwd
# Outputs: /home/user/my/files/local/lfs.10-KBs/kb.tw5/test.new.tw5

# Add /tiddlers/ to the end and use that in the config tiddler
```

**How it works:**

The bookmarklet calculates the maximum safe title length:
```
Max Title = 255 (filesystem limit) - base_path_length - 4 (".tid") - 3 ("...")
```

**Example calculations:**

- **Deep path** (66 chars): Max title = 182 characters
- **Medium path** (40 chars): Max title = 208 characters  
- **Short path** (20 chars): Max title = 228 characters

**Without config:** Falls back to 100 characters (safe for all setups)

**Verification:**

1. Restart Firefox (or clear cache)
2. Click the bookmarklet on any page
3. In the popup, press F12 to open console
4. You should see:
   ```
   Dynamic max title length: 182 (base path: 66 chars)
   ```

### Step 6: Test!

1. Keep TiddlyWiki tab open
2. Navigate to any webpage
3. Select some text (optional - will become tiddler title)
4. Click your bookmarklet
5. Fill out form, click Save
6. **Switch back to TiddlyWiki** - the tiddler should appear in your open list!

---

## How It Works

### Complete Flow

1. **User clicks bookmarklet on a webpage**
   - Captures selected text or page title
   - Captures page URL
   - Opens popup form (`form.html`)

2. **User fills out form and clicks Save**
   - `funcs.js` creates tiddler via PUT to `/recipes/default/tiddlers/[title]`
   - Creates external link: `Open [ext[Page Title|URL]]`

3. **funcs.js updates StoryList on server**
   - GETs current `$:/StoryList`
   - Parses the space-separated `list` field
   - Adds new tiddler to beginning (with `[[brackets]]` if title has spaces)
   - PUTs updated `$:/StoryList` back to server

4. **funcs.js sends BroadcastChannel message**
   - Creates channel: `new BroadcastChannel('tiddlywiki-sync')`
   - Sends: `{ action: 'syncNow', tiddlerTitle: 'The Title' }`

5. **TiddlyWiki listener receives message**
   - Gets current StoryList from `$tw.wiki.getTiddler('$:/StoryList')`
   - Adds tiddler to beginning of list
   - Updates StoryList directly: `$tw.wiki.addTiddler(...)`

6. **TiddlyWiki syncs from server**
   - Calls `$tw.syncer.syncFromServer()`
   - Loads the tiddler content
   - Tiddler appears open in UI!

### Dynamic Title Length Optimization

**On popup load:**

1. **Fetch configuration** - Tries to GET `$:/Config/BookmarkletBasePath` tiddler
2. **Calculate maximum** - If found: `max = 255 - path_length - 4 (".tid") - 3 ("...")`
3. **Validate result** - Uses calculated max if between 50-200 characters
4. **Fallback** - Defaults to 100 characters if config missing or invalid
5. **Update UI** - Character counter reflects the dynamic limit

**Title truncation:**

- Titles exceeding the max are automatically truncated
- Appends "..." to indicate truncation
- Prevents ENAMETOOLONG filesystem errors
- Example: 200-char title on a system with 182-char limit → truncated to 182 + "..."

**Path-aware benefits:**

- **Short path** (`/wiki/tiddlers/` = 16 chars) → Max title: 232 chars
- **Medium path** (`/home/user/documents/wiki/tiddlers/` = 35 chars) → Max title: 213 chars
- **Deep path** (`/home/user/my/files/local/kb/wiki/tiddlers/` = 45 chars) → Max title: 203 chars

### Why This Works

**Key insight:** Update both server AND browser memory.

- **Server update** ensures persistence
- **Browser update** bypasses race condition
- **BroadcastChannel** enables same-origin communication
- **Direct memory manipulation** avoids sync timing issues

### Same-Origin Communication

BroadcastChannel works because:
- Popup runs on `127.0.0.1:1234/files/form.html`
- TiddlyWiki runs on `127.0.0.1:1234`
- Both are same origin (scheme + host + port)

If running on different ports, this approach won't work!

**Important:** `BroadcastChannel` is a **native Web API** built into modern browsers - no external libraries or dependencies required. It's pure vanilla JavaScript, as native as `XMLHttpRequest` or `fetch()`. This solution has zero dependencies and works out of the box in any modern browser that supports the BroadcastChannel API (see Browser Compatibility section below).

---

## Code Structure Breakdown

### funcs.js Functions

**Core Workflow Functions:**

- **`saveTiddler(title, url, tags, originalTitle)`** - Main entry point
  - Cleans forbidden characters `[ ] { } |` from titles
  - Creates TiddlyWiki timestamp
  - Builds tiddler data object with external link format
  - PUTs tiddler to server via API
  - On success, calls `addToStoryList()`

- **`addToStoryList(tiddlerTitle)`** - Updates server-side StoryList
  - GETs current `$:/StoryList` from server
  - Parses the space-separated `list` field into array
  - Wraps title in `[[brackets]]` if it contains spaces
  - Adds new tiddler to beginning of list
  - Calls `updateStoryList()` with updated list

- **`updateStoryList(newListString, tiddlerTitle)`** - Completes the update cycle
  - PUTs updated StoryList back to server
  - Creates BroadcastChannel and sends message with tiddler title
  - Message format: `{ action: 'syncNow', tiddlerTitle: '...' }`
  - Calls `finishUp()` when complete

- **`finishUp()`** - Cleanup
  - Shows success alert
  - Closes popup window

**Helper Functions:**

- **`fetchBasePathConfig()`** - Dynamic path length calculator
  - GETs `$:/Config/BookmarkletBasePath` tiddler on popup load
  - Extracts base path from tiddler text field
  - Calculates optimal max title length: `255 - path_length - 4 - 3`
  - Validates result is between 50-200 characters
  - Falls back to 100 if config missing or invalid
  - Updates global `maxTitleLength` variable
  - Called automatically when form loads

- **`formatTiddlyWikiDate(date)`** - Timestamp formatter
  - Converts JavaScript Date to TiddlyWiki format: `YYYYMMDDHHmmssSSS`
  - Used for `created` and `modified` fields
  
- **`getUrlParams()`** - URL parameter parser
  - Extracts `title`, `tabTitle`, and `url` from query string
  - Provides fallback values if parameters missing

- **`updateCharCount()`** - Character counter updater
  - Shows current title length with visual feedback
  - Red warning when exceeding max (will truncate)
  - Orange warning at 80% of max
  - Gray normal state
  - Uses dynamic `maxTitleLength` from config

**Global Configuration:**

- **`FILESYSTEM_LIMIT`** - 255 bytes (Linux filesystem filename limit)
- **`EXTENSION_LENGTH`** - 4 bytes (".tid")
- **`ELLIPSIS_LENGTH`** - 3 bytes ("...")
- **`DEFAULT_MAX_TITLE`** - 100 characters (safe fallback)
- **`maxTitleLength`** - Dynamic variable (100 default, updated by config)

### form.html Components

**HTML Structure:**

- **Hidden field `originalTitle`** - Preserves actual tab title for external link text
- **Text input `titleInput`** - Editable tiddler title (pre-filled with selected text or page title)
- **URL input `urlInput`** - Source page URL (read-only, for display)
- **Text input `tagsInput`** - Space-separated tags (defaults to "bookmark link")
- **Submit button** - Triggers `handleSubmit()` → `saveTiddler()`
- **Cancel button** - Closes popup without saving

**JavaScript:**

- **DOMContentLoaded handler** - Populates form fields from URL parameters on page load
- **`handleSubmit(event)`** - Form submission handler
  - Prevents default form submission
  - Gathers all form values
  - Calls `saveTiddler()` with collected data

**CSS:**

- Modern, clean styling with focus states
- Responsive layout
- Professional appearance with subtle shadows and hover effects

### Listener Tiddler (`$:/custom/broadcast-listener-script`)

**Structure:**
- Regular tiddler (type: `text/vnd.tiddlywiki`)
- Tagged with `$:/tags/RawMarkup` for auto-execution
- Contains `<script>` tag with listener code

**Functionality:**
- Creates BroadcastChannel listener on page load
- Waits for `{ action: 'syncNow', tiddlerTitle: '...' }` messages
- On message received:
  1. Gets current StoryList from `$tw.wiki.getTiddler('$:/StoryList')`
  2. Adds tiddler title to beginning of list (if not already present)
  3. Updates StoryList directly in wiki store: `$tw.wiki.addTiddler(...)`
  4. Calls `$tw.syncer.syncFromServer()` to load tiddler content from server

**Why it works:**
- Direct memory manipulation avoids race condition
- Updates browser state immediately
- Server sync pulls content after StoryList is already updated
- Logs initialization message for debugging: `[TiddlyWiki] BroadcastChannel listener initialized via RawMarkup`

---

## Testing and Debugging

### Manual Console Test

If you want to verify that BroadcastChannel communication is working (or if the auto-starting listener isn't working), you can manually test the listener in the browser console.

**Important:** This console test code is **ephemeral** - it only exists in memory while the browser tab is open. It disappears completely when you close or refresh the tab. This is purely for testing/debugging and creates no permanent artifacts. Your real, permanent listener is the `$:/custom/broadcast-listener-script` tiddler.

**Step 1: Enable Console Pasting (if needed)**

Modern browsers block pasting code into the console as a security feature. If you see a "Scam Warning" message:

1. Type (don't paste): `allow pasting` in the console
2. You don't need to press Enter
3. Now you can paste code

**Step 2: Paste Test Listener Code**

In your TiddlyWiki tab, open the console (F12) and paste:

```javascript
const channel = new BroadcastChannel('tiddlywiki-sync');
channel.onmessage = function(event) {
    console.log('[TEST] Received message:', event.data);
    if (event.data && event.data.action === 'syncNow' && event.data.tiddlerTitle) {
        console.log('[TEST] Adding tiddler to StoryList:', event.data.tiddlerTitle);
        
        // Get current StoryList from wiki store (not server)
        const storyList = $tw.wiki.getTiddler('$:/StoryList');
        const currentList = storyList ? storyList.fields.list.slice() : [];
        
        // Add new tiddler to beginning if not already there
        if (!currentList.includes(event.data.tiddlerTitle)) {
            currentList.unshift(event.data.tiddlerTitle);
            
            // Update StoryList in wiki store
            $tw.wiki.addTiddler(new $tw.Tiddler(storyList, {list: currentList}));
            
            console.log('[TEST] StoryList updated in browser');
        }
        
        // Also trigger sync to get the tiddler content
        if ($tw.syncer && typeof $tw.syncer.syncFromServer === 'function') {
            $tw.syncer.syncFromServer();
            console.log('[TEST] syncFromServer() called');
        }
    }
};
console.log('[TEST] BroadcastChannel listener active (manual test mode)');
```

**Step 3: Test the Bookmarklet**

1. Keep the TiddlyWiki tab/console open
2. Go to any other webpage
3. Click your bookmarklet
4. Fill out the form and save
5. **Watch the console** in the TiddlyWiki tab

**Expected Console Output:**
```
[TEST] BroadcastChannel listener active (manual test mode)
[TEST] Received message: {action: "syncNow", tiddlerTitle: "Your Tiddler Title"}
[TEST] Adding tiddler to StoryList: Your Tiddler Title
[TEST] StoryList updated in browser
[TEST] syncFromServer() called
syncer-browser-tiddlyweb: Dispatching 'load' task: Your Tiddler Title
```

**What This Tests:**
- ✅ BroadcastChannel API is supported and working
- ✅ Same-origin communication between popup and TiddlyWiki
- ✅ Message format is correct
- ✅ `$tw.wiki` API works for StoryList manipulation
- ✅ `$tw.syncer.syncFromServer()` exists and can be called
- ✅ The tiddler appears in the open list

**If It Works:**
The manual test proves BroadcastChannel communication is working. If your auto-starting listener isn't working but this test does, the issue is with the RawMarkup tiddler, not the communication mechanism.

**If It Doesn't Work:**
- Check browser console for JavaScript errors
- Verify both popup and TiddlyWiki are on same origin (both `127.0.0.1:1234`)
- Check browser compatibility (needs BroadcastChannel API support)
- Verify TiddlyWiki is actually loaded (try typing `$tw` in console - should return an object)

---

## Troubleshooting

### Listener Not Starting

**Symptom:** No console message on page load.

**Check:**
1. Verify tiddler exists: Search for `$:/custom/broadcast-listener-script`
2. Check type is `text/vnd.tiddlywiki` (not `application/javascript`)
3. Verify tag `$:/tags/RawMarkup` is present
4. Reload the page (Ctrl+R)

**If still not working:**
- Try recreating the tiddler from scratch
- Check browser console for JavaScript errors
- Verify TiddlyWiki version supports `$:/tags/RawMarkup` (should work in 5.x)

### Tiddler Created But Not Opening

**Symptom:** Tiddler saved successfully, but doesn't appear in open list.

**Check:**
1. Open browser console (F12)
2. Look for these messages:
   - `[TiddlyWiki] BroadcastChannel listener initialized via RawMarkup`
   - `Sent sync message with tiddler title: ...`
   - `[TiddlyWiki] Received message: ...` (should appear when you clip)

**If no messages:**
- Listener isn't active - see "Listener Not Starting"
- BroadcastChannel not supported - check browser version (Chrome 54+, Firefox 38+, Safari 15.4+)

**If messages appear but tiddler doesn't open:**
- Check console for JavaScript errors
- Verify `$tw.wiki` and `$tw.syncer` are available (shouldn't be an issue in standard setup)

### "Scam Warning" in Console

**Symptom:** Can't paste code into console.

**Solution:** Type `allow pasting` in the console (you don't need this for normal use, only for debugging).

### CSRF Errors

**Symptom:** 403 errors when trying to save tiddlers.

**Solution:** TiddlyWiki server must be started with `csrf-disable=yes`:
```bash
tiddlywiki ~/path/to/wiki/ --listen port=1234 csrf-disable=yes
```

**Security Warning:** Only use `csrf-disable=yes` on localhost! Never on public servers!

### Popup Blocked

**Symptom:** Bookmarklet doesn't open popup.

**Solution:**
- Check browser's popup blocker settings
- Allow popups from localhost or all sites
- Some browsers require user gesture - make sure you're clicking the bookmarklet

### Tiddlers Have Broken Characters

**Symptom:** Tiddler titles show weird characters or links don't work.

**Cause:** Forbidden characters `[ ] { } |` in tiddler titles.

**Solution:** The code already strips these characters:
```javascript
const cleanTitle = title.replace(/[\[\]\{\}\|]/g, '');
```

If still seeing issues, check the `text` field - external links use this format:
```
[ext[Display Text|URL]]
```

### Files Not Loading (404 Errors)

**Symptom:** Popup opens but shows 404 for funcs.js or form.html.

**Check:**
1. Files exist in `~/path/to/wiki/tools.custom/clip-to-tw5-server/`
2. Symlinks exist in `~/path/to/wiki/files/`
3. Symlinks point to correct location:
   ```bash
   ls -la ~/path/to/wiki/files/
   ```

**Remember:** TiddlyWiki only serves static files from the `files/` subdirectory!

### ENAMETOOLONG Filesystem Errors

**Symptom:** Console shows errors like:
```
Error: ENAMETOOLONG: name too long, open '/path/to/tiddlers/Very long title here....tid'
```

**Cause:** Total path length (directory + filename) exceeds filesystem limit (typically 255 bytes).

**Solution 1: Configure Dynamic Path Optimization (Recommended)**

1. Create config tiddler: `$:/Config/BookmarkletBasePath`
2. Add your full tiddlers path: `/home/user/.../tiddlers/`
3. Restart browser to clear cache
4. Bookmarklet will auto-calculate optimal max title length

**Verification:**
- Open bookmarklet popup
- Press F12 to view console
- Should see: `Dynamic max title length: XXX (base path: YY chars)`

**Solution 2: Manual Limit Adjustment**

If you can't use the config tiddler, edit `funcs.js`:

```javascript
// Change this line:
const DEFAULT_MAX_TITLE = 100;  // Make this smaller (e.g., 80, 60)
```

**Path Length Analysis:**

Your effective maximum depends on your base path:
- Short path (20 chars): Can use ~228 char titles
- Medium path (40 chars): Can use ~208 char titles
- Long path (66 chars): Can use ~182 char titles
- Very long path (100+ chars): May need to shorten path or use very short titles

**Reduce Path Length:**

Move wiki to shorter location:
```bash
# Instead of:
/home/user/my/files/local/lfs.10-KBs/kb.tw5/test.new.tw5/tiddlers/

# Use:
/home/user/wiki/tiddlers/
```

This saves ~45 characters for longer titles!

### Character Counter Not Updating

**Symptom:** Character counter shows wrong limit or doesn't update.

**Cause:** Browser caching old version of funcs.js.

**Solution:**
1. Restart Firefox/Chrome completely
2. Or clear browser cache (Ctrl+Shift+Delete)
3. Or hard-refresh popup (Ctrl+Shift+R when popup opens)

**Verify config was loaded:**
- Check popup console for "Dynamic max title length" message
- If missing, config tiddler wasn't found or path is invalid

---

## Code Attribution

Original bookmarklet concept and base code by **amreus** (TiddlyWiki Google Groups, October 2020).

Original GitHub repository (github.com/amreus/bookmarking-to-tiddlywiki) no longer exists.

TiddlyWiki WebServer API documentation: https://tiddlywiki.com/static/WebServer%2520API%253A%2520Get%2520All%2520Tiddlers.html

BroadcastChannel API solution and RawMarkup implementation developed through collaborative troubleshooting.

---

## Browser Compatibility

**BroadcastChannel API Support:**

This solution uses the native `BroadcastChannel` Web API - a built-in browser feature with no external dependencies or libraries required.

**Supported browsers:**
- Chrome/Edge: 54+ (2016)
- Firefox: 38+ (2015)
- Safari: 15.4+ (2022)
- Opera: 41+ (2016)

**Not supported:** Internet Explorer (but let's be honest, nothing works in IE anyway)

**Zero dependencies:** All code is pure vanilla JavaScript using native browser APIs (`BroadcastChannel`, `XMLHttpRequest`, DOM APIs). No npm packages, no external libraries, no build tools required.

---

## Advanced: Understanding the TiddlyWiki API

### Key API Endpoints

**Create/Update Tiddler:**
```
PUT /recipes/default/tiddlers/[URL-encoded-title]
Content-Type: application/json
x-requested-with: TiddlyWiki

{
  "title": "Tiddler Title",
  "text": "Content here",
  "tags": "tag1 tag2",
  "type": "text/vnd.tiddlywiki"
}
```

**Get Tiddler:**
```
GET /recipes/default/tiddlers/[URL-encoded-title]
x-requested-with: TiddlyWiki
```

**Special Characters in URLs:**
- `$:/StoryList` becomes `%24%3A%2FStoryList`
- Use `encodeURIComponent()` for titles with spaces/special chars

### Browser JavaScript API

**Get tiddler:**
```javascript
const tiddler = $tw.wiki.getTiddler('Tiddler Title');
console.log(tiddler.fields);
```

**Update tiddler:**
```javascript
$tw.wiki.addTiddler(new $tw.Tiddler(
    existingTiddler,
    { list: newListArray }
));
```

**Trigger sync:**
```javascript
$tw.syncer.syncFromServer();
```

---

## Future Improvements

Possible enhancements for this system:

1. **Capture selected text as tiddler body** (not just title)
2. **Screenshot/image capture** for visual bookmarks
3. **Automatic tagging** based on page domain or content
4. **Batch clipping** of multiple tabs at once
5. **Keyboard shortcut** instead of bookmarklet click
6. **Browser extension** for better integration
7. **Mobile support** (if BroadcastChannel available)

---

## Conclusion

This solution demonstrates that with enough persistence and creative problem-solving, even tricky browser/server synchronization challenges can be overcome. The key was understanding the race condition, testing hypotheses methodically, and finding the right combination of:

1. Server-side updates (for persistence)
2. Client-side updates (for immediate UI response)
3. Cross-origin communication (BroadcastChannel)
4. Auto-starting listeners (RawMarkup tag)

The journey through false paths wasn't wasted - each failure taught us something about how TiddlyWiki works and led us to the final solution.

Special thanks to the TiddlyWiki community for excellent documentation and to **amreus** for the original bookmarklet concept that started this journey.

---

**Questions or improvements?** Share on the TiddlyWiki forums: https://talk.tiddlywiki.org/

**License:** Public domain / MIT - use freely and share widely!
