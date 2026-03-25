// Updated bookmarklet code with text selection support

// Minified version (use this in your bookmark):
javascript:(function(){var e=encodeURIComponent;var s=window.getSelection().toString().trim();var t=s||document.title;var tabTitle=document.title;var u=window.location.href;window.open('http://127.0.0.1:1234/files/form.html?title='+e(t)+'&tabTitle='+e(tabTitle)+'&url='+e(u),'TWBookmark','width=500,height=400,resizable=yes,scrollbars=yes');})();


// Readable version (for reference):
(function() {
    var e = encodeURIComponent;
    var s = window.getSelection().toString().trim();  // Get selected text
    var t = s || document.title;                      // Use selection or page title
    var tabTitle = document.title;                    // Always capture tab title
    var u = window.location.href;
    
    window.open(
        'http://127.0.0.1:1234/files/form.html?title=' + e(t) + '&tabTitle=' + e(tabTitle) + '&url=' + e(u),
        'TWBookmark',
        'width=500,height=400,resizable=yes,scrollbars=yes'
    );
})();