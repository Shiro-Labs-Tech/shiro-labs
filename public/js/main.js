/* Boot. Modules register themselves in core.js, hero.js, work.js and physics.js. */
(function () {
  'use strict';
  var F = window.Folio;
  if (!F) return;
  F.boot();
  F.startTicker();
  F.ready = true;
  if (F.hasGsap && document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }
})();
