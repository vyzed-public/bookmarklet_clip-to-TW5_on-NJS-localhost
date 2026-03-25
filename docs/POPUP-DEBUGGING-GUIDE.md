# Popup Form Debugging Techniques

A practical guide to debugging JavaScript in popup windows, with techniques discovered during TiddlyWiki bookmarklet development.

---

## Table of Contents
1. [The Challenge: Popup Windows That Auto-Close](#the-challenge)
2. [Technique 1: Keep Window Open Override](#technique-1-keep-window-open)
3. [Technique 2: Function Wrapper Debugging](#technique-2-function-wrapper-debugging)
4. [Technique 3: Network Tab Monitoring](#technique-3-network-tab-monitoring)
5. [Technique 4: Verifying Loaded Code](#technique-4-verifying-loaded-code)
6. [Cache-Busting Techniques: Complete Guide](#cache-busting-techniques-complete-guide)
7. [Technique 5: Live Variable Inspection](#technique-5-live-variable-inspection)
8. [Real-World Example: Complete Debugging Session](#real-world-example)
9. [Quick Reference: Debugging Cheat Sheet](#quick-reference-debugging-cheat-sheet)

---

## The Challenge

**Problem:** Popup windows that close automatically after form submission make debugging impossible:
- Console output disappears
- Network requests can't be inspected
- Variable states are lost
- Error messages vanish

**Traditional solutions don't work:**
- `event.preventDefault()` - Only prevents default form behavior, not `window.close()`
- Breakpoints - Hard to set before popup closes
- External debugging - Popup runs in separate context

**We need better techniques!**

---

## Technique 1: Keep Window Open Override

### The Problem

Your code calls `window.close()` or has a cleanup function like this:

```javascript
function finishUp() {
    alert('✓ Saved!');
    window.close();  // ← Popup disappears!
}
```

### The Solution

**Override the function at runtime** in the browser console:

```javascript
// Paste this in the popup's console BEFORE clicking submit
finishUp = function() { 
    alert('✓ Saved! (window kept open for debugging)'); 
}
```

### How It Works

1. JavaScript functions are just variables
2. You can reassign them at runtime
3. The new version replaces the old one
4. Your code calls the new version instead

### When to Use

- ✅ Before submitting a form that closes the popup
- ✅ When you need to inspect Network tab after submission
- ✅ When debugging multi-step workflows
- ✅ When testing error handling

### Example Variations

**Keep window open and log success:**
```javascript
finishUp = function() { 
    console.log('SUCCESS: finishUp called');
    alert('Saved! Window stays open.'); 
}
```

**Keep window open silently (no alert):**
```javascript
finishUp = function() { 
    console.log('finishUp called - window kept open'); 
}
```

**Add delay before closing (for quick inspection):**
```javascript
finishUp = function() { 
    alert('Saved! Window will close in 10 seconds...');
    setTimeout(() => window.close(), 10000);
}
```

---

## Technique 2: Function Wrapper Debugging

### The Problem

You can't see what data is being passed to your functions:
- What arguments are being sent?
- What values are returned?
- Is the function even being called?

### The Solution

**Wrap the function with debug logging:**

```javascript
// 1. Save reference to original function
originalFunctionName = functionName;

// 2. Replace with wrapper that logs everything
functionName = function(arg1, arg2, arg3) {
    console.log("=== DEBUG functionName ===");
    console.log("Argument 1:", arg1);
    console.log("Argument 2:", arg2);
    console.log("Argument 3:", arg3);
    
    // Call original and capture return value
    const result = originalFunctionName(arg1, arg2, arg3);
    
    console.log("Return value:", result);
    return result;
}
```

### Complete Real-World Example

From our TiddlyWiki debugging session:

```javascript
// Paste this in popup console before clicking Save
originalSaveTiddler = saveTiddler;

saveTiddler = function(title, url, tags, originalTitle) {
    console.log("=== DEBUG saveTiddler ===");
    console.log("Input title:", title);
    console.log("Input title length:", title.length);
    
    // Your custom debugging logic
    let cleanTitle = title.replace(/[\[\]\{\}\|]/g, '');
    console.log("After cleaning:", cleanTitle);
    console.log("After cleaning length:", cleanTitle.length);
    
    const maxTitleLength = 183;
    console.log("maxTitleLength:", maxTitleLength);
    
    if (cleanTitle.length > maxTitleLength) {
        cleanTitle = cleanTitle.substring(0, maxTitleLength).trim() + '...';
        console.log("TRUNCATED to:", cleanTitle);
        console.log("TRUNCATED length:", cleanTitle.length);
    } else {
        console.log("NO TRUNCATION NEEDED");
    }
    
    // Call original with modified arguments
    return originalSaveTiddler(cleanTitle, url, tags, originalTitle);
}
```

### What This Reveals

**Before wrapper:**
```
Success! Tiddler saved: [some long title]
```
No idea what's happening internally! ❌

**With wrapper:**
```
=== DEBUG saveTiddler ===
Input title: redbean is an open source webserver in a single-file...
Input title length: 843
After cleaning: redbean is an open source webserver in a single-file...
After cleaning length: 843
maxTitleLength: 183
TRUNCATED to: redbean is an open source webserver in a single-file that runs natively on six OSes for both AMD64 and ARM64. Basic idea is if you want to build a web app that runs anywhere, then you...
TRUNCATED length: 186
Success! Tiddler saved: redbean is an open source...
```

**Now we see the problem!** The truncation IS happening (186 chars), but 186 is still too long! ✓

### Advanced: Conditional Logging

Only log when certain conditions are met:

```javascript
originalSaveTiddler = saveTiddler;

saveTiddler = function(title, url, tags, originalTitle) {
    // Only log if title is longer than 100 chars
    if (title.length > 100) {
        console.log("=== LONG TITLE DETECTED ===");
        console.log("Length:", title.length);
        console.log("Title:", title);
    }
    
    return originalSaveTiddler(title, url, tags, originalTitle);
}
```

### Advanced: Performance Timing

See how long functions take:

```javascript
originalSaveTiddler = saveTiddler;

saveTiddler = function(title, url, tags, originalTitle) {
    const startTime = performance.now();
    
    const result = originalSaveTiddler(title, url, tags, originalTitle);
    
    const endTime = performance.now();
    console.log(`saveTiddler took ${endTime - startTime}ms`);
    
    return result;
}
```

---

## Technique 3: Network Tab Monitoring

### The Problem

Form submissions trigger network requests, but the popup closes before you can inspect them.

### The Solution

**Combine with Technique 1** to keep window open:

1. Open popup
2. Open DevTools (F12) → **Network tab**
3. Paste window-keep-open override:
   ```javascript
   finishUp = function() { alert('Saved! Window open.'); }
   ```
4. Click Save
5. **Inspect requests in Network tab**

### What to Look For

**Request URL:**
- Is the endpoint correct?
- Are URL parameters encoded properly?
- Example: `/recipes/default/tiddlers/My%20Title`

**Request Headers:**
- Content-Type: `application/json`
- Custom headers: `x-requested-with: TiddlyWiki`

**Request Payload (Body):**
- Click the request → **Request** tab
- View the JSON being sent
- Example:
  ```json
  {
    "title": "My Truncated Title...",
    "text": "Content here",
    "tags": "bookmark link"
  }
  ```

**Response:**
- Status code: 200/204 = success, 403 = CSRF error, 500 = server error
- Response body: Error messages
- Timing: How long did it take?

### Pro Tip: Preserve Log

In Network tab, check **"Preserve log"** - requests persist even if page would normally reload!

---

## Technique 4: Verifying Loaded Code

### The Problem

You updated your JavaScript file, but the browser cached the old version!

### The Solution

**Check what code is actually running:**

```javascript
// See the actual function code loaded in memory
functionName.toString()
```

### Example

**What you expect to see:**
```javascript
saveTiddler.toString()
// Returns:
"function saveTiddler(title, url, tags, originalTitle) {
    let cleanTitle = title.replace(/[\[\]\{\}\|]/g, '');
    
    // Truncate if too long
    if (cleanTitle.length > maxTitleLength) {
        cleanTitle = cleanTitle.substring(0, maxTitleLength).trim() + '...';
    }
    
    // ... rest of function
}"
```

**What you actually see (cached old version):**
```javascript
saveTiddler.toString()
// Returns:
"function saveTiddler(title, url, tags, originalTitle) {
    let cleanTitle = title.replace(/[\[\]\{\}\|]/g, '');
}
    // Truncate... (code is OUTSIDE function due to syntax error!)
"
```

**Aha!** The truncation code isn't inside the function - there's a syntax error with an extra closing brace! The browser is running old broken code.

### When to Use

- ✅ After updating files - verify browser loaded new version
- ✅ When function behavior doesn't match source code
- ✅ When debugging cache issues
- ✅ Before/after cache-busting changes

### Cache-Busting Solution

If code is wrong, force browser to reload:

**Option 1: Query parameter (recommended)**
```html
<!-- In HTML file -->
<script src="funcs.js?v=2"></script>  <!-- Was: funcs.js?v=1 -->
```

Browser sees different URL → forces fresh download!

**Option 2: Hard refresh**
- Ctrl+Shift+R (Windows/Linux)
- Cmd+Shift+R (Mac)

**Option 3: Disable cache in DevTools**
- F12 → Network tab → Check "Disable Cache"
- Only works while DevTools is open

---

## Cache-Busting Techniques: Complete Guide

### The Cache Problem

**Why caching happens:**
- Browsers cache JavaScript/CSS/images for performance
- Servers (like TiddlyWiki's Node.js) may cache static files
- Multiple layers of caching make updates difficult

**The frustration:**
```
You: "I updated the code!"
Browser: "Here's the old version you asked for." 🤷
```

### Level 1: Browser-Side Cache Busting

#### 1A. Query Parameter Versioning (Best Practice)

**How it works:** Change the URL, browser treats it as a new file

```html
<!-- Version 1 -->
<script src="funcs.js?v=1"></script>

<!-- Version 2 -->
<script src="funcs.js?v=2"></script>

<!-- Version 3 -->
<script src="funcs.js?v=3"></script>
```

**Why it works:** 
- `funcs.js?v=1` and `funcs.js?v=2` are treated as different URLs
- Server ignores the `?v=2` part, serves same file
- Browser cache is keyed by full URL → cache miss → fresh download

**Pros:**
- ✅ Works reliably
- ✅ No user action required
- ✅ Version control built-in
- ✅ Can rollback by changing version number

**Cons:**
- ❌ Must edit HTML file for each update
- ❌ Doesn't help if HTML itself is cached

**When to use:** Production deployments, when you control the HTML

---

#### 1B. Timestamp Cache Busting (Automated)

**How it works:** Use current timestamp as version

```html
<script src="funcs.js?t=1707598234"></script>
```

**Generate dynamically:**

**Server-side (Node.js):**
```javascript
const timestamp = Date.now();
res.send(`<script src="funcs.js?t=${timestamp}"></script>`);
```

**Client-side (in bookmarklet):**
```javascript
const timestamp = Date.now();
window.open(`http://127.0.0.1:1234/files/form.html?t=${timestamp}`, ...);
```

**Pros:**
- ✅ Automatic - no manual version bumping
- ✅ Guarantees fresh load every time
- ✅ Works for development

**Cons:**
- ❌ No browser caching at all (slower)
- ❌ Can't rollback to previous version

**When to use:** Development, when you want guaranteed fresh loads

---

#### 1C. Hash-Based Cache Busting (Build Tools)

**How it works:** File content hash in filename

```html
<script src="funcs.a3f2d9e8.js"></script>  <!-- Hash of file contents -->
```

**Generated by build tools:**
- Webpack: `[name].[contenthash].js`
- Vite: Automatic
- Gulp/Grunt: Plugins available

**Pros:**
- ✅ Perfect caching: same content = cache hit, different content = fresh load
- ✅ Can deploy multiple versions simultaneously
- ✅ Long-term caching with instant updates

**Cons:**
- ❌ Requires build tools
- ❌ More complex setup

**When to use:** Production apps with build pipeline

---

#### 1D. Hard Refresh (Manual)

**How it works:** Browser bypasses cache for one request

**Shortcuts:**
- **Windows/Linux:** Ctrl + Shift + R
- **Mac:** Cmd + Shift + R
- **Alternative:** Ctrl + F5

**What it does:**
- Adds `Cache-Control: no-cache` header to request
- Forces server to send fresh file
- Clears cache for that specific page

**Pros:**
- ✅ Quick for development
- ✅ No code changes needed
- ✅ Works immediately

**Cons:**
- ❌ Manual action required
- ❌ Only clears cache for current page/tab
- ❌ User must know to do this

**When to use:** Quick development testing

---

#### 1E. DevTools Cache Disable

**How it works:** Disables cache while DevTools is open

**Steps:**
1. Open DevTools (F12)
2. Go to **Network** tab
3. Check **"Disable Cache"** checkbox
4. Keep DevTools open while testing

**Pros:**
- ✅ Great for development
- ✅ Always get fresh files
- ✅ No code changes needed

**Cons:**
- ❌ Only works with DevTools open
- ❌ Easy to forget it's enabled
- ❌ Slower page loads

**When to use:** Active debugging sessions

---

#### 1F. Clear Site Data (Nuclear Option)

**How it works:** Delete all cached data for a specific site

**Method 1: Via Address Bar**
1. Click lock/info icon in address bar
2. Click "Clear Cookies and Site Data"
3. Confirm

**Method 2: Via Settings**
1. Settings → Privacy & Security
2. Cookies and Site Data → Manage Data
3. Search for your domain (e.g., "127.0.0.1")
4. Remove all
5. Save changes

**Method 3: Via about:cache (Firefox)**
1. Navigate to `about:cache`
2. Find cached entries
3. (View only - can't delete from here)

**Pros:**
- ✅ Clears everything
- ✅ Site-specific (doesn't clear other sites)

**Cons:**
- ❌ Also clears cookies, localStorage, etc.
- ❌ Manual process
- ❌ Tedious for frequent testing

**When to use:** Stubborn cache issues, when other methods fail

---

#### 1G. Full Browser Restart

**How it works:** Close all browser windows, reopen

**What it clears:**
- Memory cache
- Session cache
- Some in-memory state

**What it doesn't clear:**
- Disk cache (usually)
- Cookies
- localStorage

**Pros:**
- ✅ Simple
- ✅ Clears memory leaks
- ✅ Resets browser state

**Cons:**
- ❌ Loses all open tabs (unless restore session enabled)
- ❌ Doesn't always clear disk cache
- ❌ Time-consuming

**When to use:** When nothing else works, suspect memory issues

---

### Level 2: Server-Side Cache Busting

#### 2A. Restart Server (Node.js)

**The problem:** Some servers cache static files in memory

**TiddlyWiki Node.js example:**
```bash
# Stop server
Ctrl+C

# Restart
tiddlywiki ~/path/to/wiki/ --listen port=1234 csrf-disable=yes
```

**When TiddlyWiki caches:**
- Static files served from `/files/` directory
- May cache file handles or contents
- Symlink changes might not be detected

**Pros:**
- ✅ Guaranteed fresh file serving
- ✅ Clears all server-side state

**Cons:**
- ❌ Interrupts service
- ❌ Clients must reconnect

**When to use:** 
- After updating files via symlinks
- When browser cache is clear but old code still loads
- Suspect server-side caching

---

#### 2B. Disable Server Caching (Development)

**Node.js example:**
```javascript
app.use(express.static('public', {
    etag: false,
    maxAge: 0,
    setHeaders: (res) => {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.set('Expires', '0');
        res.set('Pragma', 'no-cache');
    }
}));
```

**Headers explained:**
- `Cache-Control: no-store` - Don't store in any cache
- `no-cache` - Revalidate with server each time
- `must-revalidate` - Don't use stale cache
- `Expires: 0` - Already expired
- `Pragma: no-cache` - HTTP/1.0 compatibility

**Pros:**
- ✅ Guaranteed fresh files in development
- ✅ No manual cache clearing needed

**Cons:**
- ❌ Slower performance
- ❌ Only for development (don't use in production!)

---

### Level 3: Hybrid Approaches

#### 3A. Development vs Production Strategy

**Development:** No caching, fast iteration
```html
<script src="funcs.js?t=<%- Date.now() %>"></script>
```

**Production:** Aggressive caching, versioned files
```html
<script src="funcs.js?v=1.2.3"></script>
```

**Benefits:**
- Fast development (no cache clearing)
- Fast production (long-term caching)

---

#### 3B. Cache-Busting Bookmarklet Wrapper

**Problem:** You can't modify the HTML file easily

**Solution:** Cache-bust in the bookmarklet itself

```javascript
// Old bookmarklet
javascript:(function(){
    window.open('http://127.0.0.1:1234/files/form.html?title=...');
})();

// Cache-busting bookmarklet
javascript:(function(){
    const cb = Date.now();  // Cache buster
    window.open(`http://127.0.0.1:1234/files/form.html?title=...&_cb=${cb}`);
})();
```

**Result:** Form HTML is always fresh, which loads the latest JavaScript!

**Pros:**
- ✅ No HTML file editing needed
- ✅ Users always get fresh code

**Cons:**
- ❌ No caching benefit
- ❌ Slightly longer URLs

---

### Troubleshooting: Why Cache Busting Failed

#### Checklist When Cache Busting Doesn't Work

**1. Is the file actually updated on disk?**
```bash
# Check file modification time
ls -la ~/path/to/file.js

# View file contents
cat ~/path/to/file.js | head -20
```

**2. Are you editing the right file?**
- Symlinks pointing to wrong location?
- Multiple copies of the file?
- Editing source instead of deployed version?

**3. Is the server serving the updated file?**
```bash
# Fetch file directly with curl
curl http://127.0.0.1:1234/files/funcs.js | head -20

# Should match your edited version
```

**4. Is the cache-buster reaching the browser?**
- View page source
- Check if `?v=3` appears in HTML
- Inspect Network tab - does request include version?

**5. Multiple caching layers?**
- Browser cache ← Hard refresh clears
- Server cache ← Restart server clears
- Proxy/CDN cache ← May need to purge
- Service Worker cache ← Unregister service worker

**6. Did you verify the loaded code?**
```javascript
// In browser console
functionName.toString()  // Check actual code in memory
```

---

### Our Real-World Cache Battle: A Timeline

This is what we actually went through:

**Attempt 1: Edit files on disk**
```bash
cp funcs.js ~/path/to/wiki/tools.custom/clip-to-tw5-server/
```
✅ File updated ❌ Browser still loads old version

**Attempt 2: Hard refresh (Ctrl+Shift+R)**
❌ Still old version

**Attempt 3: Clear Firefox cache (Settings)**
❌ STILL old version! 😤

**Attempt 4: Full Firefox restart**
❌ STILL OLD VERSION!! 🤬

**Attempt 5: Restart TiddlyWiki server**
❌ What is going on?!

**Attempt 6: Verify file with `.toString()`**
```javascript
saveTiddler.toString()
// Shows OLD code with syntax error!
```
😱 Browser is definitely loading old cached version

**Attempt 7: Add cache-busting query parameter**
```html
<script src="funcs.js?v=2"></script>
```
✅ **SUCCESS!** Fresh code loaded!

**Lesson learned:** Sometimes only cache-busting query parameters work when browsers are REALLY stubborn!

---

### Best Practices Summary

**For Development:**
1. Use DevTools "Disable Cache"
2. Use timestamp cache-busting: `?t=${Date.now()}`
3. Restart server after file changes
4. Verify with `.toString()` before debugging

**For Production:**
1. Use version numbers: `?v=1.2.3`
2. Update version on each release
3. Long-term browser caching
4. Consider build tools with hash-based filenames

**When Stuck:**
1. Verify file on disk is actually updated
2. Check server is serving updated file (curl)
3. Use `.toString()` to see what browser has loaded
4. Try query parameter cache-busting
5. Last resort: Clear all site data + restart browser

---

## Technique 5: Live Variable Inspection

### The Problem

You need to check variable values at runtime, but don't want to modify source code.

### The Solution

**Inspect variables directly in console:**

```javascript
// Check if variable exists
typeof variableName  // "undefined" if not defined

// Get current value
variableName

// Check object properties
someObject.propertyName

// Check global variables (attached to window)
window.maxTitleLength
```

### Example Debugging Session

**Problem:** Title truncation not working

**Investigation:**
```javascript
// 1. Check if maxTitleLength is set
>> maxTitleLength
<< 183

// 2. Check if it's the right value
>> typeof maxTitleLength
<< "number"

// 3. Test truncation logic manually
>> let testTitle = "very long title here...";
>> testTitle.length
<< 250

>> if (testTitle.length > maxTitleLength) {
     console.log("Would truncate!");
   }
<< "Would truncate!"

// 4. Verify the actual function behavior
>> saveTiddler.toString()
<< "function saveTiddler(title, url, tags) { let cleanTitle = title... }"
   // Hmm, truncation code is missing!
```

**Conclusion:** The `maxTitleLength` variable is correct, but `saveTiddler()` doesn't use it! Browser is running old cached version.

---

## Real-World Example: Complete Debugging Session

This is the actual debugging process we used to solve the ENAMETOOLONG error:

### Phase 1: Identify the Problem

**Symptom:**
```
Error: ENAMETOOLONG: name too long, open '.../tiddlers/Very long title here....tid'
```

**Initial hypothesis:** Title too long for filesystem (255 byte limit)

### Phase 2: Keep Window Open

```javascript
// Pasted in popup console
finishUp = function() { alert('✓ Saved! (window kept open)'); }
```

**Result:** Popup stays open after clicking Save ✓

### Phase 3: Add Debug Wrapper

```javascript
originalSaveTiddler = saveTiddler;

saveTiddler = function(title, url, tags, originalTitle) {
    console.log("=== DEBUG saveTiddler ===");
    console.log("Input title:", title);
    console.log("Input title length:", title.length);
    
    let cleanTitle = title.replace(/[\[\]\{\}\|]/g, '');
    console.log("After cleaning:", cleanTitle);
    console.log("After cleaning length:", cleanTitle.length);
    console.log("maxTitleLength:", maxTitleLength);
    
    if (cleanTitle.length > maxTitleLength) {
        cleanTitle = cleanTitle.substring(0, maxTitleLength).trim() + '...';
        console.log("TRUNCATED to:", cleanTitle);
        console.log("TRUNCATED length:", cleanTitle.length);
    } else {
        console.log("NO TRUNCATION NEEDED");
    }
    
    return originalSaveTiddler(cleanTitle, url, tags, originalTitle);
}
```

**Output:**
```
=== DEBUG saveTiddler ===
Input title: redbean is an open source webserver in a single-file...
Input title length: 843
After cleaning: redbean is an open source webserver...
After cleaning length: 843
maxTitleLength: 183
TRUNCATED to: redbean is an open source webserver in a single-file that runs natively on six OSes for both AMD64 and ARM64. Basic idea is if you want to build a web app that runs anywhere, then you...
TRUNCATED length: 186
```

**Discovery:** Truncation IS working! Title is cut to 186 chars (183 + "..."). But error still happens!

### Phase 4: Binary Search for Limit

```javascript
// Test different limits
maxTitleLength = 150;  // Still fails
maxTitleLength = 120;  // Works!
maxTitleLength = 140;  // Fails
maxTitleLength = 136;  // Works!
maxTitleLength = 137;  // Fails
```

**Discovery:** Real limit is 136-137 characters, NOT 183!

### Phase 5: Root Cause Analysis

**Question:** Why is the limit lower than expected?

**Hypothesis:** URL encoding! Spaces become `%20` (3 bytes instead of 1)

**Test:**
```javascript
>> let title = "redbean is an open source webserver";
>> let encoded = encodeURIComponent(title);
>> console.log("Original:", title.length);
<< Original: 40
>> console.log("Encoded:", encoded.length);
<< Encoded: 52
>> console.log("Difference:", encoded.length - title.length);
<< Difference: 12
```

**40 characters with 6 spaces → 52 encoded bytes!**

**Conclusion:** We need to truncate based on **encoded** length, not character count!

### Phase 6: Implement Solution

Created `truncateToEncodedLength()` function that:
1. URL-encodes the title first
2. Truncates the encoded string
3. Decodes back to get the real title

**Result:** No more ENAMETOOLONG errors! ✓

---

## Quick Reference: Debugging Cheat Sheet

### Keep Popup Open
```javascript
finishUp = function() { alert('Window stays open'); }
```

### Wrap Function with Debug Logging
```javascript
originalFunc = func;
func = function(...args) {
    console.log("=== DEBUG func ===");
    console.log("Arguments:", args);
    const result = originalFunc(...args);
    console.log("Return:", result);
    return result;
}
```

### Check Variable Value
```javascript
variableName
typeof variableName
```

### Verify Loaded Code
```javascript
functionName.toString()
```

### Cache-Busting Quick Fixes

**Query parameter (edit HTML):**
```html
<script src="file.js?v=2"></script>  <!-- Increment version -->
```

**Timestamp (in bookmarklet):**
```javascript
const cb = Date.now();
window.open(`http://127.0.0.1:1234/files/form.html?_cb=${cb}`);
```

**Hard refresh:**
- Ctrl+Shift+R (Windows/Linux)
- Cmd+Shift+R (Mac)

**DevTools disable cache:**
- F12 → Network → Check "Disable Cache"

**Clear site data:**
- Click lock icon in address bar → Clear data

**Restart server:**
```bash
# Ctrl+C to stop
tiddlywiki ~/path/to/wiki/ --listen port=1234
```

**Verify file update:**
```bash
curl http://127.0.0.1:1234/files/funcs.js | head -20
```

### Test Logic Manually
```javascript
let testInput = "sample data";
// Run your logic here
console.log("Result:", result);
```

### Monitor Network Requests
1. F12 → Network tab
2. Keep window open override
3. Click Save
4. Inspect requests

---

## Best Practices

### Do's ✓
- **Save originals** before overriding functions
- **Use descriptive log messages** with clear separators
- **Test in isolation** - one variable/function at a time
- **Document your findings** as you debug
- **Combine techniques** for complex issues
- **Verify loaded code** with `.toString()` before debugging
- **Use cache-busting** during development (query parameters or timestamps)
- **Check file on disk** before blaming the browser

### Don'ts ✗
- **Don't modify source files** for debugging (use console overrides)
- **Don't assume cached code is fresh** (always verify with `.toString()`)
- **Don't debug blind** (use wrappers to see what's happening)
- **Don't give up** when popups close (use keep-open override)
- **Don't fight cache issues** - use query parameter cache-busting instead
- **Don't forget to restart server** after updating static files

---

## Conclusion

These techniques saved hours of debugging during TiddlyWiki bookmarklet development. The key insights:

1. **You don't need to modify source code** to debug - use runtime overrides and wrappers!
2. **Cache is your enemy in development** - use query parameter versioning or timestamps
3. **Always verify loaded code** with `.toString()` before trusting your edits
4. **Combine techniques** for maximum effectiveness

**Most powerful combination:**
1. Keep window open override (Technique 1)
2. Function wrapper debugging (Technique 2)
3. Cache-busting query parameters (for reliable code updates)
4. Network tab inspection (Technique 3)
5. Live variable checks (Technique 5)

**When stuck on cache issues:**
1. Verify file is updated on disk
2. Use `.toString()` to see what browser loaded
3. Add `?v=2` to force fresh load
4. Restart server if needed
5. Clear site data as last resort

**Happy debugging!** 🐛🔍
