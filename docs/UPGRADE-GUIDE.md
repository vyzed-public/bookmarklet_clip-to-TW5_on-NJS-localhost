# Upgrading to Production Hardened Version

## Quick Start

**Replace your development files with the hardened production versions:**

```bash
# Backup current files (optional but recommended)
cp ~/my/files/local/lfs.10-KBs/kb.tw5/test.new.tw5/tools.custom/clip-to-tw5-server/funcs.js ~/my/files/local/lfs.10-KBs/kb.tw5/test.new.tw5/tools.custom/clip-to-tw5-server/funcs.js.backup
cp ~/my/files/local/lfs.10-KBs/kb.tw5/test.new.tw5/tools.custom/clip-to-tw5-server/form.html ~/my/files/local/lfs.10-KBs/kb.tw5/test.new.tw5/tools.custom/clip-to-tw5-server/form.html.backup

# Install hardened versions
cp funcs-hardened.js ~/my/files/local/lfs.10-KBs/kb.tw5/test.new.tw5/tools.custom/clip-to-tw5-server/funcs.js
cp form-hardened.html ~/my/files/local/lfs.10-KBs/kb.tw5/test.new.tw5/tools.custom/clip-to-tw5-server/form.html

# Restart TiddlyWiki server
# Press Ctrl+C to stop current server, then:
tiddlywiki ~/my/files/local/lfs.10-KBs/kb.tw5/test.new.tw5/ --listen port=1234 csrf-disable=yes
```

**That's it!** Test by clipping a page with a long title.

---

## What Changed

### Removed (Clean-up)
- ❌ Cache-busting query parameters (`?v=3`) - no longer needed for production
- ❌ Debug console.logs (kept only warnings and errors)

### Added (Hardening)
- ✅ **Cross-platform filename sanitization** - works on Windows, macOS, Linux
- ✅ **Network retry logic** - handles temporary failures (3 attempts with backoff)
- ✅ **Input validation** - prevents empty titles, shows helpful errors
- ✅ **Reserved name handling** - escapes Windows reserved names (CON, AUX, etc.)
- ✅ **Encoding warnings** - alerts user when special characters will expand filesize
- ✅ **Better error messages** - actionable guidance instead of vague errors
- ✅ **Graceful degradation** - works even if BroadcastChannel unavailable

### Improved (Quality)
- ✅ **Character counter** - shows both character count AND encoded bytes
- ✅ **URL encoding awareness** - already working, just cleaned up
- ✅ **Documentation** - comprehensive hardening guide included

---

## Verification

After upgrading, test these scenarios:

**Basic Test:**
```
1. Clip a page with a normal title → Should save successfully
2. Check TiddlyWiki → Tiddler appears in open tiddlers list
```

**Edge Case Tests:**
```
1. Try title with 500+ characters → Should truncate and save
2. Try title ":::::" (only forbidden chars) → Should show error
3. Try title "CON" → Should save as "CON_"
4. Try title with emoji "Hello 😀" → Should save correctly
```

**Error Handling:**
```
1. Stop TiddlyWiki server
2. Try to clip → Should show error after 3 retries with helpful message
3. Restart server
4. Try again → Should work
```

---

## Differences from Development Version

| Feature | Development | Production Hardened |
|---------|-------------|---------------------|
| Cache-busting | `?v=3` in script tag | Clean `<script src="funcs.js">` |
| Error handling | Basic alerts | Retry logic + detailed messages |
| Filename safety | Removed `[ ] { } \|` | Removes all cross-platform forbidden chars |
| Reserved names | Not handled | Escapes CON, AUX, NUL, COM1-9, LPT1-9 |
| Empty titles | Could save empty | Validation prevents |
| Network failures | Immediate fail | 3 retries with exponential backoff |
| Encoding warnings | None | Visual warning when encoding expands >30% |
| Character counter | Chars only | Chars + encoded bytes |
| BroadcastChannel | Required | Graceful fallback if unavailable |

---

## Troubleshooting After Upgrade

### Problem: "Title is empty after sanitization"

**Cause:** Your title contains only forbidden characters.

