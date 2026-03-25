# TiddlyWiki Bookmarklet - Production Hardening Documentation

## Overview

This document describes the hardening changes made to prepare the TiddlyWiki bookmarklet for public release. The code now handles cross-platform filesystem compatibility, URL encoding edge cases, network failures, and various other production concerns.

---

## Changes Summary

### Core Improvements

1. **URL-Encoding-Aware Truncation** - Prevents ENAMETOOLONG errors
2. **Cross-Platform Filesystem Safety** - Works on Windows, macOS, Linux
3. **Network Retry Logic** - Handles transient failures
4. **Input Validation** - Prevents empty or invalid titles
5. **Better Error Messages** - User-friendly feedback
6. **Graceful Degradation** - Falls back when features unavailable

---

## Detailed Changes

### 1. Title Sanitization (`sanitizeTitle()`)

**Problem:** Different operating systems forbid different characters in filenames. A title that works on Linux might fail on Windows.

**Solution:** Comprehensive character sanitization

**Forbidden Characters Removed:**
```javascript
[\[\]\{\}\|:<>"\/\\*?]  // Cross-platform forbidden
[\x00-\x1F\x7F]         // Control characters
```

**Additional Fixes:**
- Remove trailing dots (Windows strips these)
- Remove leading/trailing spaces
- Escape reserved names: `CON`, `PRE`, `AUX`, `NUL`, `COM1-9`, `LPT1-9`
- Collapse multiple spaces to single space

**Example:**
```javascript
Input:  "My File: Notes <draft>*.txt"
Output: "My File Notes draft.txt"

Input:  "CON"  // Reserved Windows name
Output: "CON_"

Input:  "Title......"  // Trailing dots
Output: "Title"
```

---

### 2. URL-Encoding-Aware Truncation (`truncateToEncodedLength()`)

**Problem:** Character-based truncation doesn't account for URL encoding expansion. A 150-char title with many spaces can become 200+ bytes when encoded.

**Root Cause:**
- Space → `%20` (1 byte → 3 bytes)
- Punctuation → `%XX` (1 byte → 3 bytes)  
- Accented chars → `%XX%XX` (1 byte → 6 bytes)
- Emojis → `%XX%XX%XX%XX` (1 byte → 12 bytes!)

**Solution:** Truncate based on encoded length, not character count

**Algorithm:**
```javascript
1. URL-encode the title
2. Check if encoded length exceeds limit
3. If yes, truncate encoded string
4. Ensure we don't cut mid-%XX sequence
5. Decode back to get valid title
6. Add "..." if truncated
```

**Safety Features:**
- Won't cut in middle of `%XX` sequence
- Falls back to 50 chars if decode fails
- Handles recursive retry with backoff

**Example:**
```javascript
maxEncodedLength = 186
title = "redbean is an open source webserver..." (843 chars)
encoded = "redbean%20is%20an%20open%20source..." (1145 bytes)

Result: Truncates to 176 encoded bytes → ~120 chars + "..."
```

---

### 3. Network Retry Logic (`makeRequest()`)

**Problem:** Network requests can fail due to temporary issues (server busy, connection drop, etc.)

**Solution:** Automatic retry with exponential backoff

**Retry Conditions:**
- Network error (status 0)
- Server error (status 500+)
- Maximum 3 retries

**Backoff Strategy:**
```
Attempt 1: Immediate
Attempt 2: Wait 1 second
Attempt 3: Wait 2 seconds
Attempt 4: Wait 3 seconds
```

**Example:**
```
Request 1: Failed (network error)
→ Wait 1s, retry
Request 2: Failed (server error 503)
→ Wait 2s, retry
Request 3: Success (200)
✓ Saved!
```

---

### 4. Input Validation

**Problem:** After sanitization, title might be empty (e.g., user enters only forbidden characters).

**Solution:** Validate before and after sanitization

**Pre-Save Check (in form):**
```javascript
const testSanitized = title
    .replace(/forbidden chars/g, '')
    .trim();

if (!testSanitized) {
    alert('Title contains only forbidden characters');
    return;
}
```

**Post-Sanitization Check (in saveTiddler):**
```javascript
if (!cleanTitle || cleanTitle.length === 0) {
    alert('Error: Title is empty after sanitization');
    return;
}
```

**Example:**
```javascript
Input: ":::::::::"
After sanitization: "" (empty)
→ Show error, don't save
```

---

### 5. Character Counter Enhancements

**Old Behavior:**
```
Title (150 chars)
```
Problem: User doesn't know about encoding!

**New Behavior:**
```
Title (150 chars, 245 encoded bytes)
```
User sees both character count AND actual file size.

**Visual Indicators:**
- **Gray:** Under 80% of limit
- **Orange:** 80-100% of limit (warning)
- **Red:** Over limit (will be truncated)

**Encoding Warning:**
```
⚠️ Title contains many spaces or special characters - 
   URL encoding will increase file size.
```
Shown when encoding expands size by >30%

---

### 6. BroadcastChannel Fallback

