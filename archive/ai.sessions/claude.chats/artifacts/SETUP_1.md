# TiddlyWiki Bookmarklet - CORRECTED Setup Instructions

## 📁 **CORRECT Directory: `files/`**

TiddlyWiki **ONLY** serves files from a directory named `files/` at the root of your wiki folder!

```
~/my/files/local/lfs.10-KBs/kb.tw5/test.new.tw5/
└── files/              ← MUST be named "files"
    ├── form.html
    └── funcs.js
```

**NOT** `tools.custom/` or any other custom path!

---

## 📋 Installation Steps

### 1. Create the `files/` directory:

```bash
mkdir -p ~/my/files/local/lfs.10-KBs/kb.tw5/test.new.tw5/files
```

### 2. Download and move files:

Download the two files provided (form.html and funcs.js), then:

```bash
mv ~/Downloads/form.html ~/Downloads/funcs.js \
   ~/my/files/local/lfs.10-KBs/kb.tw5/test.new.tw5/files/
```

###3. Verify installation:

```bash
ls ~/my/files/local/lfs.10-KBs/kb.tw5/test.new.tw5/files/
# Should show: form.html  funcs.js
```

---

## 🔖 Bookmarklet Code (CORRECTED)

**Create a new bookmark with this JavaScript:**

```javascript
javascript:(function(){var e=encodeURIComponent;var t=document.title;var u=window.location.href;window.open('http://127.0.0.1:1234/files/form.html?title='+e(t)+'&url='+e(u),'TWBookmark','width=500,height=400,resizable=yes,scrollbars=yes');})();
```

**Notice:** URL is now `/files/form.html` (not `/tools.custom/...`)

### How to Add the Bookmarklet:

**Firefox:**
1. Right-click bookmarks bar → "Add Bookmark"
2. Name: `TW Quick Clip`
3. Location: Paste the JavaScript code above
4. Save

**Chrome/Edge:**
1. Right-click bookmarks bar → "Add page"
2. Name: `TW Quick Clip`
3. URL: Paste the JavaScript code above
4. Save

---

## ⚙️ Server Configuration

**Start server with `csrf-disable=yes`:**

```bash
tiddlywiki ~/my/files/local/lfs.10-KBs/kb.tw5/test.new.tw5/ \
  --listen \
  port=1234 \
  csrf-disable=yes
```

**Why these settings:**
- `port=1234` - Your existing port
- `csrf-disable=yes` - **REQUIRED** for bookmarklet to work
- Use `127.0.0.1` not `localhost` to avoid CORS issues

---

## 🧪 Testing

**Test the form directly first:**

1. Start server:
```bash
tiddlywiki ~/my/files/local/lfs.10-KBs/kb.tw5/test.new.tw5/ --listen port=1234 csrf-disable=yes
```

2. Visit in browser:
```
http://127.0.0.1:1234/files/form.html?title=Test&url=http://example.com
```

3. You should see the popup form!

**Then test the bookmarklet:**
1. Visit any web page (e.g., https://news.ycombinator.com)
2. Click your `TW Quick Clip` bookmarklet
3. Form opens → Click "Save"
4. Check http://127.0.0.1:1234 for new tiddler!

---

## ❌ Troubleshooting

### **Error: 404 Not Found when clicking bookmarklet**
- ✅ **SOLUTION:** Files MUST be in `files/` directory, not `tools.custom/`
- Verify: `ls ~/my/files/local/lfs.10-KBs/kb.tw5/test.new.tw5/files/`
- Should see: `form.html  funcs.js`

### **Popup shows but "Save" button fails:**

**Check browser console (F12) for errors:**

**Error: `xhr.status: 0`** = CORS issue
- Ensure files use `127.0.0.1:1234` not `localhost:1234` (already configured)

**Error: `403 Forbidden`** = CSRF protection enabled
- Add `csrf-disable=yes` to server command

**Error: `404 Not Found`** on API call
- Check server is running on port 1234
- Verify API endpoint: `http://127.0.0.1:1234/recipes/default/tiddlers/[title]`

---

## 📝 What Gets Created

Example tiddler file: `~/path/to/tiddlers/Example Article.tid`

```
created: 20260209001234567
modified: 20260209001234567
tags: bookmark link
title: Example Article
type: text/vnd.tiddlywiki
url: https://example.com/article

```

(Empty body by default - add content later in TiddlyWiki)

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

## 🎨 Features

- ✅ One-click capture (popup + save)
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
- TiddlyWiki static file server documentation

**References:**
- https://www.mail-archive.com/tiddlywiki@googlegroups.com/msg120463.html
- https://tiddlywiki.com/prerelease/static/Using%20the%20integrated%20static%20file%20server.html

---

## 🚀 Next Steps

Once this is working:

1. ✅ Test the bookmarklet thoroughly
2. Add bookmarklets #1 and #2 for clipboard-based workflows
3. Set up PM2 for persistent server operation
4. Configure git-crypt for encrypted backups
5. Consider authentication (after testing phase)

---

## 💡 Why `files/` Directory?

From TiddlyWiki docs:
> "Any files in the subfolder `files` of the wiki folder will be available via the route `/files/<filename>`"

This is a **built-in feature** - TiddlyWiki automatically serves this directory.

Custom directories like `tools.custom/` are **NOT** served unless you use:
- TiddlyServer (3rd party server)
- Custom web server configuration
- Path prefix configuration (complex)

For simplicity, we use the built-in `files/` directory.

---

**Ready to install and test!**