**Solution:** Use a different title with at least some alphanumeric characters.

**Example:**
```
Bad:  "::::::::"
Good: "Notes: Draft"
```

---

### Problem: Old behavior still happening

**Cause:** Browser cache serving old files.

**Solutions (try in order):**

1. **Hard refresh:** Ctrl+Shift+R
2. **Clear site data:** Click lock icon → Clear cookies and site data
3. **Restart server:** Ctrl+C, then restart TiddlyWiki
4. **Verify file:** 
   ```bash
   head -20 ~/my/files/local/lfs.10-KBs/kb.tw5/test.new.tw5/tools.custom/clip-to-tw5-server/funcs.js
   # Should start with: "// funcs.js - Helper functions for TiddlyWiki bookmarking (Production Hardened)"
   ```

---

### Problem: Titles still too long

**Cause:** Your base path might be very long, leaving little room for titles.

**Check current limit:**
1. Open popup (clip any page)
2. Open DevTools Console (F12)
3. Look for: `Dynamic max encoded length: XXX bytes`

**If XXX < 100:**
Your base path is too long. Options:
- Move wiki to shorter path
- Manually edit config tiddler to use shorter path
- Accept shorter title limit

---

### Problem: Windows reserved name error

**Example:** Trying to save tiddler titled "CON"

**Solution:** This is now handled automatically - "CON" becomes "CON_"

If you see this error, you're still running the old version. Verify files are updated.

---

## Rolling Back

If you need to rollback to the development version:

```bash
# Restore from backup
cp ~/my/files/local/lfs.10-KBs/kb.tw5/test.new.tw5/tools.custom/clip-to-tw5-server/funcs.js.backup ~/my/files/local/lfs.10-KBs/kb.tw5/test.new.tw5/tools.custom/clip-to-tw5-server/funcs.js
cp ~/my/files/local/lfs.10-KBs/kb.tw5/test.new.tw5/tools.custom/clip-to-tw5-server/form.html.backup ~/my/files/local/lfs.10-KBs/kb.tw5/test.new.tw5/tools.custom/clip-to-tw5-server/form.html

# Restart server
tiddlywiki ~/my/files/local/lfs.10-KBs/kb.tw5/test.new.tw5/ --listen port=1234 csrf-disable=yes

# Hard refresh browser
Ctrl+Shift+R
```

---

## FAQ

**Q: Will my existing bookmarklet still work?**
A: Yes! The bookmarklet doesn't change, only the server-side files.

**Q: Do I need to update my config tiddler?**
A: No, `$:/Config/BookmarkletBasePath` works exactly the same.

**Q: Will old tiddlers still work?**
A: Yes, all existing tiddlers are unaffected.

**Q: Can I use this on Windows/macOS now?**
A: Yes! The hardened version includes cross-platform safeguards.

**Q: What if I'm happy with the development version?**
A: You can keep using it! The hardened version just adds safety for edge cases.

**Q: Do I lose the cache-busting ability?**
A: You can still manually add `?v=X` to the script tag if needed during development.

---

## Success Indicators

You'll know the upgrade worked when:

✅ Console shows: `Dynamic max encoded length: XXX bytes`
✅ Character counter shows: `(52 chars, 156 encoded bytes)`
✅ Encoding warning appears for titles with many special chars
✅ Error messages are detailed and helpful
✅ Long titles save without ENAMETOOLONG errors
✅ Reserved names like "CON" save as "CON_"
✅ Titles with only forbidden chars show validation error

---

## Getting Help

If you encounter issues:

1. Check console (F12) for error messages
2. Verify files are actually updated (check first line)
3. Try hard refresh (Ctrl+Shift+R)
4. Restart TiddlyWiki server
5. Review HARDENING-DOCUMENTATION.md for known limitations

---

**Upgrade Date:** _____________
**Tested:** ☐ Basic save  ☐ Long title  ☐ Special chars  ☐ Error handling
**Status:** ☐ Working  ☐ Issues (describe below)

Notes:
____________________________________________________________
____________________________________________________________
____________________________________________________________
