# BroadcastChannel Sync - Installation Instructions

## What This Does
When you clip a webpage using the bookmarklet, it now sends a message via BroadcastChannel to any open TiddlyWiki tabs, telling them to sync from the server. This should make your newly clipped tiddler appear in the open tiddlers list automatically.

## Files Updated

### 1. funcs.js (updated)
- Removed the redundant final GET operation
- Added BroadcastChannel message sending after StoryList update
- Sends: `{ action: 'syncNow' }` on channel `tiddlywiki-sync`

### 2. broadcast-sync-listener.tid (NEW)
- TiddlyWiki startup module that listens for BroadcastChannel messages
- Triggers `$tw.syncer.syncFromServer()` when it receives `syncNow` message

## Installation Steps

### Step 1: Update funcs.js
Copy the new `funcs.js` to your TiddlyWiki:
```bash
cp funcs.js ~/my/files/local/lfs.10-KBs/kb.tw5/test.new.tw5/tools.custom/clip-to-tw5-server/
```

### Step 2: Install the Listener Tiddler
Copy the `.tid` file to your TiddlyWiki's tiddlers directory:
```bash
cp broadcast-sync-listener.tid ~/my/files/local/lfs.10-KBs/kb.tw5/test.new.tw5/tiddlers/
```

### Step 3: Restart TiddlyWiki Server
The startup module only loads when TiddlyWiki starts:
```bash
# Stop your current TiddlyWiki server (Ctrl+C)
# Then restart it:
tiddlywiki ~/my/files/local/lfs.10-KBs/kb.tw5/test.new.tw5/ --listen port=1234 csrf-disable=yes
```

### Step 4: Test
1. Open TiddlyWiki in your browser: http://127.0.0.1:1234
2. Open browser console (F12) - you should see:
   ```
   [TiddlyWiki] BroadcastChannel listener initialized
   ```
3. Navigate to any webpage
4. Click your bookmarklet
5. Fill out the form and save
6. Check console - you should see:
   ```
   [TiddlyWiki] Received sync message, triggering syncFromServer()
   ```
7. The tiddler should appear in your open tiddlers list immediately!

## Troubleshooting

**Console shows "syncer.syncFromServer not available":**
- This means the syncer isn't initialized yet
- Try reloading the TiddlyWiki page

**No "[TiddlyWiki] BroadcastChannel listener initialized" message:**
- Check that the .tid file is in the tiddlers directory
- Verify the server was restarted after adding the file
- Check file permissions

**BroadcastChannel not supported:**
- All modern browsers support it (Chrome 54+, Firefox 38+, Safari 15.4+)
- If using an old browser, fallback to manual refresh or new tab approach

## How It Works
1. Bookmarklet popup runs on `127.0.0.1:1234/files/form.html`
2. TiddlyWiki runs on `127.0.0.1:1234`
3. Both are same-origin, so BroadcastChannel can communicate
4. Popup sends message → TiddlyWiki receives → calls syncFromServer()
5. TiddlyWiki pulls latest tiddlers from server, including updated StoryList