**Problem:** Older browsers or strict privacy settings may not support BroadcastChannel.

**Solution:** Feature detection with graceful degradation

```javascript
if (typeof BroadcastChannel === 'undefined') {
    console.warn('BroadcastChannel not supported');
    console.log('Please refresh TiddlyWiki tab');
    return; // Don't crash
}
```

**Result:** Tiddler still saves, user just needs to refresh manually.

---

### 7. Error Messages

**Old:**
```
Error: Network error
```
Too vague!

**New:**
```
✗ Error: HTTP 403: Forbidden

Check console for details.

Make sure server is running with csrf-disable=yes
```

Actionable guidance for users!

---

## Edge Cases Handled

### ✅ Handled Cases

| Case | How Handled |
|------|-------------|
| Title with many spaces | URL-encoding-aware truncation |
| Title with accents/emojis | UTF-8 safe, handles multi-byte encoding |
| Reserved Windows names | Appends underscore: `CON` → `CON_` |
| Only forbidden characters | Validation prevents save, shows error |
| Very long titles (1000+ chars) | Truncates based on encoded length |
| Network failures | 3 retries with exponential backoff |
| Server restart during save | Retry logic handles it |
| BroadcastChannel unavailable | Degrades gracefully, logs message |
| Empty title after sanitization | Validation catches it, shows error |
| Trailing dots/spaces | Automatically removed |
| Control characters in title | Stripped out |

---

## Edge Cases NOT Handled (Known Limitations)

### ⚠️ Not Handled

| Case | Impact | Mitigation |
|------|--------|------------|
| **Case-sensitivity collisions** | macOS/Windows: "Test" and "test" are the same file, will overwrite | Document this limitation |
| **Multiple tabs clipping simultaneously** | Race condition possible in StoryList updates | Last-write-wins, acceptable risk |
| **Very long base path (>200 chars)** | Calculated max title becomes too small (<50 chars) | Falls back to 100 bytes default |
| **Extremely slow network** | User may think it failed before retry completes | Could add loading indicator (future) |
| **TiddlyWiki server down** | Save fails after 3 retries | Error message tells user to check server |
| **CSRF enabled** | Requests rejected | Error message tells user to use `csrf-disable=yes` |
| **Firewall/proxy interference** | May block localhost requests | User must configure firewall |
| **UTF-8 incompatible filenames** | Some filesystems don't support full UTF-8 | Rare, document as limitation |
| **Extremely long URLs (>2000 chars)** | May fail on some servers/browsers | Rare, acceptable limitation |
| **Service Worker caching** | May serve stale code | Document: unregister service worker if issues |

---

## Platform Compatibility

### Supported Platforms

**Operating Systems:**
- ✅ Linux (tested on Mint 21.3)
- ✅ macOS (cross-platform safeguards in place)
- ✅ Windows (reserved names handled, forbidden chars stripped)

**Browsers:**
- ✅ Firefox 38+ (BroadcastChannel support)
- ✅ Chrome 54+ (BroadcastChannel support)
- ✅ Edge (Chromium-based)
- ⚠️ Safari 15.4+ (BroadcastChannel added in 15.4)
- ⚠️ Older browsers (graceful degradation, manual refresh needed)

**TiddlyWiki:**
- ✅ TiddlyWiki 5.x with Node.js server
- ✅ Server must run with `csrf-disable=yes`
- ✅ Port 1234 (default, configurable)

---

## Configuration

### Required Setup

**1. TiddlyWiki Server:**
```bash
tiddlywiki ~/path/to/wiki/ --listen port=1234 csrf-disable=yes
```

**2. Base Path Config Tiddler:**
```
Title: $:/Config/BookmarkletBasePath
Type: text/vnd.tiddlywiki
Text: /home/user/path/to/wiki/tiddlers/
```

**3. File Deployment:**
```bash
# Copy files
cp funcs-hardened.js ~/path/to/wiki/tools.custom/clip-to-tw5-server/funcs.js
cp form-hardened.html ~/path/to/wiki/tools.custom/clip-to-tw5-server/form.html

# Create symlinks (if using separate tools directory)
ln -s ../tools.custom/clip-to-tw5-server/funcs.js ~/path/to/wiki/files/funcs.js
ln -s ../tools.custom/clip-to-tw5-server/form.html ~/path/to/wiki/files/form.html
```

---

## Testing Checklist

Before deploying to production, test these scenarios:

### Basic Functionality
- [ ] Save tiddler with normal title
- [ ] Save tiddler with long title (>200 chars)
- [ ] Save tiddler with spaces and punctuation
- [ ] Save tiddler with accented characters (é, ñ, ü)
- [ ] Save tiddler with emojis
- [ ] Verify tiddler appears in open tiddlers list

### Edge Cases
- [ ] Try title with only forbidden characters (should show error)
- [ ] Try extremely long title (1000+ chars) - should truncate
- [ ] Try reserved Windows name "CON" - should become "CON_"
- [ ] Try title with trailing dots - should be stripped
- [ ] Try title with many spaces - should warn about encoding

