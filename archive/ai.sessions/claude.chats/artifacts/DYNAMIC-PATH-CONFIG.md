# Dynamic Path Length Configuration

The bookmarklet now automatically calculates the maximum title length based on your TiddlyWiki's filesystem path!

## How It Works

The bookmarklet checks for a config tiddler (`$:/Config/BookmarkletBasePath`) that contains your TiddlyWiki tiddlers directory path. It uses this to calculate the optimal maximum title length:

```
Max Title = 255 (filesystem limit) - base_path_length - 4 (".tid") - 3 ("...")
```

**Without config:** Falls back to 100 characters (safe for everyone)  
**With config:** Automatically optimized for your specific path!

## Setup Instructions

### Option 1: Create via TiddlyWiki UI (Recommended)

1. In TiddlyWiki, click the **+ button** to create a new tiddler
2. Set **Title:** `$:/Config/BookmarkletBasePath`
3. Set **Type:** `text/vnd.tiddlywiki` (should be default)
4. In the **text field**, paste your full tiddlers directory path:
   ```
   /home/dpc/my/files/local/lfs.10-KBs/kb.tw5/test.new.tw5/tiddlers/
   ```
   **Important:** Include the trailing slash!
5. Click the **checkmark** to save
6. **Reload your browser** - the bookmarklet will now use the optimized limit

### Option 2: Import the .tid File

1. Copy `example-base-path-config.tid` to your tiddlers directory:
   ```bash
   cp example-base-path-config.tid ~/my/files/local/lfs.10-KBs/kb.tw5/test.new.tw5/tiddlers/
   ```
2. Edit the file and update the path to match your setup
3. Restart TiddlyWiki server
4. Reload browser

### How to Find Your Path

Your path is where your `.tid` files are stored. For example:

```bash
# Find where your wiki is:
cd ~/my/files/local/lfs.10-KBs/kb.tw5/test.new.tw5/

# The tiddlers directory:
ls tiddlers/
# You should see files like: GettingStarted.tid, $__StoryList.tid, etc.

# Your full path is:
pwd
# Outputs: /home/dpc/my/files/local/lfs.10-KBs/kb.tw5/test.new.tw5

# Add /tiddlers/ to the end:
# /home/dpc/my/files/local/lfs.10-KBs/kb.tw5/test.new.tw5/tiddlers/
```

Copy that full path into the config tiddler.

## Example Calculations

**Your current setup:**
- Base path: `/home/dpc/my/files/local/lfs.10-KBs/kb.tw5/test.new.tw5/tiddlers/` (66 chars)
- Max title: 255 - 66 - 4 - 3 = **182 characters**

**Shorter path example:**
- Base path: `/home/user/wiki/tiddlers/` (24 chars)
- Max title: 255 - 24 - 4 - 3 = **224 characters**

**Very long path example:**
- Base path: `/home/user/documents/projects/knowledge-base/tiddlywiki/production/tiddlers/` (78 chars)
- Max title: 255 - 78 - 4 - 3 = **170 characters**

## Verification

After setting up the config:

1. Open your bookmarklet popup
2. Check the browser console (F12)
3. You should see:
   ```
   Dynamic max title length: 182 (base path: 66 chars)
   ```
4. The character counter in the popup will show your optimized limit

## Safety Limits

The code includes sanity checks:
- Calculated max must be between 50-200 characters
- If outside this range, falls back to 100 (safe default)
- This prevents issues from misconfigured paths

## Fallback Behavior

If the config tiddler doesn't exist or can't be read:
- Uses default max of 100 characters
- Console shows: "Base path config not found, using default max: 100"
- Everything still works, just with conservative limits

## Benefits

✅ **Automatic optimization** - No manual math required  
✅ **Path-independent** - Move your wiki, update one tiddler  
✅ **Safe defaults** - Works without config  
✅ **Portable** - Share config with teammates  
✅ **Flexible** - Reconfigure anytime without code changes