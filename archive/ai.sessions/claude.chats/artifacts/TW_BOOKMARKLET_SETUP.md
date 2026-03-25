# TiddlyWiki Bookmarklet #3 - Setup Complete!

## ✅ Files Installed

```
~/my/files/local/lfs.10-KBs/kb.tw5/test.new.tw5/files/
├── form.html   (Popup form)
└── funcs.js    (API helper functions)
```

## 📋 Bookmarklet Code

**Create a new bookmark with this JavaScript:**

```javascript
javascript:(function(){var e=encodeURIComponent;var t=document.title;var u=window.location.href;window.open('http://127.0.0.1:1234/files/form.html?title='+e(t)+'&url='+e(u),'TWBookmark','width=500,height=400,resizable=yes,scrollbars=yes');})();
```

## 🛠️ How to Add the Bookmarklet

### Firefox:
1. Right-click bookmarks bar → "Add Bookmark"
2. Name: `TW Quick Clip` (or whatever you want)
3. Location: Paste the JavaScript code above
4. Save

### Chrome/Edge:
1. Right-click bookmarks bar → "Add page"
2. Name: `TW Quick Clip`
3. URL: Paste the JavaScript code above
4. Save

## ⚙️ Start Server with Required Settings

**CRITICAL:** You MUST start the server with `csrf-disable=yes`:

```bash
tiddlywiki ~/my/files/local/lfs.10-KBs/kb.tw5/test.new.tw5/ \
  --listen \
  port=1234 \
  username="" \
  password="" \
  csrf-disable=yes
```

**Why 127.0.0.1 instead of localhost?**
- Avoids CORS errors
- `127.0.0.1` and `localhost` are technically different origins to browsers

## 🎯 Usage

1. Browse to any web page
2. Click your `TW Quick Clip` bookmarklet
3. Popup appears with:
   - **Title** (editable - forbidden chars auto-removed)
   - **URL** (read-only)
   - **Tags** (editable - space-separated)
4. Click "Save" → tiddler created!
5. Popup closes automatically on success

## 🔍 Testing

**Test it right now:**

1. Start server with csrf-disable=yes
2. Visit any web page (like https://news.ycombinator.com)
3. Click bookmarklet
4. Form should open
5. Click Save
6. Check http://127.0.0.1:1234 for new tiddler

## ❌ Troubleshooting

**Popup shows but "Save" fails:**
- Check browser console (F12)
- Error "xhr.status: 0" = CORS issue
  - Solution: Use `127.0.0.1:1234` not `localhost:1234` in files
- Error 403 = CSRF protection enabled
  - Solution: Add `csrf-disable=yes` to server command

**Popup doesn't open:**
- Check browser's popup blocker
- Try manually visiting: http://127.0.0.1:1234/files/form.html

**Tiddler created but overwriting existing:**
- This is current behavior
- Future: Add timestamp suffix for duplicates

## 🎨 Features

- ✅ One-click capture (after popup opens)
- ✅ Editable title/tags before saving
- ✅ Auto-removes forbidden characters: `[ ] { } |`
- ✅ Creates proper TiddlyWiki timestamps
- ✅ Success/error feedback
- ✅ Popup auto-closes on success
- ✅ Minimal, clean UI

## 📝 File Structure

**form.html** - The popup interface
- Clean, modern UI
- Pre-populated from bookmarklet
- Calls functions in funcs.js

**funcs.js** - The API logic
- `saveTiddler()` - Makes PUT request to TW server
- `formatTiddlyWikiDate()` - Generates timestamps
- `getUrlParams()` - Parses URL parameters

## 🔒 Security Note

**csrf-disable=yes is DANGEROUS for public servers!**

- Only safe for localhost
- NEVER use on public-facing servers
- Future: Implement proper CSRF tokens

## 📦 What Gets Created

Example tiddler in `~/path/to/tiddlers/Example Article.tid`:

```
created: 20260208234700123
modified: 20260208234700123
tags: bookmark link
title: Example Article
type: text/vnd.tiddlywiki
url: https://example.com/article

```

(Body is empty by default - you can add content later in TiddlyWiki)

## 🎁 Bonus Features to Add Later

1. **Capture selected text** → Add to tiddler body
2. **Capture page screenshot** → Add as image
3. **Duplicate detection** → Add timestamp suffix
4. **Custom fields** → Add any metadata
5. **Keyboard shortcuts** → Save even faster

## 🚀 Next Steps

1. Test the bookmarklet
2. If it works, add bookmarklets #1 and #2 for different workflows
3. Set up PM2 for persistent server
4. Configure git-crypt for encrypted backups
5. Consider adding authentication (but keep csrf-disable for now)

---

**Ready to test?** Let me know if you need help with anything!