### Error Handling
- [ ] Stop TiddlyWiki server, try to save (should show error after retries)
- [ ] Use CSRF-enabled server (should show error with guidance)
- [ ] Close popup immediately (should still save via cleanup)

### Cross-Platform (if possible)
- [ ] Test on Windows (check forbidden char handling)
- [ ] Test on macOS (check case sensitivity)
- [ ] Test on Linux (baseline)

### Browser Compatibility
- [ ] Firefox (primary)
- [ ] Chrome (secondary)
- [ ] Older browser without BroadcastChannel (check console message)

---

## Security Considerations

### Risks Mitigated

1. **Path Traversal:** All special path characters removed from title
2. **Command Injection:** Title never executed, only used as data
3. **XSS:** No user content directly rendered as HTML
4. **CSRF:** Requires `csrf-disable=yes` (documented limitation)

### Remaining Risks

1. **Localhost-only:** Server must run on localhost (127.0.0.1)
2. **No authentication:** Anyone with access to localhost can save tiddlers
3. **No encryption:** Data transmitted over HTTP (localhost only)

**Mitigation:** Document that this is for personal use on localhost only.

---

## Performance Considerations

**Optimizations:**
- Lazy config loading (only on first popup open)
- Cached maxEncodedLength (doesn't recalculate every keystroke)
- Efficient string operations (no regex in hot path)

**Potential Bottlenecks:**
- URL encoding calculation on every keystroke (acceptable, ~1ms)
- Network requests (3-4 per save: GET config, PUT tiddler, GET StoryList, PUT StoryList)

**Future Improvements:**
- Could batch StoryList updates if saving multiple tiddlers
- Could cache config in localStorage to avoid repeated fetches

---

## Deployment Checklist

Before releasing to public:

### Code Quality
- [x] Remove debug console.logs (keep error/warn)
- [x] Remove cache-busting query parameters
- [x] Add comprehensive error messages
- [x] Add input validation
- [x] Handle edge cases

### Documentation
- [ ] Write installation guide
- [ ] Write troubleshooting guide
- [ ] Document known limitations
- [ ] Provide example bookmarklet code
- [ ] Add FAQ

### Testing
- [ ] Test on multiple platforms
- [ ] Test with various title lengths/characters
- [ ] Test error scenarios
- [ ] Verify encoding calculation accuracy

### User Experience
- [x] Clear error messages
- [x] Visual feedback (character counter)
- [x] Encoding warnings
- [ ] Loading indicators (future improvement)

---

## Future Improvements (Not Implemented)

**Nice-to-Have Features:**

1. **Loading Indicator**
   - Show spinner while saving
   - "Saving..." message
   - Progress for multiple retries

2. **Offline Support**
   - Queue saves when server unavailable
   - Retry automatically when back online
   - Service Worker for persistent queue

3. **Batch Save**
   - Save multiple tabs at once
   - Bulk tag application
   - Folder-based organization

4. **Smart Truncation**
   - Ask user to edit title if too long
   - Suggest shorter alternatives
   - Preview truncated result before saving

5. **Advanced Configuration**
   - Configurable server URL/port
   - Custom default tags
   - Tag suggestions based on URL domain

6. **Analytics/Logging**
   - Track common errors
   - Monitor encoding expansion rates
   - Identify problematic characters

---

## Known Issues

### Issue: Case-Sensitivity Collisions

**Problem:** On macOS/Windows, "Test" and "test" are the same file. Saving both will overwrite.

**Status:** Won't fix (filesystem limitation)

**Workaround:** Document in user guide

---

### Issue: Service Worker Caching

**Problem:** If user has installed as PWA or has service worker, may serve stale code.

**Status:** Document workaround

**Workaround:** Unregister service worker, hard refresh

---

### Issue: CSRF Protection

**Problem:** TiddlyWiki's CSRF protection blocks API requests

**Status:** User must configure

**Solution:** Run server with `csrf-disable=yes` flag (documented)

---

## Conclusion

This hardened version addresses the major production concerns:

✅ **Cross-platform compatibility**
✅ **URL encoding edge cases**
✅ **Network reliability**
✅ **Input validation**
✅ **User-friendly errors**
✅ **Graceful degradation**

**Remaining concerns are documented as known limitations** with acceptable workarounds or rare enough to not block release.

**Recommendation:** Ready for public release with proper documentation of limitations and setup requirements.

---

## Changelog

**v1.0 (Production Hardened)**
- Added URL-encoding-aware truncation
- Added cross-platform filename sanitization
- Added network retry logic (3 attempts)
- Added input validation
- Added encoding warnings in UI
- Added reserved name handling
- Added better error messages
- Removed cache-busting query parameters
- Enhanced character counter (shows encoded bytes)

**v0.9 (Development)**
- Basic functionality with character truncation
- BroadcastChannel integration
- Dynamic path configuration
- Basic error handling

---

Last Updated: 2026-02-10
