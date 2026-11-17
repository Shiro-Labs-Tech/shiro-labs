/* Language preference. Loaded in <head> so it runs before first paint.
   - Each page is generated in English (/) and Bahasa Indonesia (/id), linked by hreflang alternates.
   - The EN/ID toggle in the nav is a plain link to the same page in the other language. Using it
     saves the choice in this browser.
   - A saved choice sends the visitor to that language's version of any page they open later.
     Nothing is guessed from the browser language, and a first visit is never redirected. */
(function () {
  'use strict';
  var KEY = 'shiro-lang', here = (document.documentElement.lang || 'en').slice(0, 2), saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}

  if ((saved === 'en' || saved === 'id') && saved !== here) {
    var alt = document.querySelector('link[rel="alternate"][hreflang="' + saved + '"]');
    if (alt) {
      try {
        var u = new URL(alt.getAttribute('href'), location.href);
        location.replace(u.pathname + location.search + location.hash);
      } catch (e) {}
    }
  }

  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[data-lang]') : null;
    if (!a) return;
    try { localStorage.setItem(KEY, a.getAttribute('data-lang')); } catch (err) {}
    if (location.hash) a.hash = location.hash; /* keep the section the visitor was reading */
  }, true);
})();
