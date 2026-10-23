// Shows the guide PDF on read.html with PDF.js (assets/vendor/pdfjs, Apache 2.0).
// Pages are drawn when they scroll into view and redrawn when the width or zoom changes.
(function () {
  var root = document.querySelector('.reader');
  if (!root) return;
  var pagesEl = root.querySelector('.reader__pages');
  var status = root.querySelector('.reader__status');
  var levelEl = root.querySelector('.reader__level');
  var zoomButtons = root.querySelectorAll('[data-zoom]');
  var fallback = root.querySelector('.reader__fallback');
  var ZOOMS = [1, 1.25, 1.5, 2];
  var zoom = 0;
  var doc = null;
  var slots = [];
  var lastWidth = 0;

  function fail() {
    status.textContent = 'PDF VIEWER UNAVAILABLE';
    if (fallback) fallback.hidden = false;
  }
  if (!window.pdfjsLib) { fail(); return; }
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'assets/vendor/pdfjs/pdf.worker.min.js';

  function fitWidth() {
    return Math.min(pagesEl.clientWidth, 900);
  }

  function layout() {
    var width = Math.floor(fitWidth() * ZOOMS[zoom]);
    lastWidth = pagesEl.clientWidth;
    slots.forEach(function (s) {
      s.cssWidth = width;
      s.el.style.width = width + 'px';
      s.el.style.height = Math.round(width * s.ratio) + 'px';
      s.drawnAt = 0;
    });
    slots.forEach(function (s) { if (s.visible) draw(s); });
    levelEl.textContent = Math.round(ZOOMS[zoom] * 100) + '%';
    zoomButtons[0].disabled = zoom === 0;
    zoomButtons[1].disabled = zoom === ZOOMS.length - 1;
  }

  function draw(s) {
    if (s.drawnAt === s.cssWidth || s.busy) return;
    s.busy = true;
    var target = s.cssWidth;
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    var viewport = s.page.getViewport({ scale: (target / s.baseWidth) * dpr });
    var canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Page ' + s.number + ' of ' + slots.length);
    s.page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise.then(function () {
      var old = s.el.querySelector('canvas');
      if (old) s.el.replaceChild(canvas, old); else s.el.insertBefore(canvas, s.el.firstChild);
      s.drawnAt = target;
      s.busy = false;
      if (s.cssWidth !== target) draw(s);
    }, function () { s.busy = false; });
  }

  var observer = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var s = slots[Number(e.target.getAttribute('data-page')) - 1];
      s.visible = e.isIntersecting;
      if (s.visible) draw(s);
    });
    var top = slots.filter(function (s) { return s.visible; })[0];
    if (top) status.textContent = 'PAGE ' + top.number + ' OF ' + slots.length;
  }, { rootMargin: '400px 0px' }) : null;

  window.pdfjsLib.getDocument(root.getAttribute('data-pdf')).promise.then(function (pdf) {
    doc = pdf;
    var jobs = [];
    for (var i = 1; i <= pdf.numPages; i++) jobs.push(pdf.getPage(i));
    return Promise.all(jobs);
  }).then(function (pages) {
    pages.forEach(function (page, i) {
      var base = page.getViewport({ scale: 1 });
      var el = document.createElement('div');
      el.className = 'reader__page';
      el.setAttribute('data-page', i + 1);
      var num = document.createElement('span');
      num.className = 'reader__num';
      num.textContent = (i + 1) + ' / ' + pages.length;
      el.appendChild(num);
      pagesEl.appendChild(el);
      var slot = { page: page, el: el, number: i + 1, baseWidth: base.width, ratio: base.height / base.width, visible: !observer };
      slots.push(slot);
      if (observer) observer.observe(el);
    });
    status.textContent = 'PAGE 1 OF ' + pages.length;
    layout();
  }).catch(fail);

  zoomButtons.forEach(function (b) {
    b.addEventListener('click', function () {
      zoom = Math.max(0, Math.min(ZOOMS.length - 1, zoom + Number(b.getAttribute('data-zoom'))));
      if (doc) layout();
    });
  });

  var timer = null;
  window.addEventListener('resize', function () {
    clearTimeout(timer);
    timer = setTimeout(function () { if (doc && pagesEl.clientWidth !== lastWidth) layout(); }, 200);
  });
})();
