# TiddlyWiki Bookmarklet #3 - Setup Instructions

## 📁 Directory Structure

```
~/my/files/local/lfs.10-KBs/kb.tw5/test.new.tw5/
└── tools.custom/
    └── clip-to-tw5-server/
        ├── form.html    (Popup form)
        └── funcs.js     (API helper functions)
```

## 📋 Installation Steps

### 1. Create directory structure on YOUR system:

```bash
mkdir -p ~/my/files/local/lfs.10-KBs/kb.tw5/test.new.tw5/tools.custom/clip-to-tw5-server
```

### 2. Download and move files:

Download the two files provided above (form.html and funcs.js), then:

```bash
mv ~/Downloads/form.html ~/Downloads/funcs.js \
   ~/my/files/local/lfs.10-KBs/kb.tw5/test.new.tw5/tools.custom/clip-to-tw5-server/
```

### 3. Verify installation:

```bash
ls ~/my/files/local/lfs.10-KBs/kb.tw5/test.new.tw5/tools.custom/clip-to-tw5-server/
# Should show: form.html  funcs.js
```

---

## 🔖 Bookmarklet Code

**Create a new bookmark with this JavaScript:**

```javascript
javascript:(function(){var e=encodeURIComponent;var t=document.title;var u=window.location.href;window.open('http://127.0.0.1:1234/tools.custom/clip-to-tw5-server/form.html?title='+e(t)+'&url='+e(u),'TWBookmark','width=500,height=400,resizable=yes,scrollbars=yes');})();
```

### How to Add the Bookmarklet:

**Firefox:**
1. Right-click bookmarks bar → "Add Bookmark"
2. Name: `TW Quick Clip` (or whatever you want)
3. Location: Paste the JavaScript code above
4. Save

**Chrome/Edge:**
1. Right-click bookmarks bar → "Add page"
2. Name: `TW Quick Clip`
3. URL: Paste the JavaScript code above
4. Save

---

## ⚙️ Server Configuration

**CRITICAL:** Start the server with `csrf-disable=yes`:

```bash
tiddlywiki ~/my/files/local/lfs.10-KBs/kb.tw5/test.new.tw5/ \
  --listen \
  port=1234 \
  username="" \
  password="" \
  csrf-disable=yes
```

**Why these settings:**
- `port=1234` - Your existing port
- `username=""` and `password=""` - No authentication (localhost only!)
- `csrf-disable=yes` - **REQUIRED** for bookmarklet to work
- Use `127.0.0.1` not `localhost` to avoid CORS issues

---

## 🎯 Usage

1. Browse to any web page
2. Click your `TW Quick Clip` bookmarklet
3. Popup appears with pre-filled:
   - **Title** (editable)
   - **URL** (read-only)
   - **Tags** (editable, default: "bookmark link")
4. Click "Save" → New tiddler created!
5. Popup closes automatically on success

---

## 🧪 Testing

**Quick test right now:**

```bash
# 1. Start server
tiddlywiki ~/my/files/local/lfs.10-KBs/kb.tw5/test.new.tw5/ \
  --listen port=1234 csrf-disable=yes

# 2. Test the form directly in browser:
# Visit: http://127.0.0.1:1234/tools.custom/clip-to-tw5-server/form.html?title=Test&url=http://example.com

# 3. Should see the popup form!
```

**Then test the bookmarklet:**
1. Visit any web page (like https://news.ycombinator.com)
2. Click your bookmarklet
3. Form opens → Click "Save"
4. Check http://127.0.0.1:1234 for new tiddler!

---

## ❌ Troubleshooting

### Popup doesn't open:
- Check browser's popup blocker settings
- Try manually visiting: `http://127.0.0.1:1234/tools.custom/clip-to-tw5-server/form.html`
- If you get 404, verify files are in correct directory

### Form opens but "Save" button fails:
**Check browser console (F12) for errors:**

**Error: `xhr.status: 0`** = CORS issue
- Solution: Files use `127.0.0.1:1234` not `localhost:1234` (already configured)

**Error: `403 Forbidden`** = CSRF protection enabled
- Solution: Add `csrf-disable=yes` to server command

**Error: `404 Not Found`** = Wrong API endpoint
- Should be: `http://127.0.0.1:1234/recipes/default/tiddlers/[title]`
- Check port number matches your server

### Tiddler saved but overwrites existing one:
- This is expected behavior - same title = same tiddler
- Future enhancement: Add timestamp suffix for duplicates

---

## 📝 What Gets Created

Example tiddler file: `~/path/to/tiddlers/Example Article.tid`

```
created: 20260208234700123
modified: 20260208234700123
tags: bookmark link
title: Example Article
type: text/vnd.tiddlywiki
url: https://example.com/article

```

(Empty body by default - add content later in TiddlyWiki)

---

## 🎨 Features

- ✅ One-click capture (after popup)
- ✅ Editable title/tags before saving
- ✅ Auto-removes forbidden characters: `[ ] { } |`
- ✅ Proper TiddlyWiki timestamps
- ✅ Success/error feedback
- ✅ Popup auto-closes on success
- ✅ Clean, modern UI

---

## 🔒 Security Notes

**⚠️ IMPORTANT:**

`csrf-disable=yes` is **DANGEROUS** for public-facing servers!

- ✅ Safe for localhost (127.0.0.1)
- ❌ NEVER use on public servers
- ❌ NEVER expose port 1234 to internet

This is acceptable for local development only.

---

## 📚 Attribution

**Code adapted from:**
- Code snippets by 'amreus' (TiddlyWiki Google Groups, Oct 2020)
- TiddlyWiki WebServer API documentation
- Standard HTML/JavaScript patterns

**Original discussion:**
https://www.mail-archive.com/tiddlywiki@googlegroups.com/msg120463.html

---

## 🚀 Next Steps

Once this is working:

1. ✅ Test the bookmarklet thoroughly
2. Add bookmarklets #1 and #2 for clipboard-based workflows
3. Set up PM2 for persistent server operation
4. Configure git-crypt for encrypted backups
5. Consider authentication (after testing phase)

---

## 💡 Future Enhancements

Possible improvements:
- Capture selected text → add to tiddler body
- Capture page screenshot → add as image
- Duplicate detection → append timestamp
- Custom fields → add metadata
- Keyboard shortcuts → faster saving

---

**Ready to install and test!**