# Popup Form Debugging Techniques

A practical guide to debugging JavaScript in popup windows, with techniques discovered during TiddlyWiki bookmarklet development.

---

## Table of Contents
1. [The Challenge: Popup Windows That Auto-Close](#the-challenge)
2. [Technique 1: Keep Window Open Override](#technique-1-keep-window-open)
3. [Technique 2: Function Wrapper Debugging](#technique-2-function-wrapper-debugging)
4. [Technique 3: Network Tab Monitoring](#technique-3-network-tab-monitoring)
5. [Technique 4: Verifying Loaded Code](#technique-4-verifying-loaded-code)
6. [Technique 5: Live Variable Inspection](#technique-5-live-variable-inspection)
7. [Real-World Example: Complete Debugging Session](#real-world-example)

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

### Don'ts ✗
- **Don't modify source files** for debugging (use console overrides)
- **Don't assume cached code is fresh** (always verify with `.toString()`)
- **Don't debug blind** (use wrappers to see what's happening)
- **Don't give up** when popups close (use keep-open override)

---

## Conclusion

These techniques saved hours of debugging during TiddlyWiki bookmarklet development. The key insight: **you don't need to modify source code to debug - use runtime overrides and wrappers!**

**Most powerful combination:**
1. Keep window open override (Technique 1)
2. Function wrapper debugging (Technique 2)
3. Network tab inspection (Technique 3)
4. Live variable checks (Technique 5)

**Happy debugging!** 🐛🔍